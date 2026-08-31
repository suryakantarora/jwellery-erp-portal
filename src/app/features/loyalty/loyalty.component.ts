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
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { Permission } from '../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../core/models/api.model';
import { Customer } from '../../core/models/customer.model';
import {
  LoyaltyAccount,
  LoyaltyProgram,
  LoyaltyProgramRequest,
  LoyaltyTransaction,
  transactionLabel,
} from '../../core/models/loyalty.model';
import { ConfirmService } from '../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
} from '../../shared/components/data-table/data-table.model';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../shared/components/master-panel/master-panel.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { touchAll } from '../../shared/utilities/form.utils';
import { localPage } from '../../shared/utilities/list.utils';
import { CustomerService } from '../customers/customer.service';
import { LoyaltyService } from './loyalty.service';

type Tab = 'programs' | 'members';

/** One tier being drafted inside a new programme. */
interface DraftTier {
  readonly key: number;
  code: FormControl<string>;
  name: FormControl<string>;
  minimumPoints: FormControl<number | null>;
  earnMultiplier: FormControl<number | null>;
  discountPercentage: FormControl<number | null>;
  benefits: FormControl<string>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Loyalty programmes and the members who hold points in them.
 *
 * A programme sets what a purchase earns and what a point is worth; its tiers
 * decide who earns faster and who gets a standing discount — which is why the
 * pricing engine can apply a tier entitlement without the counter doing anything.
 */
@Component({
  selector: 'app-loyalty',
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
  templateUrl: './loyalty.component.html',
  styleUrl: './loyalty.component.scss',
})
export class LoyaltyComponent {
  private readonly loyalty = inject(LoyaltyService);
  private readonly customers = inject(CustomerService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() => this.auth.hasPermission(Permission.LOYALTY_MANAGE));
  protected readonly canRedeem = computed(() => this.auth.hasPermission(Permission.LOYALTY_REDEEM));
  protected readonly canAdjust = computed(() => this.auth.hasPermission(Permission.LOYALTY_ADJUST));

  protected readonly transactionLabel = transactionLabel;

  protected readonly tab = signal<Tab>('programs');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'programs', label: 'Programmes & tiers' },
    { id: 'members', label: 'Member accounts' },
  ];

  protected readonly programs = signal<readonly LoyaltyProgram[]>([]);
  protected readonly customerList = signal<readonly Customer[]>([]);

  /** The member currently being looked at, with their ledger. */
  protected readonly selectedCustomerId = signal('');
  protected readonly account = signal<LoyaltyAccount | null>(null);
  protected readonly notEnrolled = signal(false);
  protected readonly statement = signal<PageResponse<LoyaltyTransaction>>(
    emptyPage(environment.defaultPageSize),
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'code', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly adjusting = signal<'redeem' | 'adjust' | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly tiersTpl =
    viewChild.required<TemplateRef<CellTemplateContext<LoyaltyProgram>>>('tiersCell');
  private readonly earnTpl =
    viewChild.required<TemplateRef<CellTemplateContext<LoyaltyProgram>>>('earnCell');
  private readonly activeTpl =
    viewChild.required<TemplateRef<CellTemplateContext<LoyaltyProgram>>>('activeCell');
  private readonly programActionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<LoyaltyProgram>>>('programActionsCell');
  private readonly txTypeTpl =
    viewChild.required<TemplateRef<CellTemplateContext<LoyaltyTransaction>>>('txTypeCell');
  private readonly txPointsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<LoyaltyTransaction>>>('txPointsCell');
  private readonly txWhenTpl =
    viewChild.required<TemplateRef<CellTemplateContext<LoyaltyTransaction>>>('txWhenCell');

  protected readonly programTemplates = computed(() => ({
    tiers: this.tiersTpl(),
    pointsPerCurrencyUnit: this.earnTpl(),
    active: this.activeTpl(),
    actions: this.programActionsTpl(),
  }));

  protected readonly statementTemplates = computed(() => ({
    type: this.txTypeTpl(),
    points: this.txPointsTpl(),
    occurredAt: this.txWhenTpl(),
  }));

  protected readonly programForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    pointsPerCurrencyUnit: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    currencyValuePerPoint: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    pointsValidityMonths: [12 as number | null, [Validators.min(1)]],
    minimumRedeemablePoints: [100 as number | null, [Validators.min(0)]],
    earnOnMakingChargeOnly: [false],
    effectiveFrom: [today(), [Validators.required]],
    effectiveTo: [''],
  });

  protected readonly pointsForm = this.fb.nonNullable.group({
    points: [null as number | null, [Validators.required]],
    reason: ['', [Validators.required, Validators.maxLength(500)]],
  });

  private nextTierKey = 0;
  protected readonly tiers = signal<readonly DraftTier[]>([]);

  protected readonly programColumns: readonly TableColumn<LoyaltyProgram>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Programme', sortable: true, value: (row) => row.name },
    { key: 'pointsPerCurrencyUnit', header: 'Earn & value', width: '260px' },
    { key: 'tiers', header: 'Tiers' },
    {
      key: 'minimumRedeemablePoints',
      header: 'Min. redeem',
      numeric: true,
      align: 'end',
      width: '130px',
      value: (row) => row.minimumRedeemablePoints,
    },
    { key: 'active', header: 'Status', width: '120px' },
    { key: 'actions', header: '', width: '140px', align: 'end' },
  ];

  protected readonly statementColumns: readonly TableColumn<LoyaltyTransaction>[] = [
    { key: 'occurredAt', header: 'When', width: '180px' },
    { key: 'type', header: 'Movement', width: '150px' },
    { key: 'points', header: 'Points', numeric: true, align: 'end', width: '120px' },
    {
      key: 'balanceAfter',
      header: 'Balance',
      numeric: true,
      align: 'end',
      width: '120px',
      value: (row) => row.balanceAfter,
    },
    {
      key: 'monetaryValue',
      header: 'Value',
      numeric: true,
      align: 'end',
      width: '120px',
      value: (row) => row.monetaryValue,
    },
    {
      key: 'expiresOn',
      header: 'Expires',
      mono: true,
      hideOnMobile: true,
      width: '130px',
      value: (row) => row.expiresOn,
    },
    { key: 'reason', header: 'Reason', hideOnMobile: true, value: (row) => row.reason },
  ];

  protected readonly programPage = computed(() =>
    localPage(this.programs(), {
      search: this.search(),
      searchFields: [(row) => row.code, (row) => row.name],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  protected readonly trackById = (row: { id: string }) => row.id;
  protected readonly trackTier = (tier: DraftTier) => tier.key;

  constructor() {
    this.customers
      .search({ size: 300, sort: 'fullName,asc' })
      .subscribe({ next: (page) => this.customerList.set(page.content) });
    this.load();
  }

  protected customerName(id: string): string {
    return this.customerList().find((customer) => customer.id === id)?.fullName ?? '—';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loyalty.listPrograms().subscribe({
      next: (programs) => {
        this.programs.set(programs);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.search.set('');
    this.page.set(0);
    this.creating.set(false);
    if (tab === 'programs') {
      this.load();
    }
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
  }

  // ---------- member accounts ----------

  protected onCustomerChange(event: Event): void {
    const customerId = (event.target as HTMLSelectElement).value;
    this.selectedCustomerId.set(customerId);
    this.account.set(null);
    this.notEnrolled.set(false);
    this.statement.set(emptyPage(this.size()));
    if (!customerId) {
      return;
    }
    this.loadAccount();
  }

  protected loadAccount(): void {
    const customerId = this.selectedCustomerId();
    if (!customerId) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.loyalty.getAccount(customerId).subscribe({
      next: (account) => {
        this.account.set(account);
        this.notEnrolled.set(false);
        this.loading.set(false);
        this.loadStatement();
      },
      error: (error: AppError) => {
        this.loading.set(false);
        if (error.status === 404) {
          this.account.set(null);
          this.notEnrolled.set(true);
          return;
        }
        this.error.set(error);
      },
    });
  }

  private loadStatement(): void {
    this.loyalty
      .statement(this.selectedCustomerId(), { page: this.page(), size: this.size() })
      .subscribe({
        next: (page) => this.statement.set(page),
        error: () => this.statement.set(emptyPage(this.size())),
      });
  }

  protected onStatementPage(page: number): void {
    this.page.set(page);
    this.loadStatement();
  }

  protected enrol(): void {
    const customerId = this.selectedCustomerId();
    if (!customerId) {
      return;
    }
    this.loyalty.enrol(customerId).subscribe({
      next: (account) => {
        this.account.set(account);
        this.notEnrolled.set(false);
        this.toast.success('Enrolled', `${this.customerName(customerId)} now earns points.`);
        this.loadStatement();
      },
      error: (error: AppError) => this.toast.error('Could not enrol the customer', error.message),
    });
  }

  protected startPoints(mode: 'redeem' | 'adjust'): void {
    this.pointsForm.reset({ points: null, reason: '' });
    this.submitted.set(false);
    this.formError.set(null);
    this.adjusting.set(mode);
  }

  protected closePoints(): void {
    this.adjusting.set(null);
  }

  protected savePoints(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.pointsForm.invalid) {
      touchAll(this.pointsForm);
      return;
    }

    const mode = this.adjusting();
    const value = this.pointsForm.getRawValue();
    const customerId = this.selectedCustomerId();

    const call =
      mode === 'redeem'
        ? this.loyalty.redeem({
            customerId,
            points: value.points as number,
            saleId: null,
            branchId: null,
            reason: value.reason,
          })
        : this.loyalty.adjust({
            customerId,
            points: value.points as number,
            reason: value.reason,
          });

    this.saving.set(true);
    call.subscribe({
      next: (account) => {
        this.saving.set(false);
        this.adjusting.set(null);
        this.account.set(account);
        this.toast.success(
          mode === 'redeem' ? 'Points redeemed' : 'Points adjusted',
          `Balance is now ${account.pointsBalance}`,
        );
        this.loadStatement();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  // ---------- programmes ----------

  protected startCreate(): void {
    this.programForm.reset({
      effectiveFrom: today(),
      pointsValidityMonths: 12,
      minimumRedeemablePoints: 100,
      earnOnMakingChargeOnly: false,
    });
    this.tiers.set([]);
    this.addTier('SILVER', 'Silver', 0, 1);
    this.addTier('GOLD', 'Gold', 5000, 1.25);
    this.addTier('PLATINUM', 'Platinum', 20000, 1.5);
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  protected addTier(
    code = '',
    name = '',
    minimumPoints: number | null = null,
    multiplier = 1,
  ): void {
    this.tiers.update((current) => [
      ...current,
      {
        key: this.nextTierKey++,
        code: this.fb.nonNullable.control(code, [Validators.required]),
        name: this.fb.nonNullable.control(name, [Validators.required]),
        minimumPoints: this.fb.control<number | null>(minimumPoints),
        earnMultiplier: this.fb.control<number | null>(multiplier),
        discountPercentage: this.fb.control<number | null>(null),
        benefits: this.fb.nonNullable.control(''),
      },
    ]);
  }

  protected removeTier(key: number): void {
    this.tiers.update((current) => current.filter((tier) => tier.key !== key));
  }

  protected close(): void {
    this.creating.set(false);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.programForm.invalid) {
      touchAll(this.programForm);
      return;
    }
    const drafted = this.tiers();
    if (drafted.length === 0) {
      this.formError.set('A programme needs at least one tier.');
      return;
    }
    if (drafted.some((tier) => !tier.code.value || !tier.name.value)) {
      this.formError.set('Every tier needs a code and a name.');
      return;
    }

    const value = this.programForm.getRawValue();
    const request: LoyaltyProgramRequest = {
      code: value.code,
      name: value.name,
      companyId: null,
      pointsPerCurrencyUnit: value.pointsPerCurrencyUnit as number,
      currencyValuePerPoint: value.currencyValuePerPoint as number,
      pointsValidityMonths: value.pointsValidityMonths,
      minimumRedeemablePoints: value.minimumRedeemablePoints,
      earnOnMakingChargeOnly: value.earnOnMakingChargeOnly,
      effectiveFrom: value.effectiveFrom,
      effectiveTo: value.effectiveTo || null,
      tiers: drafted.map((tier, index) => ({
        code: tier.code.value,
        name: tier.name.value,
        minimumPoints: tier.minimumPoints.value ?? 0,
        earnMultiplier: tier.earnMultiplier.value ?? 1,
        discountPercentage: tier.discountPercentage.value,
        displayOrder: index,
        benefits: tier.benefits.value || null,
      })),
    };

    this.saving.set(true);
    this.loyalty.createProgram(request).subscribe({
      next: (program) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success('Programme created', `${program.code} — ${program.tiers.length} tiers`);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected async toggleProgram(program: LoyaltyProgram): Promise<void> {
    const activating = !program.active;
    const confirmed = await this.confirm.ask({
      title: activating ? 'Activate programme' : 'Deactivate programme',
      message: activating
        ? 'Purchases start earning points under this programme.'
        : 'Purchases stop earning points. Balances already held are unaffected.',
      detail: `${program.code} — ${program.name}`,
      confirmLabel: activating ? 'Activate' : 'Deactivate',
      tone: activating ? 'default' : 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.loyalty.setProgramActive(program.id, activating).subscribe({
      next: () => {
        this.toast.success(
          activating ? 'Programme activated' : 'Programme deactivated',
          program.code,
        );
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not change the programme', error.message),
    });
  }
}
