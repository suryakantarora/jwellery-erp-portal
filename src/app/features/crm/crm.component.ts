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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Permission } from '../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../core/models/api.model';
import {
  ACTIVITY_TYPES,
  CAMPAIGN_STATUSES,
  Campaign,
  CampaignRequest,
  CampaignStatus,
  Customer,
  CustomerActivity,
  FOLLOW_UP_STATUSES,
  FollowUp,
  FollowUpStatus,
  Segment,
  SegmentRequest,
} from '../../core/models/customer.model';
import { ConfirmService } from '../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
  toSortParam,
} from '../../shared/components/data-table/data-table.model';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../shared/components/master-panel/master-panel.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../shared/utilities/form.utils';
import { localPage } from '../../shared/utilities/list.utils';
import { CustomerService } from '../customers/customer.service';

type Tab = 'follow-ups' | 'activities' | 'segments' | 'campaigns';

/**
 * CRM: what the business owes its customers next, and who it is talking to.
 *
 * Segments are rules rather than lists, so a segment's membership is evaluated
 * on demand and a campaign built on one never targets a stale audience.
 */
@Component({
  selector: 'app-crm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    MasterPanelComponent,
    FormFieldComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './crm.component.html',
  styles: `
    .link-cell {
      padding: 0;
      border: 0;
      background: transparent;
      text-align: left;
      color: inherit;
      cursor: pointer;

      &:hover .cell-stack__primary {
        color: var(--accent);
      }
    }

    .rules {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .panel-filters__toggle {
      align-self: center;
    }

    .rate-note {
      margin-top: var(--space-3);
      font-size: var(--text-sm);
    }
  `,
})
export class CrmComponent {
  private readonly customers = inject(CustomerService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() => this.auth.hasPermission(Permission.CRM_MANAGE));
  protected readonly canManageCampaigns = computed(() =>
    this.auth.hasPermission(Permission.CAMPAIGN_MANAGE),
  );

  protected readonly activityTypes = ACTIVITY_TYPES;
  protected readonly followUpStatuses = FOLLOW_UP_STATUSES;
  protected readonly campaignStatuses = CAMPAIGN_STATUSES;
  protected readonly months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  protected readonly tab = signal<Tab>('follow-ups');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'follow-ups', label: 'Follow-ups' },
    { id: 'activities', label: 'Activities' },
    { id: 'segments', label: 'Segments' },
    { id: 'campaigns', label: 'Campaigns' },
  ];

  /** Customer names, so CRM rows say who rather than a UUID. */
  private readonly customerNames = signal<ReadonlyMap<string, Customer>>(new Map());

  protected readonly followUps = signal<PageResponse<FollowUp>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly activities = signal<PageResponse<CustomerActivity>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly segments = signal<readonly Segment[]>([]);
  protected readonly campaigns = signal<PageResponse<Campaign>>(
    emptyPage(environment.defaultPageSize),
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly statusFilter = signal('');
  protected readonly mineOnly = signal(false);
  protected readonly sort = signal<TableSort | null>({ field: 'dueDate', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);
  /** Members of the segment last previewed. */
  protected readonly memberCount = signal<number | null>(null);

  private readonly customerTpl =
    viewChild.required<TemplateRef<CellTemplateContext<FollowUp>>>('customerCell');
  private readonly followStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<FollowUp>>>('followStatusCell');
  private readonly followActionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<FollowUp>>>('followActionsCell');
  private readonly activityCustomerTpl =
    viewChild.required<TemplateRef<CellTemplateContext<CustomerActivity>>>('activityCustomerCell');
  private readonly activityWhenTpl =
    viewChild.required<TemplateRef<CellTemplateContext<CustomerActivity>>>('activityWhenCell');
  private readonly segmentRulesTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Segment>>>('segmentRulesCell');
  private readonly segmentActionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Segment>>>('segmentActionsCell');
  private readonly campaignStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Campaign>>>('campaignStatusCell');
  private readonly campaignReachTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Campaign>>>('campaignReachCell');

  protected readonly followUpTemplates = computed(() => ({
    customerId: this.customerTpl(),
    status: this.followStatusTpl(),
    actions: this.followActionsTpl(),
  }));

  protected readonly activityTemplates = computed(() => ({
    customerId: this.activityCustomerTpl(),
    occurredAt: this.activityWhenTpl(),
  }));

  protected readonly segmentTemplates = computed(() => ({
    minLifetimeSpend: this.segmentRulesTpl(),
    actions: this.segmentActionsTpl(),
  }));

  protected readonly campaignTemplates = computed(() => ({
    status: this.campaignStatusTpl(),
    targetCount: this.campaignReachTpl(),
  }));

  protected readonly segmentForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(500)]],
    tierCode: [''],
    minLifetimeSpend: [null as number | null, [Validators.min(0)]],
    minPurchaseCount: [null as number | null, [Validators.min(0)]],
    inactiveDays: [null as number | null, [Validators.min(0)]],
    birthdayMonth: [null as number | null],
  });

  protected readonly campaignForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(1000)]],
    segmentId: [''],
    templateCode: [''],
    startsOn: [''],
    endsOn: [''],
  });

  protected readonly followUpColumns: readonly TableColumn<FollowUp>[] = [
    { key: 'title', header: 'Task', value: (row) => row.title },
    { key: 'customerId', header: 'Customer', width: '220px' },
    {
      key: 'dueDate',
      header: 'Due',
      mono: true,
      sortable: true,
      width: '130px',
      value: (row) => row.dueDate,
    },
    {
      key: 'assignedTo',
      header: 'Owner',
      mono: true,
      width: '150px',
      value: (row) => row.assignedTo,
    },
    { key: 'priority', header: 'Priority', width: '110px', value: (row) => row.priority },
    { key: 'status', header: 'Status', width: '140px' },
    { key: 'actions', header: '', width: '130px', align: 'end' },
  ];

  protected readonly activityColumns: readonly TableColumn<CustomerActivity>[] = [
    { key: 'subject', header: 'Subject', value: (row) => row.subject },
    { key: 'customerId', header: 'Customer', width: '220px' },
    { key: 'activityType', header: 'Type', width: '130px', value: (row) => row.activityType },
    {
      key: 'handledBy',
      header: 'Handled by',
      mono: true,
      hideOnMobile: true,
      width: '150px',
      value: (row) => row.handledBy,
    },
    { key: 'occurredAt', header: 'When', width: '170px' },
  ];

  protected readonly segmentColumns: readonly TableColumn<Segment>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '160px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Segment', sortable: true, value: (row) => row.name },
    { key: 'minLifetimeSpend', header: 'Membership rule' },
    { key: 'actions', header: '', width: '160px', align: 'end' },
  ];

  protected readonly campaignColumns: readonly TableColumn<Campaign>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '160px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Campaign', sortable: true, value: (row) => row.name },
    { key: 'segmentId', header: 'Audience', value: (row) => this.segmentName(row.segmentId) },
    {
      key: 'startsOn',
      header: 'Runs',
      mono: true,
      width: '200px',
      value: (row) => `${row.startsOn ?? '—'} → ${row.endsOn ?? '—'}`,
    },
    { key: 'targetCount', header: 'Reach', width: '140px' },
    { key: 'status', header: 'Status', width: '140px' },
  ];

  protected readonly trackById = (row: { id: string }) => row.id;

  constructor() {
    this.customers.search({ size: 300, sort: 'fullName,asc' }).subscribe({
      next: (page) =>
        this.customerNames.set(new Map(page.content.map((customer) => [customer.id, customer]))),
    });
    this.customers.listSegments().subscribe({ next: (r) => this.segments.set(r) });
    this.load();
  }

  protected customerName(id: string): string {
    return this.customerNames().get(id)?.fullName ?? '—';
  }

  protected customerPhone(id: string): string {
    return this.customerNames().get(id)?.phone ?? '';
  }

  protected segmentName(id: string | null): string {
    if (!id) {
      return 'Everyone';
    }
    return this.segments().find((segment) => segment.id === id)?.name ?? '—';
  }

  /** Plain-language summary of what puts a customer in a segment. */
  protected segmentRules(segment: Segment): string {
    const parts: string[] = [];
    if (segment.tierCode) {
      parts.push(`tier ${segment.tierCode}`);
    }
    if (segment.minLifetimeSpend) {
      parts.push(`spent ${segment.minLifetimeSpend}+`);
    }
    if (segment.minPurchaseCount) {
      parts.push(`${segment.minPurchaseCount}+ purchases`);
    }
    if (segment.inactiveDays) {
      parts.push(`quiet ${segment.inactiveDays}+ days`);
    }
    if (segment.birthdayMonth) {
      parts.push(`born in ${this.months[segment.birthdayMonth - 1]}`);
    }
    return parts.length === 0 ? 'Every customer' : parts.join(' · ');
  }

  protected readonly segmentPage = computed(() =>
    localPage(this.segments(), {
      search: this.search(),
      searchFields: [(row) => row.code, (row) => row.name, (row) => row.description],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const tab = this.tab();

    if (tab === 'follow-ups') {
      const query = {
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        status: (this.statusFilter() as FollowUpStatus) || null,
      };
      const call = this.mineOnly()
        ? this.customers.myFollowUps(query)
        : this.customers.searchFollowUps(query);
      call.subscribe({
        next: (page) => {
          this.followUps.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
      return;
    }

    if (tab === 'activities') {
      this.customers.searchActivities({ page: this.page(), size: this.size() }).subscribe({
        next: (page) => {
          this.activities.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
      return;
    }

    if (tab === 'segments') {
      this.customers.listSegments().subscribe({
        next: (segments) => {
          this.segments.set(segments);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
      return;
    }

    this.customers
      .searchCampaigns({
        page: this.page(),
        size: this.size(),
        status: (this.statusFilter() as CampaignStatus) || null,
      })
      .subscribe({
        next: (page) => {
          this.campaigns.set(page);
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
    this.statusFilter.set('');
    this.page.set(0);
    this.creating.set(false);
    this.memberCount.set(null);
    this.sort.set(
      tab === 'follow-ups'
        ? { field: 'dueDate', direction: 'asc' }
        : { field: 'code', direction: 'asc' },
    );
    this.load();
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
    this.load();
  }

  protected toggleMine(): void {
    this.mineOnly.update((current) => !current);
    this.page.set(0);
    this.load();
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
    if (this.tab() !== 'segments') {
      this.load();
    }
  }

  protected onPage(page: number): void {
    this.page.set(page);
    if (this.tab() !== 'segments') {
      this.load();
    }
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
    if (this.tab() !== 'segments') {
      this.load();
    }
  }

  protected openCustomer(customerId: string): void {
    void this.router.navigate(['/customers', customerId]);
  }

  // ---------- creating ----------

  protected startCreate(): void {
    this.segmentForm.reset();
    this.campaignForm.reset();
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

    if (this.tab() === 'segments') {
      if (this.segmentForm.invalid) {
        touchAll(this.segmentForm);
        return;
      }
      const request = {
        ...(nullifyBlanks(this.segmentForm.getRawValue()) as unknown as SegmentRequest),
        branchId: null,
      };
      this.commit(this.customers.createSegment(request), 'Segment created');
      return;
    }

    if (this.campaignForm.invalid) {
      touchAll(this.campaignForm);
      return;
    }
    const request = {
      ...(nullifyBlanks(this.campaignForm.getRawValue()) as unknown as CampaignRequest),
      branchId: null,
    };
    this.commit(this.customers.createCampaign(request), 'Campaign created');
  }

  private commit(call: Observable<{ code: string; name: string }>, title: string): void {
    this.saving.set(true);
    call.subscribe({
      next: (record) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success(title, `${record.code} — ${record.name}`);
        this.customers.listSegments().subscribe({ next: (r) => this.segments.set(r) });
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const form = this.tab() === 'segments' ? this.segmentForm : this.campaignForm;
        const unmatched = applyServerErrors(form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }

  /** Evaluates the segment's rules now to show how many customers it reaches. */
  protected previewSegment(segment: Segment): void {
    this.memberCount.set(null);
    this.customers.segmentMembers(segment.id).subscribe({
      next: (ids) => {
        this.memberCount.set(ids.length);
        this.toast.info(
          'Segment evaluated',
          `${segment.name} currently matches ${ids.length} customer(s).`,
        );
      },
      error: (error: AppError) => this.toast.error('Could not evaluate the segment', error.message),
    });
  }

  protected async completeFollowUp(followUp: FollowUp): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Complete follow-up',
      message: 'The task is closed and recorded on the customer’s timeline.',
      detail: followUp.title,
      confirmLabel: 'Mark complete',
    });
    if (!confirmed) {
      return;
    }

    this.customers.completeFollowUp(followUp.id, 'Completed from the CRM queue').subscribe({
      next: () => {
        this.toast.success('Follow-up completed', followUp.title);
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not complete the task', error.message),
    });
  }
}
