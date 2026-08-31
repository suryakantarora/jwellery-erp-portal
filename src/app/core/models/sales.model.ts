export const SALE_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_PAYMENT', label: 'Pending payment' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'PARTIALLY_RETURNED', label: 'Partially returned' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type SaleStatus = (typeof SALE_STATUSES)[number]['value'];

export const QUOTATION_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'CONVERTED', label: 'Converted' },
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number]['value'];

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'QR_PAYMENT', label: 'QR payment' },
  { value: 'GIFT_VOUCHER', label: 'Gift voucher' },
  { value: 'STORE_CREDIT', label: 'Store credit' },
  { value: 'EXCHANGE_CREDIT', label: 'Exchange credit' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export const PAYMENT_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CAPTURED', label: 'Captured' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]['value'];

export function paymentMethodLabel(method: string | null | undefined): string {
  return PAYMENT_METHODS.find((entry) => entry.value === method)?.label ?? method ?? '—';
}

/**
 * One piece on an invoice.
 *
 * The rate, weight and every component of the price are copied onto the line
 * when the sale is made — which is what stops tomorrow's gold rate changing
 * yesterday's invoice.
 */
export interface SaleLine {
  readonly id: string;
  readonly jewelleryItemId: string;
  readonly itemCode: string;
  readonly metalRateId: string | null;
  readonly metalRatePerUnit: number | null;
  readonly netMetalWeight: number | null;
  readonly metalValue: number | null;
  readonly wastageValue: number | null;
  readonly makingCharge: number | null;
  readonly stoneValue: number | null;
  readonly loyaltyTierCode: string | null;
  readonly tierDiscountAmount: number | null;
  readonly discountAmount: number | null;
  readonly taxAmount: number | null;
  readonly lineTotal: number | null;
  readonly returned: boolean;
}

export interface Sale {
  readonly id: string;
  readonly saleNumber: string;
  readonly invoiceNumber: string | null;
  readonly customerId: string;
  readonly branchId: string;
  readonly locationId: string | null;
  readonly quotationId: string | null;
  readonly status: SaleStatus;
  readonly saleDate: string;
  readonly currency: string | null;
  readonly subTotal: number | null;
  readonly discountTotal: number | null;
  readonly taxTotal: number | null;
  readonly exchangeCredit: number | null;
  readonly loyaltyPointsRedeemed: number;
  readonly loyaltyRedemptionValue: number | null;
  readonly totalAmount: number | null;
  readonly amountPayable: number | null;
  readonly paidAmount: number | null;
  readonly outstandingAmount: number | null;
  readonly refundedAmount: number | null;
  readonly salespersonId: string | null;
  readonly discountApprovedBy: string | null;
  readonly confirmedAt: string | null;
  readonly deliveredAt: string | null;
  readonly notes: string | null;
  readonly lines: SaleLine[];
  readonly createdAt: string;
  readonly createdBy: string | null;
}

export interface CreateSaleRequest {
  readonly customerId: string;
  readonly branchId: string;
  readonly locationId: string | null;
  readonly quotationId: string | null;
  readonly salespersonId: string | null;
  readonly exchangeCredit: number | null;
  readonly redeemPoints: number | null;
  readonly notes: string | null;
  readonly lines: ReadonlyArray<{
    readonly jewelleryItemId: string;
    readonly discountType: 'PERCENTAGE' | 'AMOUNT' | null;
    readonly discountValue: number | null;
  }>;
}

export interface SaleReturnRequest {
  readonly jewelleryItemIds: string[];
  readonly returnToLocationId: string;
  readonly reason: string;
}

export interface QuotationLine {
  readonly id: string;
  readonly jewelleryItemId: string;
  readonly itemCode: string;
  readonly metalValue: number | null;
  readonly wastageValue: number | null;
  readonly makingCharge: number | null;
  readonly stoneValue: number | null;
  readonly taxAmount: number | null;
  readonly lineTotal: number | null;
}

export interface Quotation {
  readonly id: string;
  readonly quotationNumber: string;
  readonly customerId: string;
  readonly branchId: string;
  readonly status: QuotationStatus;
  readonly quotationDate: string;
  readonly validUntil: string | null;
  readonly expired: boolean;
  readonly currency: string | null;
  readonly subTotal: number | null;
  readonly discountTotal: number | null;
  readonly taxTotal: number | null;
  readonly totalAmount: number | null;
  readonly convertedSaleId: string | null;
  readonly notes: string | null;
  readonly lines: QuotationLine[];
}

export interface QuotationRequest {
  readonly customerId: string;
  readonly branchId: string;
  readonly validForDays: number | null;
  readonly notes: string | null;
  readonly jewelleryItemIds: string[];
}

export interface Payment {
  readonly id: string;
  readonly paymentNumber: string;
  readonly saleId: string | null;
  readonly customerId: string | null;
  readonly branchId: string | null;
  readonly direction: 'INBOUND' | 'REFUND';
  readonly method: PaymentMethod;
  readonly status: PaymentStatus;
  readonly amount: number;
  readonly currency: string | null;
  readonly transactionReference: string | null;
  readonly cardLastFour: string | null;
  readonly bankName: string | null;
  readonly originalPaymentId: string | null;
  readonly capturedAt: string | null;
  readonly failureReason: string | null;
  readonly reconciled: boolean;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly createdBy: string | null;
}

export interface RecordPaymentRequest {
  readonly saleId: string;
  readonly method: PaymentMethod;
  readonly amount: number;
  readonly transactionReference: string | null;
  readonly cardLastFour: string | null;
  readonly bankName: string | null;
  readonly notes: string | null;
}

export interface RefundRequest {
  readonly originalPaymentId: string;
  readonly amount: number;
  readonly reason: string;
}

/** What a branch took in on a day, and how. */
export interface DailyClosing {
  readonly branchId: string;
  readonly date: string;
  readonly saleCount: number;
  readonly totalSales: number | null;
  readonly totalCollected: number | null;
  readonly byMethod: ReadonlyArray<{ readonly method: string; readonly amount: number }>;
}
