import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../core/models/api.model';
import { JewelleryItem } from '../../../core/models/inventory.model';
import { Branch } from '../../../core/models/organization.model';
import { DISCOUNT_TYPES, DiscountType, PriceBreakdown } from '../../../core/models/pricing.model';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { InventoryService } from '../../inventory/inventory.service';
import { OrganizationService } from '../../organization/organization.service';
import { PricingService } from '../pricing.service';

/**
 * Prices a real item through the server-side engine and shows the working.
 *
 * The breakdown is deliberately the whole calculation rather than a total: a
 * manager checking why a piece costs what it does needs to see the metal value,
 * the wastage, the making charge, each tax line and every discount separately.
 */
@Component({
  selector: 'app-price-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    FormFieldComponent,
    SpinnerComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './price-calculator.component.html',
  styleUrl: './price-calculator.component.scss',
})
export class PriceCalculatorComponent {
  private readonly pricing = inject(PricingService);
  private readonly inventory = inject(InventoryService);
  private readonly organization = inject(OrganizationService);
  private readonly branchContext = inject(BranchContextService);
  private readonly fb = inject(FormBuilder);

  protected readonly discountTypes = DISCOUNT_TYPES;

  protected readonly items = signal<readonly JewelleryItem[]>([]);
  protected readonly branches = signal<readonly Branch[]>([]);

  protected readonly breakdown = signal<PriceBreakdown | null>(null);
  protected readonly calculating = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    jewelleryItemId: ['', [Validators.required]],
    branchId: [''],
    customerId: [''],
    discountType: ['' as DiscountType | ''],
    discountValue: [null as number | null, [Validators.min(0)]],
    discountApproved: [false],
  });

  /**
   * Whether the failure was the branch's discount limit rather than a real
   * fault — the backend refuses an over-limit discount outright, and the way
   * forward is a manager's approval, not a different number.
   */
  protected readonly needsApproval = computed(() => {
    const failure = this.error();
    return !!failure && /requires approval/i.test(failure.message);
  });

  /** Taxes the customer pays on top, as opposed to those already in the price. */
  protected readonly addedTaxes = computed(() =>
    (this.breakdown()?.taxes ?? []).filter((tax) => !tax.inclusive),
  );

  protected readonly inclusiveTaxes = computed(() =>
    (this.breakdown()?.taxes ?? []).filter((tax) => tax.inclusive),
  );

  constructor() {
    this.inventory
      .searchItems({ size: 200, sort: 'itemCode,asc' })
      .subscribe({ next: (page) => this.items.set(page.content) });
    this.organization.listAllBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.form.patchValue({ branchId: this.branchContext.activeBranchId() ?? '' });
      },
    });
  }

  protected itemLabel(item: JewelleryItem): string {
    return `${item.itemCode} · ${item.grossWeight} g`;
  }

  protected calculate(): void {
    this.submitted.set(true);
    this.error.set(null);

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    this.calculating.set(true);
    this.pricing
      .calculate({
        jewelleryItemId: value.jewelleryItemId,
        branchId: value.branchId || null,
        customerId: value.customerId || null,
        discountType: value.discountType || null,
        discountValue: value.discountValue,
        discountApproved: value.discountApproved,
      })
      .subscribe({
        next: (breakdown) => {
          this.breakdown.set(breakdown);
          this.calculating.set(false);
        },
        error: (error: AppError) => {
          this.breakdown.set(null);
          this.error.set(error);
          this.calculating.set(false);
        },
      });
  }
}
