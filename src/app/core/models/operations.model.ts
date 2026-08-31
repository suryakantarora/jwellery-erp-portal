// Models for the three counter-facing workflows: old-gold exchange, repairs
// and physical stock control. Each is a state machine the backend owns, and each
// returns its permitted next states so the UI never offers an illegal step.

export const EXCHANGE_TYPES = [
  { value: 'EXCHANGE', label: 'Exchange' },
  { value: 'BUYBACK', label: 'Buyback' },
] as const;

export type ExchangeType = (typeof EXCHANGE_TYPES)[number]['value'];

export const EXCHANGE_STATUSES = [
  { value: 'RECEIVED', label: 'Received' },
  { value: 'WEIGHED', label: 'Weighed' },
  { value: 'PURITY_TESTED', label: 'Purity tested' },
  { value: 'VALUED', label: 'Valued' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'RETURNED_TO_CUSTOMER', label: 'Returned to customer' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type ExchangeStatus = (typeof EXCHANGE_STATUSES)[number]['value'];

export function exchangeStatusLabel(status: string | null | undefined): string {
  return EXCHANGE_STATUSES.find((entry) => entry.value === status)?.label ?? status ?? '—';
}

/**
 * Old gold taken in from a customer.
 *
 * The value is built up step by step — weighed, purity tested, then valued at
 * the buying rate less a deduction — so what the customer is offered can always
 * be explained.
 */
export interface Exchange {
  readonly id: string;
  readonly referenceNumber: string;
  readonly exchangeType: ExchangeType;
  readonly status: ExchangeStatus;
  readonly allowedTransitions: ExchangeStatus[];
  readonly customerId: string;
  readonly branchId: string;
  readonly locationId: string | null;
  readonly receivedDate: string;
  readonly description: string;
  readonly itemCount: number;
  readonly originalItemId: string | null;
  readonly metalId: string;
  readonly grossWeight: number | null;
  readonly stoneWeight: number | null;
  readonly netWeight: number | null;
  readonly weighedBy: string | null;
  readonly declaredPurityId: string | null;
  readonly testedPurityId: string | null;
  readonly testedFineness: number | null;
  readonly testMethod: string | null;
  readonly testedBy: string | null;
  readonly rateId: string | null;
  readonly ratePerUnit: number | null;
  readonly pureWeight: number | null;
  readonly grossValuation: number | null;
  readonly deductionPercentage: number | null;
  readonly deductionAmount: number | null;
  readonly netValuation: number | null;
  readonly currency: string | null;
  readonly valuedBy: string | null;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly rejectionReason: string | null;
  readonly appliedSaleId: string | null;
  readonly scrapBatchId: string | null;
  readonly completedAt: string | null;
  readonly notes: string | null;
}

export interface ExchangeReceiveRequest {
  readonly exchangeType: ExchangeType;
  readonly customerId: string;
  readonly branchId: string;
  readonly locationId: string | null;
  readonly metalId: string;
  readonly declaredPurityId: string | null;
  readonly originalItemId: string | null;
  readonly description: string;
  readonly itemCount: number;
  readonly notes: string | null;
}

// ---------- repairs ----------

export const REPAIR_STATUSES = [
  { value: 'RECEIVED', label: 'Received' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'ESTIMATION', label: 'Estimation' },
  { value: 'APPROVAL_PENDING', label: 'Awaiting customer' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'QUALITY_CHECK', label: 'Quality check' },
  { value: 'READY', label: 'Ready' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number]['value'];

export function repairStatusLabel(status: string | null | undefined): string {
  return REPAIR_STATUSES.find((entry) => entry.value === status)?.label ?? status ?? '—';
}

export interface RepairHistoryEntry {
  readonly fromStatus: RepairStatus | null;
  readonly toStatus: RepairStatus;
  readonly performedBy: string | null;
  readonly notes: string | null;
  readonly occurredAt: string;
}

/** A job card: a customer's piece in the workshop. */
export interface Repair {
  readonly id: string;
  readonly requestNumber: string;
  readonly customerId: string;
  readonly branchId: string;
  readonly jewelleryItemId: string | null;
  readonly itemDescription: string;
  readonly status: RepairStatus;
  readonly allowedTransitions: RepairStatus[];
  readonly receivedDate: string;
  readonly promisedDate: string | null;
  readonly reportedProblem: string;
  readonly conditionOnArrival: string | null;
  readonly receivedWeight: number | null;
  /** Comma-separated storage keys for the photographs taken on arrival. */
  readonly conditionPhotoKeys: string | null;
  readonly estimatedCost: number | null;
  readonly estimatedDays: number | null;
  readonly estimateNotes: string | null;
  readonly customerApproved: boolean;
  readonly customerResponseAt: string | null;
  readonly declineReason: string | null;
  readonly assignedTo: string | null;
  readonly finalCost: number | null;
  readonly currency: string | null;
  readonly deliveredWeight: number | null;
  readonly readyAt: string | null;
  readonly deliveredAt: string | null;
  readonly deliveredTo: string | null;
  readonly notes: string | null;
  readonly history: RepairHistoryEntry[] | null;
}

export interface RepairReceiveRequest {
  readonly customerId: string;
  readonly branchId: string;
  readonly jewelleryItemId: string | null;
  readonly itemDescription: string;
  readonly reportedProblem: string;
  readonly conditionOnArrival: string | null;
  readonly receivedWeight: number | null;
  readonly conditionPhotoKeys: string | null;
  readonly promisedDate: string | null;
  readonly notes: string | null;
}

// ---------- stock counts ----------

export const BIN_TYPES = [
  { value: 'ZONE', label: 'Zone' },
  { value: 'SHELF', label: 'Shelf' },
  { value: 'TRAY', label: 'Tray' },
  { value: 'BIN', label: 'Bin' },
  { value: 'SAFE', label: 'Safe' },
] as const;

export type BinType = (typeof BIN_TYPES)[number]['value'];

export const STOCK_COUNT_STATUSES = [
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type StockCountStatus = (typeof STOCK_COUNT_STATUSES)[number]['value'];

export interface Bin {
  readonly id: string;
  readonly locationId: string;
  readonly parentId: string | null;
  readonly code: string;
  readonly name: string;
  readonly binType: BinType;
  readonly capacity: number | null;
  readonly description: string | null;
  readonly active: boolean;
}

export interface BinRequest {
  readonly locationId: string;
  readonly parentId: string | null;
  readonly code: string;
  readonly name: string;
  readonly binType: BinType;
  readonly capacity: number | null;
  readonly description: string | null;
}

export interface StockCountLine {
  readonly id: string;
  readonly jewelleryItemId: string;
  readonly itemCode: string;
  readonly expected: boolean;
  readonly counted: boolean;
  readonly missing: boolean;
  readonly unexpected: boolean;
  readonly binId: string | null;
  readonly varianceNote: string | null;
}

/**
 * A physical count of a location.
 *
 * The system knows what should be there; the operator scans what actually is.
 * The difference is the variance, and it needs approval before stock moves.
 */
export interface StockCount {
  readonly id: string;
  readonly referenceNumber: string;
  readonly locationId: string;
  readonly branchId: string;
  readonly status: StockCountStatus;
  readonly countDate: string;
  readonly dualAuthorization: boolean;
  readonly expectedCount: number;
  readonly countedCount: number;
  readonly missingCount: number;
  readonly unexpectedCount: number;
  readonly hasVariance: boolean;
  readonly countedBy: string | null;
  readonly countedAt: string | null;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly secondApprovedBy: string | null;
  readonly secondApprovedAt: string | null;
  readonly closedAt: string | null;
  readonly notes: string | null;
  readonly lines: StockCountLine[] | null;
}
