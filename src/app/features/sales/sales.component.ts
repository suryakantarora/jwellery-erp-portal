import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Permission } from '../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../core/models/api.model';
import { Customer } from '../../core/models/customer.model';
import { JewelleryItem } from '../../core/models/inventory.model';
import { Branch, Location } from '../../core/models/organization.model';
import {
  DailyClosing,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  Payment,
  PaymentMethod,
  Quotation,
  SALE_STATUSES,
  Sale,
  SaleStatus,
  paymentMethodLabel,
} from '../../core/models/sales.model';
import { BranchContextService } from '../../core/services/branch-context.service';
import { ConfirmService } from '../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
  toSortParam,
} from '../../shared/components/data-table/data-table.model';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../shared/components/master-panel/master-panel.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { touchAll } from '../../shared/utilities/form.utils';
import { CustomerService } from '../customers/customer.service';
import { InventoryService } from '../inventory/inventory.service';
import { OrganizationService } from '../organization/organization.service';
import { SalesService } from './sales.service';

type Tab = 'sales' | 'quotations' | 'payments' | 'closing';

/**
 * Sales administration: invoices, quotations, collection and the day's close.
 *
 * A sale copies the rate, weight and every price component onto its lines when
 * it is made, so an invoice is a permanent record — changing today's gold rate
 * cannot move what a customer was charged last week.
 */
@Component({
  selector: 'app-sales',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    PageHeaderComponent,
    MasterPanelComponent,
    DrawerComponent,
    FormFieldComponent,
    SpinnerComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss',
})
export class SalesComponent {
  private readonly sales = inject(SalesService);
  private readonly customers = inject(CustomerService);
  private readonly inventory = inject(InventoryService);
  private readonly organization = inject(OrganizationService);
  private readonly branchContext = inject(BranchContextService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canSell = computed(() => this.auth.hasPermission(Permission.SALE_CREATE));
  protected readonly canReturn = computed(() => this.auth.hasPermission(Permission.SALE_RETURN));
  protected readonly canCollect = computed(() =>
    this.auth.hasPermission(Permission.PAYMENT_COLLECT),
  );
  protected readonly canReconcile = computed(() =>
    this.auth.hasPermission(Permission.PAYMENT_RECONCILE),
  );
  protected readonly canRefund = computed(() => this.auth.hasPermission(Permission.PAYMENT_REFUND));

  protected readonly saleStatuses = SALE_STATUSES;
  protected readonly paymentStatuses = PAYMENT_STATUSES;
  protected readonly paymentMethods = PAYMENT_METHODS;
  protected readonly methodLabel = paymentMethodLabel;

  protected readonly tab = signal<Tab>('sales');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'sales', label: 'Invoices' },
    { id: 'quotations', label: 'Quotations' },
    { id: 'payments', label: 'Payments' },
    { id: 'closing', label: 'Daily closing' },
  ];

  protected readonly customerList = signal<readonly Customer[]>([]);
  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly locations = signal<readonly Location[]>([]);
  protected readonly sellableItems = signal<readonly JewelleryItem[]>([]);
  protected readonly selectedItems = signal<ReadonlySet<string>>(new Set());

  protected readonly saleList = signal<PageResponse<Sale>>(emptyPage(environment.defaultPageSize));
  protected readonly quotations = signal<PageResponse<Quotation>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly payments = signal<PageResponse<Payment>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly closing = signal<DailyClosing | null>(null);
  protected readonly salePayments = signal<readonly Payment[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly statusFilter = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'saleDate', direction: 'desc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly viewing = signal<Sale | null>(null);
  protected readonly collecting = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly closingDate = signal(new Date().toISOString().slice(0, 10));

  private readonly saleRefTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Sale>>>('saleRefCell');
  private readonly saleCustomerTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Sale>>>('saleCustomerCell');
  private readonly saleStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Sale>>>('saleStatusCell');
  private readonly saleMoneyTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Sale>>>('saleMoneyCell');
  private readonly saleActionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Sale>>>('saleActionsCell');
  private readonly quoteStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Quotation>>>('quoteStatusCell');
  private readonly quoteCustomerTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Quotation>>>('quoteCustomerCell');
  private readonly payStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Payment>>>('payStatusCell');
  private readonly payMethodTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Payment>>>('payMethodCell');
  private readonly payActionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Payment>>>('payActionsCell');

  protected readonly saleTemplates = computed(() => ({
    saleNumber: this.saleRefTpl(),
    customerId: this.saleCustomerTpl(),
    status: this.saleStatusTpl(),
    totalAmount: this.saleMoneyTpl(),
    actions: this.saleActionsTpl(),
  }));

  protected readonly quotationTemplates = computed(() => ({
    status: this.quoteStatusTpl(),
    customerId: this.quoteCustomerTpl(),
  }));

  protected readonly paymentTemplates = computed(() => ({
    status: this.payStatusTpl(),
    method: this.payMethodTpl(),
    actions: this.payActionsTpl(),
  }));

  protected readonly saleForm = this.fb.nonNullable.group({
    customerId: ['', [Validators.required]],
    branchId: ['', [Validators.required]],
    locationId: [''],
    redeemPoints: [null as number | null, [Validators.min(0)]],
    exchangeCredit: [null as number | null, [Validators.min(0)]],
    notes: [''],
  });

  protected readonly paymentForm = this.fb.nonNullable.group({
    method: ['CASH' as PaymentMethod, [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    transactionReference: [''],
    cardLastFour: ['', [Validators.pattern(/^\d{4}$/)]],
    bankName: [''],
    notes: [''],
  });

  protected readonly saleColumns: readonly TableColumn<Sale>[] = [
    { key: 'saleNumber', header: 'Invoice', width: '210px' },
    { key: 'customerId', header: 'Customer' },
    {
      key: 'saleDate',
      header: 'Date',
      mono: true,
      sortable: true,
      width: '130px',
      value: (row) => row.saleDate,
    },
    {
      key: 'lines',
      header: 'Pieces',
      numeric: true,
      align: 'end',
      width: '90px',
      value: (row) => row.lines.length,
    },
    { key: 'totalAmount', header: 'Amount', width: '200px' },
    { key: 'status', header: 'Status', width: '170px' },
    { key: 'actions', header: '', width: '200px', align: 'end' },
  ];

  protected readonly quotationColumns: readonly TableColumn<Quotation>[] = [
    {
      key: 'quotationNumber',
      header: 'Quotation',
      mono: true,
      width: '210px',
      value: (row) => row.quotationNumber,
    },
    { key: 'customerId', header: 'Customer' },
    {
      key: 'quotationDate',
      header: 'Raised',
      mono: true,
      width: '130px',
      value: (row) => row.quotationDate,
    },
    {
      key: 'validUntil',
      header: 'Valid until',
      mono: true,
      width: '130px',
      value: (row) => row.validUntil,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      numeric: true,
      align: 'end',
      width: '150px',
      value: (row) => row.totalAmount,
    },
    { key: 'status', header: 'Status', width: '150px' },
  ];

  protected readonly paymentColumns: readonly TableColumn<Payment>[] = [
    {
      key: 'paymentNumber',
      header: 'Payment',
      mono: true,
      width: '200px',
      value: (row) => row.paymentNumber,
    },
    { key: 'method', header: 'Method', width: '180px' },
    {
      key: 'amount',
      header: 'Amount',
      numeric: true,
      align: 'end',
      width: '150px',
      value: (row) => row.amount,
    },
    {
      key: 'transactionReference',
      header: 'Reference',
      mono: true,
      hideOnMobile: true,
      value: (row) => row.transactionReference,
    },
    {
      key: 'createdAt',
      header: 'Taken',
      hideOnMobile: true,
      width: '150px',
      value: (row) => row.createdAt.slice(0, 10),
    },
    { key: 'status', header: 'Status', width: '150px' },
    { key: 'actions', header: '', width: '150px', align: 'end' },
  ];

  protected readonly trackById = (row: { id: string }) => row.id;

  /** What the drafted sale is worth, before tax and discounts the server applies. */
  protected readonly draftCount = computed(() => this.selectedItems().size);

  constructor() {
    this.customers
      .search({ size: 300, sort: 'fullName,asc' })
      .subscribe({ next: (page) => this.customerList.set(page.content) });
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

  protected customerName(id: string | null): string {
    if (!id) {
      return '—';
    }
    return this.customerList().find((customer) => customer.id === id)?.fullName ?? '—';
  }

  protected branchName(id: string): string {
    return this.branches().find((branch) => branch.id === id)?.name ?? '—';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const tab = this.tab();

    if (tab === 'sales') {
      this.sales
        .searchSales({
          page: this.page(),
          size: this.size(),
          sort: toSortParam(this.sort()),
          status: (this.statusFilter() as SaleStatus) || null,
        })
        .subscribe({
          next: (page) => {
            this.saleList.set(page);
            this.loading.set(false);
          },
          error: (error: AppError) => this.fail(error),
        });
      return;
    }

    if (tab === 'quotations') {
      this.sales.searchQuotations({ page: this.page(), size: this.size() }).subscribe({
        next: (page) => {
          this.quotations.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
      return;
    }

    if (tab === 'payments') {
      this.sales.searchPayments({ page: this.page(), size: this.size() }).subscribe({
        next: (page) => {
          this.payments.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
      return;
    }

    this.loadClosing();
  }

  protected loadClosing(): void {
    const branchId = this.branchContext.activeBranchId() ?? this.branches()[0]?.id;
    if (!branchId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.sales.dailyClosing(branchId, this.closingDate()).subscribe({
      next: (closing) => {
        this.closing.set(closing);
        this.loading.set(false);
      },
      error: (error: AppError) => this.fail(error),
    });
  }

  protected onClosingDate(event: Event): void {
    this.closingDate.set((event.target as HTMLInputElement).value);
    this.loadClosing();
  }

  private fail(error: AppError): void {
    this.error.set(error);
    this.loading.set(false);
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.statusFilter.set('');
    this.page.set(0);
    this.creating.set(false);
    this.sort.set(
      tab === 'sales'
        ? { field: 'saleDate', direction: 'desc' }
        : { field: 'createdAt', direction: 'desc' },
    );
    this.load();
  }

  protected onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
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

  // ---------- selling ----------

  protected startCreate(): void {
    const branchId = this.branchContext.activeBranchId() ?? this.branches()[0]?.id ?? '';
    this.saleForm.reset({ branchId, customerId: '', locationId: '' });
    this.selectedItems.set(new Set());
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
    this.loadSellable(branchId);
  }

  protected onSaleBranchChange(event: Event): void {
    this.loadSellable((event.target as HTMLSelectElement).value);
  }

  /** Only pieces available in the branch can be sold. */
  private loadSellable(branchId: string): void {
    this.selectedItems.set(new Set());
    if (!branchId) {
      this.sellableItems.set([]);
      return;
    }
    this.inventory
      .searchItems({ branchId, status: 'AVAILABLE', size: 200, sort: 'itemCode,asc' })
      .subscribe({
        next: (page) => this.sellableItems.set(page.content),
        error: () => this.sellableItems.set([]),
      });
  }

  protected toggleItem(itemId: string): void {
    this.selectedItems.update((current) => {
      const next = new Set(current);
      if (!next.delete(itemId)) {
        next.add(itemId);
      }
      return next;
    });
  }

  protected isSelected(itemId: string): boolean {
    return this.selectedItems().has(itemId);
  }

  protected close(): void {
    this.creating.set(false);
    this.viewing.set(null);
    this.collecting.set(false);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.saleForm.invalid) {
      touchAll(this.saleForm);
      return;
    }
    if (this.selectedItems().size === 0) {
      this.formError.set('Add at least one piece to the sale.');
      return;
    }

    const value = this.saleForm.getRawValue();
    this.saving.set(true);
    this.sales
      .createSale({
        customerId: value.customerId,
        branchId: value.branchId,
        locationId: value.locationId || null,
        quotationId: null,
        salespersonId: null,
        exchangeCredit: value.exchangeCredit,
        redeemPoints: value.redeemPoints,
        notes: value.notes || null,
        lines: [...this.selectedItems()].map((jewelleryItemId) => ({
          jewelleryItemId,
          discountType: null,
          discountValue: null,
        })),
      })
      .subscribe({
        next: (sale) => {
          this.saving.set(false);
          this.creating.set(false);
          this.toast.success('Sale raised', `${sale.saleNumber} — ${sale.totalAmount}`);
          this.page.set(0);
          this.load();
          this.view(sale);
        },
        error: (error: AppError) => {
          this.saving.set(false);
          this.formError.set(error.message);
        },
      });
  }

  // ---------- one sale ----------

  protected view(sale: Sale): void {
    this.viewing.set(sale);
    this.salePayments.set([]);
    forkJoin({
      sale: this.sales.getSale(sale.id),
      payments: this.sales.paymentsForSale(sale.id).pipe(),
    }).subscribe({
      next: ({ sale: fresh, payments }) => {
        this.viewing.set(fresh);
        this.salePayments.set(payments);
      },
      error: () => undefined,
    });
  }

  protected startCollect(): void {
    const sale = this.viewing();
    if (!sale) {
      return;
    }
    this.paymentForm.reset({
      method: 'CASH',
      amount: sale.outstandingAmount ?? sale.amountPayable ?? null,
    });
    this.submitted.set(false);
    this.formError.set(null);
    this.collecting.set(true);
  }

  protected collect(): void {
    this.submitted.set(true);
    this.formError.set(null);

    const sale = this.viewing();
    if (!sale) {
      return;
    }
    if (this.paymentForm.invalid) {
      touchAll(this.paymentForm);
      return;
    }

    const value = this.paymentForm.getRawValue();
    this.saving.set(true);
    this.sales
      .recordPayment(sale.id, {
        saleId: sale.id,
        method: value.method,
        amount: value.amount as number,
        transactionReference: value.transactionReference || null,
        cardLastFour: value.cardLastFour || null,
        bankName: value.bankName || null,
        notes: value.notes || null,
      })
      .subscribe({
        next: (payment) => {
          this.saving.set(false);
          this.collecting.set(false);
          this.toast.success('Payment recorded', `${payment.paymentNumber} — ${payment.amount}`);
          this.view(sale);
          this.load();
        },
        error: (error: AppError) => {
          this.saving.set(false);
          this.formError.set(error.message);
        },
      });
  }

  protected deliver(sale: Sale): void {
    this.run(this.sales.deliverSale(sale.id), 'Marked delivered', sale.saleNumber);
  }

  protected async cancel(sale: Sale): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Cancel sale',
      message: 'The pieces return to stock and the invoice is void.',
      detail: sale.saleNumber,
      confirmLabel: 'Cancel sale',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.run(this.sales.cancelSale(sale.id), 'Sale cancelled', sale.saleNumber);
  }

  protected async reconcile(payment: Payment): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Mark reconciled',
      message: 'Confirms this payment matches a line on the bank statement.',
      detail: `${payment.paymentNumber} — ${payment.amount}`,
      confirmLabel: 'Reconcile',
    });
    if (!confirmed) {
      return;
    }
    this.run(this.sales.reconcile(payment.id), 'Payment reconciled', payment.paymentNumber);
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
