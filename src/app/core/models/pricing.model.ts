/** How a making charge is expressed. Mirrors `ChargeType.java`. */
export const CHARGE_TYPES = [
  { value: 'PER_GRAM', label: 'Per gram' },
  { value: 'PERCENTAGE_OF_METAL', label: 'Percentage of metal value' },
  { value: 'FLAT', label: 'Flat amount' },
] as const;

export type ChargeType = (typeof CHARGE_TYPES)[number]['value'];

export const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'AMOUNT', label: 'Amount' },
] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number]['value'];

export function chargeTypeLabel(type: string | null | undefined): string {
  return CHARGE_TYPES.find((entry) => entry.value === type)?.label ?? type ?? '—';
}

/**
 * One rule of any pricing kind.
 *
 * The backend returns making charges, tax rates and discount policies through a
 * single response shape, with the fields that do not apply left null; `chargeType`
 * says which kind a row actually is.
 */
export interface PricingRule {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  /** A `ChargeType`, or the marker `TAX` / `DISCOUNT_POLICY`. */
  readonly chargeType: string;
  readonly value: number | null;
  readonly wastagePercentage: number | null;
  readonly productId: string | null;
  readonly productTypeId: string | null;
  readonly metalId: string | null;
  readonly purityId: string | null;
  readonly branchId: string | null;
  readonly inclusive: boolean | null;
  readonly maxPercentageWithoutApproval: number | null;
  readonly maxPercentageWithApproval: number | null;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly priority: number | null;
  readonly active: boolean;
}

export interface MakingChargeRuleRequest {
  readonly code: string;
  readonly name: string;
  readonly productId: string | null;
  readonly productTypeId: string | null;
  readonly metalId: string | null;
  readonly purityId: string | null;
  readonly branchId: string | null;
  readonly chargeType: ChargeType;
  readonly chargeValue: number;
  readonly wastagePercentage: number | null;
  readonly minCharge: number | null;
  readonly maxCharge: number | null;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly priority: number;
}

export interface TaxRateRequest {
  readonly code: string;
  readonly name: string;
  readonly percentage: number;
  readonly branchId: string | null;
  readonly productTypeId: string | null;
  readonly inclusive: boolean;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
}

export interface DiscountPolicyRequest {
  readonly code: string;
  readonly name: string;
  readonly branchId: string | null;
  readonly maxPercentageWithoutApproval: number;
  readonly maxPercentageWithApproval: number;
  readonly appliesToMakingCharge: boolean;
  readonly appliesToMetalValue: boolean;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
}

export interface CalculatePriceRequest {
  readonly jewelleryItemId: string;
  readonly customerId: string | null;
  readonly branchId: string | null;
  readonly discountType: DiscountType | null;
  readonly discountValue: number | null;
  readonly discountApproved: boolean;
}

export interface TaxLine {
  readonly code: string;
  readonly name: string;
  readonly percentage: number;
  readonly amount: number;
  readonly inclusive: boolean;
}

/**
 * A priced item, line by line.
 *
 * The server computes this, never the browser: the same calculation settles a
 * real sale, and a price quoted here must be the price charged.
 */
export interface PriceBreakdown {
  readonly jewelleryItemId: string;
  readonly itemCode: string;
  readonly metalRateId: string | null;
  readonly metalRatePerUnit: number | null;
  readonly netMetalWeight: number | null;
  readonly metalValue: number | null;
  readonly wastagePercentage: number | null;
  readonly wastageWeight: number | null;
  readonly wastageValue: number | null;
  readonly makingChargeRuleCode: string | null;
  readonly makingChargeType: string | null;
  readonly makingChargeValue: number | null;
  readonly makingCharge: number | null;
  readonly stoneValue: number | null;
  readonly subTotal: number | null;
  readonly taxes: TaxLine[];
  readonly taxTotal: number | null;
  readonly loyaltyTierCode: string | null;
  readonly tierDiscountPercentage: number | null;
  readonly tierDiscountAmount: number | null;
  readonly manualDiscountAmount: number | null;
  readonly discountAmount: number | null;
  readonly finalPrice: number | null;
  readonly currency: string | null;
  /** True when the requested discount exceeds what staff may give unaided. */
  readonly discountRequiresApproval: boolean;
}
