import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  NotificationChannel,
  NotificationStatus,
  NotificationTemplate,
  OutboundNotification,
  TemplateRequest,
} from '../../../core/models/control.model';
import { Movement } from '../../../core/models/inventory.model';
import { GoodsReceipt, PurchaseOrder, Requisition } from '../../../core/models/procurement.model';
import { Exchange } from '../../../core/models/operations.model';
import { StockCount } from '../../../core/models/operations.model';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
} from '../../../shared/components/data-table/data-table.model';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../../shared/components/master-panel/master-panel.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { touchAll } from '../../../shared/utilities/form.utils';
import { localPage } from '../../../shared/utilities/list.utils';
import { InventoryService } from '../../inventory/inventory.service';
import { OperationsService } from '../../operations/operations.service';
import { ProcurementService } from '../../procurement/procurement.service';
import { ControlService } from '../control.service';

type Tab = 'outbox' | 'templates';

/** Anything, from any module, that is waiting on a decision. */
interface PendingApproval {
  readonly id: string;
  readonly kind: string;
  readonly reference: string;
  readonly detail: string;
  readonly raisedAt: string;
  readonly route: readonly string[];
}

/**
 * The message outbox and its templates, or — on the approvals route — every
 * decision the business is currently waiting on, gathered from each module
 * into one queue.
 */
@Component({
  selector: 'app-notifications-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    MasterPanelComponent,
    FormFieldComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent {
  private readonly control = inject(ControlService);
  private readonly inventory = inject(InventoryService);
  private readonly procurement = inject(ProcurementService);
  private readonly operations = inject(OperationsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  /** `approvals` renders the cross-module queue instead of the outbox. */
  readonly view = input<'outbox' | 'approvals'>('outbox');

  protected readonly canManage = computed(() =>
    this.auth.hasPermission(Permission.NOTIFICATION_MANAGE),
  );

  protected readonly channels = NOTIFICATION_CHANNELS;
  protected readonly statuses = NOTIFICATION_STATUSES;

  protected readonly tab = signal<Tab>('outbox');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'outbox', label: 'Outbox' },
    { id: 'templates', label: 'Templates' },
  ];

  protected readonly notifications = signal<PageResponse<OutboundNotification>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly templates = signal<readonly NotificationTemplate[]>([]);
  protected readonly approvals = signal<readonly PendingApproval[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<NotificationStatus | ''>('');
  protected readonly channelFilter = signal<NotificationChannel | ''>('');
  protected readonly sort = signal<TableSort | null>({ field: 'createdAt', direction: 'desc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<OutboundNotification>>>('statusCell');
  private readonly recipientTpl =
    viewChild.required<TemplateRef<CellTemplateContext<OutboundNotification>>>('recipientCell');
  private readonly whenTpl =
    viewChild.required<TemplateRef<CellTemplateContext<OutboundNotification>>>('whenCell');
  private readonly templateActiveTpl =
    viewChild.required<TemplateRef<CellTemplateContext<NotificationTemplate>>>(
      'templateActiveCell',
    );
  private readonly approvalTpl =
    viewChild.required<TemplateRef<CellTemplateContext<PendingApproval>>>('approvalCell');
  private readonly approvalWhenTpl =
    viewChild.required<TemplateRef<CellTemplateContext<PendingApproval>>>('approvalWhenCell');

  protected readonly outboxTemplates = computed(() => ({
    status: this.statusTpl(),
    recipientAddress: this.recipientTpl(),
    createdAt: this.whenTpl(),
  }));

  protected readonly templateTemplates = computed(() => ({ active: this.templateActiveTpl() }));

  protected readonly approvalTemplates = computed(() => ({
    reference: this.approvalTpl(),
    raisedAt: this.approvalWhenTpl(),
  }));

  protected readonly templateForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(60)]],
    eventType: ['', [Validators.required, Validators.maxLength(60)]],
    locale: ['en'],
    subject: ['', [Validators.maxLength(255)]],
    body: ['', [Validators.required]],
  });

  protected readonly outboxColumns: readonly TableColumn<OutboundNotification>[] = [
    {
      key: 'eventType',
      header: 'Event',
      mono: true,
      width: '210px',
      value: (row) => row.eventType,
    },
    { key: 'channel', header: 'Channel', width: '120px', value: (row) => row.channel },
    { key: 'recipientAddress', header: 'To' },
    { key: 'subject', header: 'Subject', hideOnMobile: true, value: (row) => row.subject },
    {
      key: 'attemptCount',
      header: 'Tries',
      numeric: true,
      align: 'end',
      width: '90px',
      value: (row) => row.attemptCount,
    },
    { key: 'createdAt', header: 'Raised', width: '160px' },
    { key: 'status', header: 'Status', width: '140px' },
  ];

  protected readonly templateColumns: readonly TableColumn<NotificationTemplate>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '200px',
      value: (row) => row.code,
    },
    {
      key: 'eventType',
      header: 'Event',
      mono: true,
      width: '210px',
      value: (row) => row.eventType,
    },
    { key: 'channel', header: 'Channel', width: '120px', value: (row) => row.channel },
    { key: 'subject', header: 'Subject', value: (row) => row.subject },
    {
      key: 'locale',
      header: 'Locale',
      align: 'center',
      width: '100px',
      value: (row) => row.locale,
    },
    { key: 'active', header: 'Status', width: '120px' },
  ];

  protected readonly approvalColumns: readonly TableColumn<PendingApproval>[] = [
    { key: 'kind', header: 'Waiting on', width: '210px', value: (row) => row.kind },
    { key: 'reference', header: 'Document', width: '230px' },
    { key: 'detail', header: 'Detail', value: (row) => row.detail },
    { key: 'raisedAt', header: 'Raised', width: '180px' },
  ];

  protected readonly templatePage = computed(() =>
    localPage(this.templates(), {
      search: this.search(),
      searchFields: [(row) => row.code, (row) => row.eventType, (row) => row.subject],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  protected readonly approvalPage = computed(() =>
    localPage(this.approvals(), {
      search: this.search(),
      searchFields: [(row) => row.kind, (row) => row.reference, (row) => row.detail],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  protected readonly trackById = (row: { id: string }) => row.id;

  constructor() {
    // Route inputs are bound after construction, so the first load has to wait
    // for `view` — reading it here would always see the default.
    effect(() => {
      this.view();
      this.load();
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    if (this.view() === 'approvals') {
      this.loadApprovals();
      return;
    }

    if (this.tab() === 'templates') {
      this.control.listTemplates().subscribe({
        next: (templates) => {
          this.templates.set(templates);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
      return;
    }

    this.control
      .searchNotifications({
        page: this.page(),
        size: this.size(),
        status: this.statusFilter() || null,
        channel: this.channelFilter() || null,
      })
      .subscribe({
        next: (page) => {
          this.notifications.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
  }

  /**
   * Gathers every outstanding decision into one queue.
   *
   * Each module owns its own approval rules, so this asks each of them for what
   * is pending rather than keeping a second list that could drift.
   */
  private loadApprovals(): void {
    forkJoin({
      transfers: this.inventory.searchMovements({ status: 'PENDING_APPROVAL', size: 100 }),
      orders: this.procurement.searchOrders({ status: 'PENDING_APPROVAL', size: 100 }),
      requisitions: this.procurement.searchRequisitions({ status: 'PENDING_APPROVAL', size: 100 }),
      receipts: this.procurement.searchReceipts({ status: 'PENDING_QUALITY_CHECK', size: 100 }),
      exchanges: this.operations.searchExchanges({ status: 'PENDING_APPROVAL', size: 100 }),
      counts: this.operations.searchStockCounts({ status: 'PENDING_REVIEW', size: 100 }),
    }).subscribe({
      next: ({ transfers, orders, requisitions, receipts, exchanges, counts }) => {
        const queue: PendingApproval[] = [
          ...transfers.content.map((movement: Movement) => ({
            id: `transfer-${movement.id}`,
            kind: 'Stock transfer',
            reference: movement.referenceNumber,
            detail: `${movement.lines.length} piece(s)${movement.approvedBy ? ' · awaiting a second approver' : ''}`,
            raisedAt: movement.createdAt,
            route: ['/inventory/transfers'],
          })),
          ...orders.content.map((order: PurchaseOrder) => ({
            id: `order-${order.id}`,
            kind: 'Purchase order',
            reference: order.orderNumber,
            detail: `${order.lines.length} line(s) · ${order.estimatedTotal ?? 0}`,
            raisedAt: order.createdAt,
            route: ['/procurement/orders'],
          })),
          ...requisitions.content.map((requisition: Requisition) => ({
            id: `requisition-${requisition.id}`,
            kind: 'Requisition',
            reference: requisition.referenceNumber,
            detail: `${requisition.lines.length} line(s)`,
            raisedAt: requisition.createdAt,
            route: ['/procurement/orders'],
          })),
          ...receipts.content.map((receipt: GoodsReceipt) => ({
            id: `receipt-${receipt.id}`,
            kind: 'Goods receipt',
            reference: receipt.receiptNumber,
            detail: `${receipt.lines.length} piece(s) awaiting quality check`,
            raisedAt: receipt.createdAt,
            route: ['/procurement/receipts'],
          })),
          ...exchanges.content.map((exchange: Exchange) => ({
            id: `exchange-${exchange.id}`,
            kind: 'Exchange valuation',
            reference: exchange.referenceNumber,
            detail: `Offer ${exchange.netValuation ?? 0} ${exchange.currency ?? ''}`,
            raisedAt: exchange.receivedDate,
            route: ['/exchange'],
          })),
          ...counts.content.map((count: StockCount) => ({
            id: `count-${count.id}`,
            kind: 'Stock count',
            reference: count.referenceNumber,
            detail: `${count.missingCount} missing, ${count.unexpectedCount} unexpected`,
            raisedAt: count.countedAt ?? count.countDate,
            route: ['/warehouse'],
          })),
        ];

        this.approvals.set(
          queue.sort((left, right) => left.raisedAt.localeCompare(right.raisedAt)),
        );
        this.loading.set(false);
      },
      error: (error: AppError) => this.fail(error),
    });
  }

  private fail(error: AppError): void {
    this.error.set(error);
    this.loading.set(false);
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.search.set('');
    this.page.set(0);
    this.creating.set(false);
    this.load();
  }

  protected onFilter(which: 'status' | 'channel', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (which === 'status') {
      this.statusFilter.set(value as NotificationStatus | '');
    } else {
      this.channelFilter.set(value as NotificationChannel | '');
    }
    this.page.set(0);
    this.load();
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
  }

  protected onPage(page: number): void {
    this.page.set(page);
    if (this.view() === 'outbox' && this.tab() === 'outbox') {
      this.load();
    }
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
    this.load();
  }

  protected startCreate(): void {
    this.templateForm.reset({ locale: 'en' });
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  protected close(): void {
    this.creating.set(false);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.templateForm.invalid) {
      touchAll(this.templateForm);
      return;
    }

    const request = this.templateForm.getRawValue() as TemplateRequest;
    this.saving.set(true);
    this.control.createTemplate(request).subscribe({
      next: (template) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success('Template created', `${template.code} — ${template.eventType}`);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected toggleTemplate(template: NotificationTemplate): void {
    this.control.setTemplateActive(template.id, !template.active).subscribe({
      next: () => {
        this.toast.success(
          template.active ? 'Template disabled' : 'Template enabled',
          template.code,
        );
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not change the template', error.message),
    });
  }
}
