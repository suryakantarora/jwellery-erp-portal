import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import { Product } from '../../../core/models/catalogue.model';
import {
  GOODS_RECEIPT_STATUSES,
  GoodsReceipt,
  GoodsReceiptRequest,
  GoodsReceiptStatus,
  PurchaseOrder,
  PurchaseOrderLine,
  Supplier,
  acceptsReceipt,
} from '../../../core/models/procurement.model';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
  toSortParam,
} from '../../../shared/components/data-table/data-table.model';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../../shared/components/master-panel/master-panel.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { touchAll } from '../../../shared/utilities/form.utils';
import { CatalogueService } from '../../products/catalogue.service';
import { ProcurementService } from '../procurement.service';

/** One physical piece being received against an order line. */
interface ReceiptLine {
  readonly key: number;
  readonly orderLine: PurchaseOrderLine;
  grossWeight: FormControl<number | null>;
  stoneWeight: FormControl<number | null>;
  purchaseCost: FormControl<number | null>;
  makingCost: FormControl<number | null>;
  stoneCost: FormControl<number | null>;
  hallmarkNumber: FormControl<string>;
  barcode: FormControl<string>;
  rfidTag: FormControl<string>;
  notes: FormControl<string>;
}

/**
 * Goods receipts.
 *
 * Jewellery is serialized, so a receipt is not "12 of SKU X" — it is twelve
 * individually weighed and tagged pieces. Each line here becomes one jewellery
 * item, and accepting the receipt at quality check is the moment those items are
 * created and enter stock.
 */
@Component({
  selector: 'app-receipts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MasterPanelComponent,
    DrawerComponent,
    FormFieldComponent,
    SpinnerComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './receipts.component.html',
  styleUrl: './receipts.component.scss',
})
export class ReceiptsComponent {
  private readonly procurement = inject(ProcurementService);
  private readonly catalogue = inject(CatalogueService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canReceive = computed(() =>
    this.auth.hasPermission(Permission.PROCUREMENT_RECEIVE),
  );
  protected readonly statuses = GOODS_RECEIPT_STATUSES;

  protected readonly suppliers = signal<readonly Supplier[]>([]);
  protected readonly products = signal<readonly Product[]>([]);
  /** Orders still open for receipt. */
  protected readonly receivableOrders = signal<readonly PurchaseOrder[]>([]);
  protected readonly chosenOrder = signal<PurchaseOrder | null>(null);

  protected readonly result = signal<PageResponse<GoodsReceipt>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly statusFilter = signal<GoodsReceiptStatus | ''>('');
  protected readonly sort = signal<TableSort | null>({ field: 'receiptDate', direction: 'desc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly viewing = signal<GoodsReceipt | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly refTpl =
    viewChild.required<TemplateRef<CellTemplateContext<GoodsReceipt>>>('refCell');
  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<GoodsReceipt>>>('statusCell');
  private readonly actionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<GoodsReceipt>>>('actionsCell');
  protected readonly templates = computed(() => ({
    receiptNumber: this.refTpl(),
    status: this.statusTpl(),
    actions: this.actionsTpl(),
  }));

  protected readonly form = this.fb.nonNullable.group({
    purchaseOrderId: ['', [Validators.required]],
    receiptDate: [new Date().toISOString().slice(0, 10)],
    supplierDeliveryNote: ['', [Validators.maxLength(100)]],
    notes: ['', [Validators.maxLength(500)]],
  });

  private nextKey = 0;
  protected readonly lines = signal<readonly ReceiptLine[]>([]);

  protected readonly columns: readonly TableColumn<GoodsReceipt>[] = [
    { key: 'receiptNumber', header: 'Receipt', width: '210px' },
    { key: 'supplierId', header: 'Supplier', value: (row) => this.supplierName(row.supplierId) },
    {
      key: 'receiptDate',
      header: 'Received',
      mono: true,
      width: '140px',
      value: (row) => row.receiptDate,
    },
    {
      key: 'lines',
      header: 'Pieces',
      numeric: true,
      align: 'end',
      width: '100px',
      value: (row) => row.lines.length,
    },
    {
      key: 'supplierDeliveryNote',
      header: 'Delivery note',
      mono: true,
      hideOnMobile: true,
      value: (row) => row.supplierDeliveryNote,
    },
    { key: 'status', header: 'Status', width: '190px' },
    { key: 'actions', header: '', width: '210px', align: 'end' },
  ];

  protected readonly trackById = (row: { id: string }) => row.id;
  protected readonly trackLine = (line: ReceiptLine) => line.key;

  constructor() {
    this.procurement.listAllSuppliers().subscribe({ next: (r) => this.suppliers.set(r) });
    this.catalogue
      .searchProducts({ size: 200, sort: 'sku,asc' })
      .subscribe({ next: (page) => this.products.set(page.content) });
    this.load();
  }

  protected supplierName(id: string): string {
    return this.suppliers().find((supplier) => supplier.id === id)?.name ?? '—';
  }

  protected productName(id: string): string {
    const product = this.products().find((entry) => entry.id === id);
    return product ? `${product.sku} · ${product.name}` : '—';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.procurement
      .searchReceipts({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        status: this.statusFilter() || null,
      })
      .subscribe({
        next: (page) => {
          this.result.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.result.set(emptyPage(this.size()));
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  protected onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as GoodsReceiptStatus | '');
    this.page.set(0);
    this.load();
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
    this.load();
  }

  protected onPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
    this.load();
  }

  // ---------- receiving ----------

  protected startCreate(): void {
    this.form.reset({ receiptDate: new Date().toISOString().slice(0, 10), purchaseOrderId: '' });
    this.lines.set([]);
    this.chosenOrder.set(null);
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);

    // Only orders that can still take stock are worth offering.
    this.procurement.searchOrders({ size: 100, sort: 'orderDate,desc' }).subscribe({
      next: (page) =>
        this.receivableOrders.set(page.content.filter((order) => acceptsReceipt(order.status))),
      error: () => this.receivableOrders.set([]),
    });
  }

  /** Choosing an order lays out one receipt line per outstanding piece. */
  protected onOrderChange(event: Event): void {
    const orderId = (event.target as HTMLSelectElement).value;
    const order = this.receivableOrders().find((entry) => entry.id === orderId) ?? null;
    this.chosenOrder.set(order);
    this.lines.set([]);

    if (!order) {
      return;
    }
    for (const orderLine of order.lines) {
      for (let index = 0; index < orderLine.outstandingQuantity; index++) {
        this.addLine(orderLine);
      }
    }
  }

  protected addLine(orderLine: PurchaseOrderLine): void {
    const estimatedCost = (orderLine.estimatedWeight ?? 0) * (orderLine.ratePerGram ?? 0) || null;

    this.lines.update((current) => [
      ...current,
      {
        key: this.nextKey++,
        orderLine,
        grossWeight: this.fb.control<number | null>(orderLine.estimatedWeight ?? null, [
          Validators.required,
          Validators.min(0.0001),
        ]),
        stoneWeight: this.fb.control<number | null>(null),
        purchaseCost: this.fb.control<number | null>(estimatedCost),
        makingCost: this.fb.control<number | null>(orderLine.makingChargePerUnit ?? null),
        stoneCost: this.fb.control<number | null>(null),
        hallmarkNumber: this.fb.nonNullable.control(''),
        barcode: this.fb.nonNullable.control(''),
        rfidTag: this.fb.nonNullable.control(''),
        notes: this.fb.nonNullable.control(''),
      },
    ]);
  }

  protected removeLine(key: number): void {
    this.lines.update((current) => current.filter((line) => line.key !== key));
  }

  protected close(): void {
    this.creating.set(false);
    this.viewing.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }
    const drafted = this.lines();
    if (drafted.length === 0) {
      this.formError.set('Add at least one received piece.');
      return;
    }
    if (drafted.some((line) => !line.grossWeight.value)) {
      this.formError.set('Every piece must be weighed.');
      return;
    }

    const value = this.form.getRawValue();
    const request: GoodsReceiptRequest = {
      purchaseOrderId: value.purchaseOrderId,
      receiptDate: value.receiptDate || null,
      supplierDeliveryNote: value.supplierDeliveryNote || null,
      notes: value.notes || null,
      lines: drafted.map((line) => ({
        purchaseOrderLineId: line.orderLine.id,
        grossWeight: line.grossWeight.value as number,
        stoneWeight: line.stoneWeight.value,
        purchaseCost: line.purchaseCost.value,
        makingCost: line.makingCost.value,
        stoneCost: line.stoneCost.value,
        hallmarkNumber: line.hallmarkNumber.value || null,
        barcode: line.barcode.value || null,
        rfidTag: line.rfidTag.value || null,
        notes: line.notes.value || null,
      })),
    };

    this.saving.set(true);
    this.procurement.createReceipt(request).subscribe({
      next: (receipt) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success(
          'Goods receipt raised',
          `${receipt.receiptNumber} — awaiting quality check`,
        );
        this.page.set(0);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected view(receipt: GoodsReceipt): void {
    this.viewing.set(receipt);
  }

  protected async accept(receipt: GoodsReceipt): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Accept at quality check',
      message:
        'Each received line becomes a serialized jewellery item and enters stock at the delivery location.',
      detail: `${receipt.receiptNumber} — ${receipt.lines.length} piece(s)`,
      confirmLabel: 'Accept',
    });
    if (!confirmed) {
      return;
    }
    this.run(this.procurement.acceptReceipt(receipt.id), 'Receipt accepted', receipt.receiptNumber);
  }

  protected async reject(receipt: GoodsReceipt): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Reject at quality check',
      message: 'Nothing enters stock and the order stays open for a fresh delivery.',
      detail: receipt.receiptNumber,
      confirmLabel: 'Reject',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.run(
      this.procurement.rejectReceipt(receipt.id, 'Failed quality check'),
      'Receipt rejected',
      receipt.receiptNumber,
    );
  }

  protected openItem(itemId: string): void {
    void this.router.navigate(['/inventory/items', itemId]);
  }

  private run(
    call: import('rxjs').Observable<GoodsReceipt>,
    successTitle: string,
    reference: string,
  ): void {
    this.saving.set(true);
    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.close();
        this.toast.success(successTitle, reference);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.toast.error('The step could not be completed', error.message);
      },
    });
  }
}
