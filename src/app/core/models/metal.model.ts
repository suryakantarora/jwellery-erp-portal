/** Which side of the counter a published rate applies to. */
export const RATE_TYPES = [
  { value: 'SELLING', label: 'Selling' },
  { value: 'BUYING', label: 'Buying' },
  { value: 'EXCHANGE', label: 'Exchange' },
] as const;

export type RateType = (typeof RATE_TYPES)[number]['value'];

export interface Metal {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly symbol: string | null;
  readonly weightUnit: string | null;
  readonly description: string | null;
  readonly active: boolean;
}

export interface MetalRequest {
  readonly code: string;
  readonly name: string;
  readonly symbol: string | null;
  readonly weightUnit: string | null;
  readonly description: string | null;
}

export interface Purity {
  readonly id: string;
  readonly metalId: string;
  readonly code: string;
  readonly name: string;
  /** Fraction of pure metal, 0–1. 22K gold is 0.9167. */
  readonly fineness: number;
  readonly displayOrder: number | null;
  readonly active: boolean;
}

export interface PurityRequest {
  readonly metalId: string;
  readonly code: string;
  readonly name: string;
  readonly fineness: number;
  readonly displayOrder: number | null;
}

/**
 * A published rate.
 *
 * Rates are append-only: correcting one means publishing another for the same
 * day, so the history of what was quoted stays intact.
 */
export interface MetalRate {
  readonly id: string;
  readonly metalId: string;
  readonly metalCode: string;
  readonly purityId: string;
  readonly purityCode: string;
  readonly rateType: RateType;
  readonly effectiveDate: string;
  readonly ratePerUnit: number;
  readonly currency: string | null;
  readonly branchId: string | null;
  readonly publishedAt: string;
  readonly publishedBy: string | null;
  readonly notes: string | null;
}

export interface PublishRateRequest {
  readonly metalId: string;
  readonly purityId: string;
  readonly rateType: RateType;
  readonly effectiveDate: string;
  readonly ratePerUnit: number;
  readonly currency: string | null;
  readonly branchId: string | null;
  readonly notes: string | null;
}
