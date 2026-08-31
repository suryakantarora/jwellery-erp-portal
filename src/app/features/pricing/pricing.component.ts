import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Permission } from '../../core/auth/permissions';
import { AppError } from '../../core/models/api.model';
import { MasterRecord, Product } from '../../core/models/catalogue.model';
import { Metal, Purity } from '../../core/models/metal.model';
import { Branch } from '../../core/models/organization.model';
import {
  CHARGE_TYPES,
  ChargeType,
  DiscountPolicyRequest,
  MakingChargeRuleRequest,
  PricingRule,
  TaxRateRequest,
  chargeTypeLabel,
} from '../../core/models/pricing.model';
import { ConfirmService } from '../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
} from '../../shared/components/data-table/data-table.model';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../shared/components/master-panel/master-panel.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../shared/utilities/form.utils';
import { localPage } from '../../shared/utilities/list.utils';
import { CatalogueService } from '../products/catalogue.service';
import { MetalService } from '../products/metal.service';
import { OrganizationService } from '../organization/organization.service';
import { PriceCalculatorComponent } from './price-calculator/price-calculator.component';
import { PricingService } from './pricing.service';

type Tab = 'calculator' | 'making' | 'tax' | 'discount';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The pricing engine's administration surface.
 *
 * Every figure that decides a price — making charge, wastage, tax, the discount
 * a salesperson may give unaided — is configured here rather than compiled into
 * the app, and the calculator on the first tab prices a real item through the
 * same server-side engine a sale uses.
 */
@Component({
  selector: 'app-pricing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    MasterPanelComponent,
    FormFieldComponent,
    StatusBadgeComponent,
    PriceCalculatorComponent,
  ],
  templateUrl: './pricing.component.html',
  styles: `
    .scope {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .rate-note {
      margin-top: var(--space-3);
      font-size: var(--text-sm);
    }
  `,
})
export class PricingComponent {
  private readonly pricing = inject(PricingService);
  private readonly catalogue = inject(CatalogueService);
  private readonly metalApi = inject(MetalService);
  private readonly organization = inject(OrganizationService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canChange = computed(() => this.auth.hasPermission(Permission.PRICE_CHANGE));
  protected readonly chargeTypes = CHARGE_TYPES;
  protected readonly chargeLabel = chargeTypeLabel;

  protected readonly tab = signal<Tab>('calculator');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'calculator', label: 'Calculator' },
    { id: 'making', label: 'Making charges & wastage' },
    { id: 'tax', label: 'Tax rates' },
    { id: 'discount', label: 'Discount policy' },
  ];

  protected readonly products = signal<readonly Product[]>([]);
  protected readonly productTypes = signal<readonly MasterRecord[]>([]);
  protected readonly metals = signal<readonly Metal[]>([]);
  protected readonly purities = signal<readonly Purity[]>([]);
  protected readonly branches = signal<readonly Branch[]>([]);

  private readonly rules = signal<readonly PricingRule[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'code', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly activeTpl =
    viewChild.required<TemplateRef<CellTemplateContext<PricingRule>>>('activeCell');
  private readonly scopeTpl =
    viewChild.required<TemplateRef<CellTemplateContext<PricingRule>>>('scopeCell');
  private readonly periodTpl =
    viewChild.required<TemplateRef<CellTemplateContext<PricingRule>>>('periodCell');
  private readonly actionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<PricingRule>>>('actionsCell');

  protected readonly templates = computed(() => ({
    active: this.activeTpl(),
    branchId: this.scopeTpl(),
    effectiveFrom: this.periodTpl(),
    actions: this.actionsTpl(),
  }));

  protected readonly makingForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    productId: [''],
    productTypeId: [''],
    metalId: [''],
    purityId: [''],
    branchId: [''],
    chargeType: ['PER_GRAM' as ChargeType, [Validators.required]],
    chargeValue: [null as number | null, [Validators.required, Validators.min(0)]],
    wastagePercentage: [null as number | null, [Validators.min(0)]],
    minCharge: [null as number | null, [Validators.min(0)]],
    maxCharge: [null as number | null, [Validators.min(0)]],
    effectiveFrom: [today(), [Validators.required]],
    effectiveTo: [''],
    priority: [0, [Validators.required]],
  });

  protected readonly taxForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    percentage: [null as number | null, [Validators.required, Validators.min(0)]],
    branchId: [''],
    productTypeId: [''],
    inclusive: [false],
    effectiveFrom: [today(), [Validators.required]],
    effectiveTo: [''],
  });

  protected readonly discountForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    branchId: [''],
    maxPercentageWithoutApproval: [null as number | null, [Validators.required, Validators.min(0)]],
    maxPercentageWithApproval: [null as number | null, [Validators.required, Validators.min(0)]],
    appliesToMakingCharge: [true],
    appliesToMetalValue: [false],
    effectiveFrom: [today(), [Validators.required]],
    effectiveTo: [''],
  });

  protected readonly makingColumns: readonly TableColumn<PricingRule>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Rule', sortable: true, value: (row) => row.name },
    {
      key: 'chargeType',
      header: 'Charge',
      width: '190px',
      value: (row) => chargeTypeLabel(row.chargeType),
    },
    {
      key: 'value',
      header: 'Value',
      numeric: true,
      align: 'end',
      width: '110px',
      value: (row) => row.value,
    },
    {
      key: 'wastagePercentage',
      header: 'Wastage %',
      numeric: true,
      align: 'end',
      width: '120px',
      value: (row) => row.wastagePercentage,
    },
    { key: 'branchId', header: 'Applies to' },
    { key: 'effectiveFrom', header: 'Effective', width: '180px' },
    {
      key: 'priority',
      header: 'Priority',
      numeric: true,
      align: 'end',
      width: '100px',
      sortable: true,
      value: (row) => row.priority,
    },
    { key: 'active', header: 'Status', width: '110px' },
    { key: 'actions', header: '', width: '130px', align: 'end' },
  ];

  protected readonly taxColumns: readonly TableColumn<PricingRule>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Tax', sortable: true, value: (row) => row.name },
    {
      key: 'value',
      header: 'Percentage',
      numeric: true,
      align: 'end',
      width: '130px',
      value: (row) => row.value,
    },
    {
      key: 'inclusive',
      header: 'Inclusive',
      align: 'center',
      width: '120px',
      value: (row) => (row.inclusive ? 'Yes' : 'No'),
    },
    { key: 'branchId', header: 'Applies to' },
    { key: 'effectiveFrom', header: 'Effective', width: '180px' },
    { key: 'active', header: 'Status', width: '110px' },
    { key: 'actions', header: '', width: '130px', align: 'end' },
  ];

  protected readonly discountColumns: readonly TableColumn<PricingRule>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Policy', sortable: true, value: (row) => row.name },
    {
      key: 'maxPercentageWithoutApproval',
      header: 'Unaided %',
      numeric: true,
      align: 'end',
      width: '130px',
      value: (row) => row.maxPercentageWithoutApproval,
    },
    {
      key: 'maxPercentageWithApproval',
      header: 'With approval %',
      numeric: true,
      align: 'end',
      width: '160px',
      value: (row) => row.maxPercentageWithApproval,
    },
    { key: 'branchId', header: 'Applies to' },
    { key: 'effectiveFrom', header: 'Effective', width: '180px' },
    { key: 'active', header: 'Status', width: '110px' },
  ];

  protected readonly columns = computed<readonly TableColumn<PricingRule>[]>(() => {
    if (this.tab() === 'tax') {
      return this.taxColumns;
    }
    if (this.tab() === 'discount') {
      return this.discountColumns;
    }
    return this.makingColumns;
  });

  protected readonly result = computed(() =>
    localPage(this.rules(), {
      search: this.search(),
      searchFields: [(row) => row.code, (row) => row.name],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  protected readonly createLabel = computed(
    () =>
      ({
        making: 'New making-charge rule',
        tax: 'New tax rate',
        discount: 'New discount policy',
        calculator: '',
      })[this.tab()],
  );

  protected readonly formId = computed(
    () =>
      ({ making: 'making-form', tax: 'tax-form', discount: 'discount-form', calculator: '' })[
        this.tab()
      ],
  );

  protected readonly trackById = (row: PricingRule) => row.id;

  constructor() {
    this.catalogue
      .searchProducts({ size: 200, sort: 'sku,asc' })
      .subscribe({ next: (page) => this.products.set(page.content) });
    this.catalogue.listProductTypes().subscribe({ next: (r) => this.productTypes.set(r) });
    this.metalApi.listMetals().subscribe({ next: (r) => this.metals.set(r) });
    this.organization.listAllBranches().subscribe({ next: (r) => this.branches.set(r) });
  }

  protected branchName(id: string | null): string {
    if (!id) {
      return 'All branches';
    }
    return this.branches().find((branch) => branch.id === id)?.name ?? '—';
  }

  protected scopeOf(rule: PricingRule): string {
    const parts: string[] = [];
    if (rule.productId) {
      const product = this.products().find((entry) => entry.id === rule.productId);
      parts.push(product ? product.sku : 'a product');
    }
    if (rule.productTypeId) {
      parts.push(
        this.productTypes().find((entry) => entry.id === rule.productTypeId)?.name ?? 'a type',
      );
    }
    if (rule.metalId) {
      parts.push(this.metals().find((entry) => entry.id === rule.metalId)?.name ?? 'a metal');
    }
    parts.push(this.branchName(rule.branchId));
    return parts.join(' · ');
  }

  protected load(): void {
    const tab = this.tab();
    if (tab === 'calculator') {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const call: Observable<PricingRule[]> =
      tab === 'tax'
        ? this.pricing.listTaxRates()
        : tab === 'discount'
          ? this.pricing.listDiscountPolicies()
          : this.pricing.listMakingChargeRules();

    call.subscribe({
      next: (rules) => {
        this.rules.set(rules);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.rules.set([]);
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
    this.rules.set([]);
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

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
  }

  protected onMetalChange(event: Event): void {
    const metalId = (event.target as HTMLSelectElement).value;
    this.makingForm.patchValue({ purityId: '' });
    if (!metalId) {
      this.purities.set([]);
      return;
    }
    this.metalApi.listPurities(metalId).subscribe({
      next: (purities) => this.purities.set(purities),
      error: () => this.purities.set([]),
    });
  }

  protected startCreate(): void {
    for (const form of [this.makingForm, this.taxForm, this.discountForm]) {
      form.reset();
    }
    this.makingForm.patchValue({ chargeType: 'PER_GRAM', effectiveFrom: today(), priority: 0 });
    this.taxForm.patchValue({ effectiveFrom: today(), inclusive: false });
    this.discountForm.patchValue({
      effectiveFrom: today(),
      appliesToMakingCharge: true,
      appliesToMetalValue: false,
    });
    this.purities.set([]);
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

    const tab = this.tab();
    if (tab === 'making') {
      if (this.makingForm.invalid) {
        touchAll(this.makingForm);
        return;
      }
      const request = nullifyBlanks(
        this.makingForm.getRawValue(),
      ) as unknown as MakingChargeRuleRequest;
      this.commit(this.pricing.createMakingChargeRule(request), 'Making-charge rule created');
      return;
    }

    if (tab === 'tax') {
      if (this.taxForm.invalid) {
        touchAll(this.taxForm);
        return;
      }
      const request = nullifyBlanks(this.taxForm.getRawValue()) as unknown as TaxRateRequest;
      this.commit(this.pricing.createTaxRate(request), 'Tax rate created');
      return;
    }

    if (this.discountForm.invalid) {
      touchAll(this.discountForm);
      return;
    }
    const request = nullifyBlanks(
      this.discountForm.getRawValue(),
    ) as unknown as DiscountPolicyRequest;
    this.commit(this.pricing.createDiscountPolicy(request), 'Discount policy created');
  }

  private commit(call: Observable<PricingRule>, successTitle: string): void {
    this.saving.set(true);
    call.subscribe({
      next: (rule) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success(successTitle, `${rule.code} — ${rule.name}`);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const form =
          this.tab() === 'tax'
            ? this.taxForm
            : this.tab() === 'discount'
              ? this.discountForm
              : this.makingForm;
        const unmatched = applyServerErrors(form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }

  protected async deactivate(rule: PricingRule): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Deactivate rule',
      message:
        'The rule stops applying to new pricing. Prices already captured on a sale are unaffected.',
      detail: `${rule.code} — ${rule.name}`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    const call =
      this.tab() === 'tax'
        ? this.pricing.deactivateTaxRate(rule.id)
        : this.pricing.deactivateMakingChargeRule(rule.id);

    call.subscribe({
      next: () => {
        this.toast.success('Rule deactivated', rule.code);
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not deactivate the rule', error.message),
    });
  }
}
