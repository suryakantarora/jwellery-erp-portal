import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import { Product } from '../../../core/models/catalogue.model';
import { Metal } from '../../../core/models/metal.model';
import { Branch, Location } from '../../../core/models/organization.model';
import {
  PURCHASE_ORDER_STATUSES,
  PurchaseOrder,
  PurchaseOrderRequest,
  PurchaseOrderStatus,
  REQUISITION_STATUSES,
  Requisition,
  RequisitionRequest,
  RequisitionStatus,
  Supplier,
} from '../../../core/models/procurement.model';
import { BranchContextService } from '../../../core/services/branch-context.service';
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
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { touchAll } from '../../../shared/utilities/form.utils';
import { CatalogueService } from '../../products/catalogue.service';
import { MetalService } from '../../products/metal.service';
import { OrganizationService } from '../../organization/organization.service';
import { ProcurementService } from '../procurement.service';

type Tab = 'orders' | 'requisitions';

/** One editable line in the requisition or order being drafted. */
interface DraftLine {
  readonly key: number;
  productId: FormControl<string>;
  quantity: FormControl<number | null>;
  estimatedWeight: FormControl<number | null>;
  ratePerGram: FormControl<number | null>;
  makingChargePerUnit: FormControl<number | null>;
  notes: FormControl<string>;
}

/**
 * Purchase requisitions and the orders they become.
 *
 * A requisition is a branch asking for stock; an order is a commitment to a
 * supplier. Keeping both on one screen makes the hand-off visible — an approved
 * requisition is what an order is usually raised from.
 */
@Component({
  selector: 'app-orders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    NgTemplateOutlet,
    PageHeaderComponent,
    MasterPanelComponent,
    DrawerComponent,
    FormFieldComponent,
    SpinnerComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class OrdersComponent {
  private readonly procurement = inject(ProcurementService);
  private readonly catalogue = inject(CatalogueService);
  private readonly metalApi = inject(MetalService);
  private readonly organization = inject(OrganizationService);
  private readonly branchContext = inject(BranchContextService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canCreate = computed(() =>
    this.auth.hasPermission(Permission.PROCUREMENT_CREATE),
  );
  protected readonly canApprove = computed(() =>
    this.auth.hasPermission(Permission.PROCUREMENT_APPROVE),
  );

  protected readonly orderStatuses = PURCHASE_ORDER_STATUSES;
  protected readonly requisitionStatuses = REQUISITION_STATUSES;

  protected readonly tab = signal<Tab>('orders');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'orders', label: 'Purchase orders' },
    { id: 'requisitions', label: 'Requisitions' },
  ];

  protected readonly suppliers = signal<readonly Supplier[]>([]);
  protected readonly products = signal<readonly Product[]>([]);
  protected readonly metals = signal<readonly Metal[]>([]);
  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly locations = signal<readonly Location[]>([]);

  protected readonly orders = signal<PageResponse<PurchaseOrder>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly requisitions = signal<PageResponse<Requisition>>(
    emptyPage(environment.defaultPageSize),
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly statusFilter = signal('');
  protected readonly supplierFilter = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'orderDate', direction: 'desc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly viewingOrder = signal<PurchaseOrder | null>(null);
  protected readonly viewingRequisition = signal<Requisition | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly orderRefTpl =
    viewChild.required<TemplateRef<CellTemplateContext<PurchaseOrder>>>('orderRefCell');
  private readonly orderStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<PurchaseOrder>>>('orderStatusCell');
  private readonly orderProgressTpl =
    viewChild.required<TemplateRef<CellTemplateContext<PurchaseOrder>>>('orderProgressCell');
  private readonly orderActionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<PurchaseOrder>>>('orderActionsCell');
  private readonly reqRefTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Requisition>>>('reqRefCell');
  private readonly reqStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Requisition>>>('reqStatusCell');
  private readonly reqActionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Requisition>>>('reqActionsCell');

  protected readonly orderTemplates = computed(() => ({
    orderNumber: this.orderRefTpl(),
    status: this.orderStatusTpl(),
    lines: this.orderProgressTpl(),
    actions: this.orderActionsTpl(),
  }));

  protected readonly requisitionTemplates = computed(() => ({
    referenceNumber: this.reqRefTpl(),
    status: this.reqStatusTpl(),
    actions: this.reqActionsTpl(),
  }));

  protected readonly orderForm = this.fb.nonNullable.group({
    supplierId: ['', [Validators.required]],
    branchId: ['', [Validators.required]],
    deliveryLocationId: ['', [Validators.required]],
    expectedDeliveryDate: [''],
    currency: ['INR', [Validators.minLength(3), Validators.maxLength(3)]],
    notes: [''],
  });

  protected readonly requisitionForm = this.fb.nonNullable.group({
    branchId: ['', [Validators.required]],
    requiredBy: [''],
    justification: ['', [Validators.maxLength(500)]],
  });

  private nextLineKey = 0;
  protected readonly lines = signal<readonly DraftLine[]>([]);

  /**
   * Running total of the drafted order, so the buyer sees the commitment.
   *
   * A method rather than a computed: the values live in FormControls, which are
   * not signals, so a computed would never see an edit and would sit at zero.
   */
  protected draftTotal(): number {
    return this.lines().reduce((sum, line) => {
      const weight = line.estimatedWeight.value ?? 0;
      const rate = line.ratePerGram.value ?? 0;
      const making = line.makingChargePerUnit.value ?? 0;
      const quantity = line.quantity.value ?? 0;
      return sum + weight * rate + making * quantity;
    }, 0);
  }

  protected readonly orderColumns: readonly TableColumn<PurchaseOrder>[] = [
    { key: 'orderNumber', header: 'Order', width: '200px' },
    { key: 'supplierId', header: 'Supplier', value: (row) => this.supplierName(row.supplierId) },
    {
      key: 'orderDate',
      header: 'Raised',
      mono: true,
      width: '130px',
      value: (row) => row.orderDate,
    },
    {
      key: 'expectedDeliveryDate',
      header: 'Expected',
      mono: true,
      hideOnMobile: true,
      width: '130px',
      value: (row) => row.expectedDeliveryDate,
    },
    { key: 'lines', header: 'Received', width: '150px' },
    {
      key: 'estimatedTotal',
      header: 'Value',
      numeric: true,
      align: 'end',
      width: '140px',
      value: (row) => row.estimatedTotal,
    },
    { key: 'status', header: 'Status', width: '160px' },
    { key: 'actions', header: '', width: '190px', align: 'end' },
  ];

  protected readonly requisitionColumns: readonly TableColumn<Requisition>[] = [
    { key: 'referenceNumber', header: 'Reference', width: '210px' },
    { key: 'branchId', header: 'Branch', value: (row) => this.branchName(row.branchId) },
    {
      key: 'requiredBy',
      header: 'Required by',
      mono: true,
      width: '140px',
      value: (row) => row.requiredBy,
    },
    {
      key: 'lines',
      header: 'Lines',
      numeric: true,
      align: 'end',
      width: '90px',
      value: (row) => row.lines.length,
    },
    {
      key: 'justification',
      header: 'Reason',
      hideOnMobile: true,
      value: (row) => row.justification,
    },
    { key: 'status', header: 'Status', width: '160px' },
    { key: 'actions', header: '', width: '190px', align: 'end' },
  ];

  protected readonly trackById = (row: { id: string }) => row.id;
  protected readonly trackLine = (line: DraftLine) => line.key;

  constructor() {
    this.procurement.listAllSuppliers().subscribe({ next: (r) => this.suppliers.set(r) });
    this.catalogue
      .searchProducts({ size: 200, sort: 'sku,asc' })
      .subscribe({ next: (page) => this.products.set(page.content) });
    this.metalApi.listMetals().subscribe({ next: (r) => this.metals.set(r) });
    this.organization.listAllBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loadLocations(branches);
      },
    });
    this.load();
  }

  private loadLocations(branches: readonly Branch[]): void {
    const collected: Location[] = [];
    let outstanding = branches.length;
    if (outstanding === 0) {
      return;
    }
    for (const branch of branches) {
      this.organization.listLocations(branch.id).subscribe({
        next: (locations) => collected.push(...locations),
        error: () => undefined,
        complete: () => {
          outstanding -= 1;
          if (outstanding === 0) {
            this.locations.set(collected);
          }
        },
      });
    }
  }

  protected supplierName(id: string): string {
    return this.suppliers().find((supplier) => supplier.id === id)?.name ?? '—';
  }

  protected branchName(id: string): string {
    return this.branches().find((branch) => branch.id === id)?.name ?? '—';
  }

  protected productName(id: string): string {
    const product = this.products().find((entry) => entry.id === id);
    return product ? `${product.sku} · ${product.name}` : '—';
  }

  protected receivedCount(order: PurchaseOrder): { received: number; ordered: number } {
    return order.lines.reduce(
      (totals, line) => ({
        received: totals.received + line.receivedQuantity,
        ordered: totals.ordered + line.orderedQuantity,
      }),
      { received: 0, ordered: 0 },
    );
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    if (this.tab() === 'orders') {
      this.procurement
        .searchOrders({
          page: this.page(),
          size: this.size(),
          sort: toSortParam(this.sort()),
          status: (this.statusFilter() as PurchaseOrderStatus) || null,
          supplierId: this.supplierFilter() || null,
        })
        .subscribe({
          next: (page) => {
            this.orders.set(page);
            this.loading.set(false);
          },
          error: (error: AppError) => {
            this.orders.set(emptyPage(this.size()));
            this.error.set(error);
            this.loading.set(false);
          },
        });
      return;
    }

    this.procurement
      .searchRequisitions({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        status: (this.statusFilter() as RequisitionStatus) || null,
      })
      .subscribe({
        next: (page) => {
          this.requisitions.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.requisitions.set(emptyPage(this.size()));
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.statusFilter.set('');
    this.supplierFilter.set('');
    this.page.set(0);
    this.sort.set(
      tab === 'orders'
        ? { field: 'orderDate', direction: 'desc' }
        : { field: 'createdAt', direction: 'desc' },
    );
    this.load();
  }

  protected onFilter(which: 'status' | 'supplier', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (which === 'status') {
      this.statusFilter.set(value);
    } else {
      this.supplierFilter.set(value);
    }
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.statusFilter.set('');
    this.supplierFilter.set('');
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

  // ---------- drafting ----------

  protected startCreate(): void {
    const branchId = this.branchContext.activeBranchId() ?? this.branches()[0]?.id ?? '';
    this.orderForm.reset({ branchId, currency: 'INR', supplierId: '', deliveryLocationId: '' });
    this.requisitionForm.reset({ branchId });
    this.lines.set([]);
    this.addLine();
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  protected addLine(): void {
    this.lines.update((current) => [
      ...current,
      {
        key: this.nextLineKey++,
        productId: this.fb.nonNullable.control('', [Validators.required]),
        quantity: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
        estimatedWeight: this.fb.control<number | null>(null),
        ratePerGram: this.fb.control<number | null>(null),
        makingChargePerUnit: this.fb.control<number | null>(null),
        notes: this.fb.nonNullable.control(''),
      },
    ]);
  }

  protected removeLine(key: number): void {
    this.lines.update((current) => current.filter((line) => line.key !== key));
  }

  /** Picking a product fills the line's weight and making charge from its defaults. */
  protected onLineProduct(line: DraftLine): void {
    const product = this.products().find((entry) => entry.id === line.productId.value);
    if (!product) {
      return;
    }
    if (product.nominalGrossWeight !== null && product.nominalGrossWeight !== undefined) {
      line.estimatedWeight.setValue(product.nominalGrossWeight);
    }
    if (
      product.defaultMakingChargeType === 'PER_GRAM' &&
      product.defaultMakingChargeValue !== null &&
      product.defaultMakingChargeValue !== undefined &&
      product.nominalGrossWeight
    ) {
      line.makingChargePerUnit.setValue(
        Number((product.defaultMakingChargeValue * product.nominalGrossWeight).toFixed(2)),
      );
    }
  }

  protected close(): void {
    this.creating.set(false);
    this.viewingOrder.set(null);
    this.viewingRequisition.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    const drafted = this.lines();
    if (drafted.length === 0) {
      this.formError.set('Add at least one line.');
      return;
    }
    if (drafted.some((line) => !line.productId.value || !line.quantity.value)) {
      this.formError.set('Every line needs a product and a quantity.');
      return;
    }

    if (this.tab() === 'orders') {
      if (this.orderForm.invalid) {
        touchAll(this.orderForm);
        return;
      }
      const value = this.orderForm.getRawValue();
      const request: PurchaseOrderRequest = {
        supplierId: value.supplierId,
        branchId: value.branchId,
        deliveryLocationId: value.deliveryLocationId,
        requisitionId: null,
        expectedDeliveryDate: value.expectedDeliveryDate || null,
        currency: value.currency || null,
        notes: value.notes || null,
        lines: drafted.map((line) => ({
          productId: line.productId.value,
          metalId: null,
          purityId: null,
          orderedQuantity: line.quantity.value ?? 1,
          estimatedWeight: line.estimatedWeight.value,
          ratePerGram: line.ratePerGram.value,
          makingChargePerUnit: line.makingChargePerUnit.value,
          notes: line.notes.value || null,
        })),
      };

      this.saving.set(true);
      this.procurement.createOrder(request).subscribe({
        next: (order) => {
          this.saving.set(false);
          this.creating.set(false);
          this.toast.success('Purchase order raised', order.orderNumber);
          this.page.set(0);
          this.load();
        },
        error: (error: AppError) => {
          this.saving.set(false);
          this.formError.set(error.message);
        },
      });
      return;
    }

    if (this.requisitionForm.invalid) {
      touchAll(this.requisitionForm);
      return;
    }
    const value = this.requisitionForm.getRawValue();
    const request: RequisitionRequest = {
      branchId: value.branchId,
      requiredBy: value.requiredBy || null,
      justification: value.justification || null,
      lines: drafted.map((line) => ({
        productId: line.productId.value,
        quantity: line.quantity.value ?? 1,
        estimatedWeight: line.estimatedWeight.value,
        notes: line.notes.value || null,
      })),
    };

    this.saving.set(true);
    this.procurement.createRequisition(request).subscribe({
      next: (requisition) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success('Requisition raised', requisition.referenceNumber);
        this.page.set(0);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  // ---------- workflow ----------

  protected viewOrder(order: PurchaseOrder): void {
    this.viewingOrder.set(order);
  }

  protected viewRequisition(requisition: Requisition): void {
    this.viewingRequisition.set(requisition);
  }

  protected approveOrder(order: PurchaseOrder): void {
    this.run(this.procurement.approveOrder(order.id), 'Order approved', order.orderNumber);
  }

  protected async rejectOrder(order: PurchaseOrder): Promise<void> {
    if (!(await this.askReject('order', order.orderNumber))) {
      return;
    }
    this.run(
      this.procurement.rejectOrder(order.id, 'Rejected by approver'),
      'Order rejected',
      order.orderNumber,
    );
  }

  protected async cancelOrder(order: PurchaseOrder): Promise<void> {
    if (!(await this.askReject('order', order.orderNumber, 'Cancel order'))) {
      return;
    }
    this.run(this.procurement.cancelOrder(order.id), 'Order cancelled', order.orderNumber);
  }

  protected approveRequisition(requisition: Requisition): void {
    this.run(
      this.procurement.approveRequisition(requisition.id),
      'Requisition approved',
      requisition.referenceNumber,
    );
  }

  protected async rejectRequisition(requisition: Requisition): Promise<void> {
    if (!(await this.askReject('requisition', requisition.referenceNumber))) {
      return;
    }
    this.run(
      this.procurement.rejectRequisition(requisition.id, 'Rejected by approver'),
      'Requisition rejected',
      requisition.referenceNumber,
    );
  }

  private askReject(kind: string, reference: string, title = 'Reject'): Promise<boolean> {
    return this.confirm.ask({
      title: `${title} ${kind}`,
      message: 'This closes the document. It cannot be reopened.',
      detail: reference,
      confirmLabel: title,
      tone: 'danger',
    });
  }

  private run(
    call: import('rxjs').Observable<unknown>,
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
