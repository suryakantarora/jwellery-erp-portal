export const LOYALTY_TRANSACTION_TYPES = [
  { value: 'EARN', label: 'Earned' },
  { value: 'REDEEM', label: 'Redeemed' },
  { value: 'REVERSAL', label: 'Reversed' },
  { value: 'EXPIRY', label: 'Expired' },
  { value: 'ADJUSTMENT', label: 'Adjusted' },
] as const;

export type LoyaltyTransactionType = (typeof LOYALTY_TRANSACTION_TYPES)[number]['value'];

export function transactionLabel(type: string | null | undefined): string {
  return LOYALTY_TRANSACTION_TYPES.find((entry) => entry.value === type)?.label ?? type ?? '—';
}

/** A tier within a programme; reaching `minimumPoints` earns its benefits. */
export interface LoyaltyTier {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly minimumPoints: number;
  /** Multiplies what a purchase earns; 1.0 is the base rate. */
  readonly earnMultiplier: number;
  readonly discountPercentage: number | null;
  readonly benefits: string | null;
}

export interface LoyaltyTierRequest {
  readonly code: string;
  readonly name: string;
  readonly minimumPoints: number;
  readonly earnMultiplier: number;
  readonly discountPercentage: number | null;
  readonly displayOrder: number | null;
  readonly benefits: string | null;
}

export interface LoyaltyProgram {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly companyId: string | null;
  readonly pointsPerCurrencyUnit: number;
  readonly currencyValuePerPoint: number;
  readonly pointsValidityMonths: number | null;
  readonly minimumRedeemablePoints: number | null;
  readonly earnOnMakingChargeOnly: boolean;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly active: boolean;
  readonly tiers: LoyaltyTier[];
}

export interface LoyaltyProgramRequest {
  readonly code: string;
  readonly name: string;
  readonly companyId: string | null;
  readonly pointsPerCurrencyUnit: number;
  readonly currencyValuePerPoint: number;
  readonly pointsValidityMonths: number | null;
  readonly minimumRedeemablePoints: number | null;
  readonly earnOnMakingChargeOnly: boolean;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly tiers: LoyaltyTierRequest[];
}

/** A customer's standing in a programme. */
export interface LoyaltyAccount {
  readonly id: string;
  readonly customerId: string;
  readonly programId: string;
  readonly programCode: string;
  readonly tierCode: string | null;
  readonly tierName: string | null;
  readonly pointsBalance: number;
  readonly lifetimePoints: number;
  readonly pointsRedeemed: number;
  readonly pointsExpired: number;
  readonly redeemableValue: number | null;
  readonly enrolledAt: string;
  readonly lastActivityAt: string | null;
  readonly active: boolean;
}

/**
 * One movement of points.
 *
 * The ledger is append-only — points are never edited, only earned, redeemed,
 * reversed, expired or adjusted with a reason — so a balance can always be
 * explained by the rows that produced it.
 */
export interface LoyaltyTransaction {
  readonly id: string;
  readonly customerId: string;
  readonly type: LoyaltyTransactionType;
  readonly points: number;
  readonly balanceAfter: number;
  readonly monetaryValue: number | null;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly expiresOn: string | null;
  readonly expired: boolean;
  readonly reason: string | null;
  readonly occurredAt: string;
}

export interface RedeemRequest {
  readonly customerId: string;
  readonly points: number;
  readonly saleId: string | null;
  readonly branchId: string | null;
  readonly reason: string | null;
}

export interface AdjustRequest {
  readonly customerId: string;
  readonly points: number;
  readonly reason: string;
}
