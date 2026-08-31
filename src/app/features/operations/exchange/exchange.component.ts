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
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import { Customer } from '../../../core/models/customer.model';
import { Metal, Purity } from '../../../core/models/metal.model';
import {
  EXCHANGE_STATUSES,
  EXCHANGE_TYPES,
  Exchange,
  ExchangeStatus,
  ExchangeType,
  exchangeStatusLabel,
} from '../../../core/models/operations.model';
import { Branch } from '../../../core/models/organization.model';
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
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { touchAll } from '../../../shared/utilities/form.utils';
import { CustomerService } from '../../customers/customer.service';
import { MetalService } from '../../products/metal.service';
import { OrganizationService } from '../../organization/organization.service';
import { OperationsService } from '../operations.service';

/** Which step drawer is open on the chosen exchange. */
type Step = 'weigh' | 'purity' | 'value' | null;

/**
 * Old-gold exchange and buyback.
 *
 * The offer is built up in visible steps — weigh, test the purity, then value
 * at the buying rate less a deduction — so a customer can be told exactly how
 * the number was reached, and an approver can see the same working.
 */
@Component({
  selector: 'app-exchange',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MasterPanelComponent,
    DrawerComponent,
    FormFieldComponent,
    SpinnerComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './exchange.component.html',
  styleUrl: './exchange.component.scss',
})
export class ExchangeComponent {
  private readonly operations = inject(OperationsService);
  private readonly customers = inject(CustomerService);
  private readonly metalApi = inject(MetalService);
  private readonly organization = inject(OrganizationService);
  private readonly branchContext = inject(BranchContextService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canProcess = computed(() =>
    this.auth.hasPermission(Permission.EXCHANGE_PROCESS),
  );
  protected readonly canValue = computed(() => this.auth.hasPermission(Permission.EXCHANGE_VALUE));
  protected readonly canApprove = computed(() =>
    this.auth.hasPermission(Permission.EXCHANGE_APPROVE),
  );

  protected readonly exchangeTypes = EXCHANGE_TYPES;
  protected readonly statuses = EXCHANGE_STATUSES;
  protected readonly statusLabel = exchangeStatusLabel;

  protected readonly customerList = signal<readonly Customer[]>([]);
  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly metals = signal<readonly Metal[]>([]);
  protected readonly purities = signal<readonly Purity[]>([]);

  protected readonly result = signal<PageResponse<Exchange>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly statusFilter = signal<ExchangeStatus | ''>('');
  protected readonly typeFilter = signal<ExchangeType | ''>('');
  protected readonly sort = signal<TableSort | null>({ field: 'createdAt', direction: 'desc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly viewing = signal<Exchange | null>(null);
  protected readonly step = signal<Step>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly refTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Exchange>>>('refCell');
  private readonly customerTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Exchange>>>('customerCell');
  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Exchange>>>('statusCell');
  private readonly weightTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Exchange>>>('weightCell');
  private readonly valueTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Exchange>>>('valueCell');

  protected readonly templates = computed(() => ({
    referenceNumber: this.refTpl(),
    customerId: this.customerTpl(),
    status: this.statusTpl(),
    netWeight: this.weightTpl(),
    netValuation: this.valueTpl(),
  }));

  protected readonly receiveForm = this.fb.nonNullable.group({
    exchangeType: ['EXCHANGE' as ExchangeType, [Validators.required]],
    customerId: ['', [Validators.required]],
    branchId: ['', [Validators.required]],
    metalId: ['', [Validators.required]],
    declaredPurityId: [''],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    itemCount: [1, [Validators.required, Validators.min(1)]],
    notes: [''],
  });

  protected readonly weighForm = this.fb.nonNullable.group({
    grossWeight: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    stoneWeight: [null as number | null, [Validators.min(0)]],
  });

  protected readonly purityForm = this.fb.nonNullable.group({
    testedPurityId: ['', [Validators.required]],
    testMethod: ['TOUCHSTONE'],
  });

  protected readonly valueForm = this.fb.nonNullable.group({
    deductionPercentage: [null as number | null, [Validators.min(0), Validators.max(100)]],
    notes: [''],
  });

  protected readonly columns: readonly TableColumn<Exchange>[] = [
    { key: 'referenceNumber', header: 'Reference', width: '210px' },
    { key: 'customerId', header: 'Customer' },
    { key: 'exchangeType', header: 'Kind', width: '120px', value: (row) => row.exchangeType },
    { key: 'description', header: 'Item', hideOnMobile: true, value: (row) => row.description },
    { key: 'netWeight', header: 'Weight', width: '170px' },
    { key: 'netValuation', header: 'Offer', width: '170px' },
    { key: 'status', header: 'Status', width: '180px' },
  ];

  protected readonly trackById = (row: Exchange) => row.id;

  constructor() {
    this.customers
      .search({ size: 300, sort: 'fullName,asc' })
      .subscribe({ next: (page) => this.customerList.set(page.content) });
    this.organization.listAllBranches().subscribe({ next: (r) => this.branches.set(r) });
    this.metalApi.listMetals().subscribe({ next: (r) => this.metals.set(r) });
    this.load();
  }

  protected customerName(id: string): string {
    return this.customerList().find((customer) => customer.id === id)?.fullName ?? '—';
  }

  protected metalName(id: string): string {
    return this.metals().find((metal) => metal.id === id)?.name ?? '—';
  }

  protected purityName(id: string | null): string {
    if (!id) {
      return '—';
    }
    return this.purities().find((purity) => purity.id === id)?.name ?? '—';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.operations
      .searchExchanges({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        status: this.statusFilter() || null,
        exchangeType: this.typeFilter() || null,
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

  protected onFilter(which: 'status' | 'type', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (which === 'status') {
      this.statusFilter.set(value as ExchangeStatus | '');
    } else {
      this.typeFilter.set(value as ExchangeType | '');
    }
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
    this.receiveForm.reset({
      exchangeType: 'EXCHANGE',
      branchId: this.branchContext.activeBranchId() ?? this.branches()[0]?.id ?? '',
      itemCount: 1,
      customerId: '',
      metalId: '',
    });
    this.purities.set([]);
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  protected onMetalChange(event: Event): void {
    const metalId = (event.target as HTMLSelectElement).value;
    this.receiveForm.patchValue({ declaredPurityId: '' });
    this.loadPurities(metalId);
  }

  private loadPurities(metalId: string): void {
    if (!metalId) {
      this.purities.set([]);
      return;
    }
    this.metalApi.listPurities(metalId).subscribe({
      next: (purities) => this.purities.set(purities),
      error: () => this.purities.set([]),
    });
  }

  protected close(): void {
    this.creating.set(false);
    this.viewing.set(null);
    this.step.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.receiveForm.invalid) {
      touchAll(this.receiveForm);
      return;
    }

    const value = this.receiveForm.getRawValue();
    this.saving.set(true);
    this.operations
      .receiveExchange({
        exchangeType: value.exchangeType,
        customerId: value.customerId,
        branchId: value.branchId,
        locationId: null,
        metalId: value.metalId,
        declaredPurityId: value.declaredPurityId || null,
        originalItemId: null,
        description: value.description,
        itemCount: value.itemCount,
        notes: value.notes || null,
      })
      .subscribe({
        next: (exchange) => {
          this.saving.set(false);
          this.creating.set(false);
          this.toast.success('Old gold received', exchange.referenceNumber);
          this.page.set(0);
          this.load();
          this.view(exchange);
        },
        error: (error: AppError) => {
          this.saving.set(false);
          this.formError.set(error.message);
        },
      });
  }

  // ---------- steps ----------

  protected view(exchange: Exchange): void {
    this.viewing.set(exchange);
    this.loadPurities(exchange.metalId);
    this.operations.getExchange(exchange.id).subscribe({
      next: (fresh) => this.viewing.set(fresh),
      error: () => undefined,
    });
  }

  protected openStep(step: Step): void {
    const exchange = this.viewing();
    if (!exchange) {
      return;
    }
    this.weighForm.reset({ grossWeight: exchange.grossWeight, stoneWeight: exchange.stoneWeight });
    this.purityForm.reset({
      testedPurityId: exchange.declaredPurityId ?? '',
      testMethod: 'TOUCHSTONE',
    });
    this.valueForm.reset({ deductionPercentage: exchange.deductionPercentage, notes: '' });
    this.submitted.set(false);
    this.formError.set(null);
    this.step.set(step);
  }

  protected saveStep(): void {
    this.submitted.set(true);
    this.formError.set(null);

    const exchange = this.viewing();
    const step = this.step();
    if (!exchange || !step) {
      return;
    }

    if (step === 'weigh') {
      if (this.weighForm.invalid) {
        touchAll(this.weighForm);
        return;
      }
      const value = this.weighForm.getRawValue();
      this.commit(
        this.operations.weigh(exchange.id, value.grossWeight as number, value.stoneWeight),
        'Weighed',
      );
      return;
    }

    if (step === 'purity') {
      if (this.purityForm.invalid) {
        touchAll(this.purityForm);
        return;
      }
      const value = this.purityForm.getRawValue();
      this.commit(
        this.operations.testPurity(exchange.id, value.testedPurityId, value.testMethod || null),
        'Purity recorded',
      );
      return;
    }

    const value = this.valueForm.getRawValue();
    this.commit(
      this.operations.value(exchange.id, value.deductionPercentage, value.notes || null),
      'Valued',
    );
  }

  private commit(call: import('rxjs').Observable<Exchange>, title: string): void {
    this.saving.set(true);
    call.subscribe({
      next: (exchange) => {
        this.saving.set(false);
        this.step.set(null);
        this.viewing.set(exchange);
        this.toast.success(title, exchange.referenceNumber);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected approve(exchange: Exchange): void {
    this.run(this.operations.approveExchange(exchange.id), 'Approved', exchange);
  }

  protected async reject(exchange: Exchange): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Reject valuation',
      message: 'The offer is refused. The metal can then be returned to the customer.',
      detail: exchange.referenceNumber,
      confirmLabel: 'Reject',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.run(
      this.operations.rejectExchange(exchange.id, 'Rejected by approver'),
      'Rejected',
      exchange,
    );
  }

  protected complete(exchange: Exchange): void {
    this.run(this.operations.completeExchange(exchange.id, {}), 'Completed', exchange);
  }

  protected async returnToCustomer(exchange: Exchange): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Return to customer',
      message: 'The metal is handed back and the record is closed.',
      detail: exchange.referenceNumber,
      confirmLabel: 'Return',
    });
    if (!confirmed) {
      return;
    }
    this.run(this.operations.returnExchange(exchange.id), 'Returned to customer', exchange);
  }

  private run(call: import('rxjs').Observable<Exchange>, title: string, exchange: Exchange): void {
    this.saving.set(true);
    call.subscribe({
      next: (fresh) => {
        this.saving.set(false);
        this.viewing.set(fresh);
        this.toast.success(title, exchange.referenceNumber);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.toast.error('The step could not be completed', error.message);
      },
    });
  }

  /** Whether a given next status is one the backend permits from here. */
  protected can(exchange: Exchange, status: ExchangeStatus): boolean {
    return exchange.allowedTransitions.includes(status);
  }
}
