import { ItemStone, StoneSettingType, StoneShape } from './gemstone.model';

/**
 * Lifecycle state of a physical piece.
 *
 * The backend owns the transition rules and returns the permitted next states
 * on every item, so the UI never has to keep its own copy of the state machine.
 */
export const ITEM_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'UNDER_REPAIR', label: 'Under repair' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'EXCHANGED', label: 'Exchanged' },
  { value: 'BUYBACK', label: 'Buyback' },
  { value: 'SCRAPPED', label: 'Scrapped' },
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number]['value'];

export function itemStatusLabel(status: ItemStatus | string | null | undefined): string {
  return ITEM_STATUSES.find((entry) => entry.value === status)?.label ?? '—';
}

/** One physical piece. Never a SKU with a quantity. */
export interface JewelleryItem {
  readonly id: string;
  readonly itemCode: string;
  readonly productId: string;
  readonly designId: string | null;
  readonly metalId: string | null;
  readonly purityId: string | null;
  readonly grossWeight: number;
  /** Derived by the backend: gross weight less the stones set on the piece. */
  readonly netMetalWeight: number | null;
  readonly stoneWeight: number | null;
  readonly stoneCount: number;
  readonly totalCarat: number | null;
  readonly sizeId: string | null;
  readonly rfidTag: string | null;
  readonly qrCode: string | null;
  readonly barcode: string | null;
  readonly hallmarkNumber: string | null;
  readonly purchaseCost: number | null;
  readonly makingCost: number | null;
  readonly stoneCost: number | null;
  readonly totalCost: number | null;
  readonly currentPrice: number | null;
  readonly currency: string | null;
  readonly status: ItemStatus;
  /** Statuses this item may move to next, as the backend permits them. */
  readonly allowedTransitions: ItemStatus[];
  readonly currentLocationId: string | null;
  readonly currentBranchId: string | null;
  readonly reservedForCustomerId: string | null;
  readonly reservedUntil: string | null;
  readonly supplierId: string | null;
  readonly receivedDate: string | null;
  readonly soldDate: string | null;
  readonly ownerCustomerId: string | null;
  readonly qualityChecked: boolean;
  readonly notes: string | null;
  readonly version: number;
}

/** A stone as supplied when creating or updating an item. */
export interface StoneSpec {
  readonly gemstoneId: string;
  readonly certificateId?: string | null;
  readonly stoneCount: number;
  readonly caratWeight: number;
  readonly shape?: StoneShape | null;
  readonly cut?: string | null;
  readonly colour?: string | null;
  readonly clarity?: string | null;
  readonly settingType?: StoneSettingType | null;
  readonly ratePerCarat?: number | null;
  readonly stoneValue?: number | null;
  readonly weightGrams?: number | null;
  readonly notes?: string | null;
}

export interface CreateItemRequest {
  readonly itemCode: string | null;
  readonly productId: string;
  readonly metalId: string | null;
  readonly purityId: string | null;
  readonly grossWeight: number;
  readonly sizeId: string | null;
  readonly rfidTag: string | null;
  readonly qrCode: string | null;
  readonly barcode: string | null;
  readonly hallmarkNumber: string | null;
  readonly purchaseCost: number | null;
  readonly makingCost: number | null;
  readonly stoneCost: number | null;
  readonly supplierId: string | null;
  readonly receivedDate: string | null;
  readonly locationId: string;
  readonly notes: string | null;
  readonly stones: StoneSpec[];
}

export interface UpdateItemRequest {
  readonly grossWeight: number;
  readonly sizeId: string | null;
  readonly hallmarkNumber: string | null;
  readonly purchaseCost: number | null;
  readonly makingCost: number | null;
  readonly stoneCost: number | null;
  readonly notes: string | null;
  readonly stones: StoneSpec[];
}

export interface TagItemRequest {
  readonly rfidTag: string | null;
  readonly qrCode: string | null;
  readonly barcode: string | null;
}

export interface ReserveItemRequest {
  readonly jewelleryItemId: string;
  readonly customerId: string;
  readonly holdHours: number | null;
  readonly notes: string | null;
}

export interface ChangeStatusRequest {
  readonly targetStatus: ItemStatus;
  readonly reason: string;
}

/** One entry in an item's passport history. */
export interface LifecycleEvent {
  readonly id: string;
  readonly eventType: string;
  readonly fromStatus: string | null;
  readonly toStatus: string | null;
  readonly fromLocationId: string | null;
  readonly toLocationId: string | null;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly performedBy: string | null;
  readonly notes: string | null;
  readonly occurredAt: string;
}

/** The digital jewellery passport: the item, its stones and its whole history. */
export interface ItemPassport {
  readonly item: JewelleryItem;
  readonly stones: ItemStone[];
  readonly history: LifecycleEvent[];
}

// ---------- movements ----------

export const MOVEMENT_TYPES = [
  { value: 'GOODS_RECEIPT', label: 'Goods receipt' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'ISSUE', label: 'Issue' },
  { value: 'RETURN', label: 'Return' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'SALE_DELIVERY', label: 'Sale delivery' },
  { value: 'SALE_RETURN', label: 'Sale return' },
  { value: 'REPAIR_OUT', label: 'Repair out' },
  { value: 'REPAIR_IN', label: 'Repair in' },
  { value: 'SCRAP', label: 'Scrap' },
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number]['value'];

export const MOVEMENT_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type MovementStatus = (typeof MOVEMENT_STATUSES)[number]['value'];

export function movementTypeLabel(type: string | null | undefined): string {
  return MOVEMENT_TYPES.find((entry) => entry.value === type)?.label ?? '—';
}

export interface MovementLine {
  readonly id: string;
  readonly jewelleryItemId: string;
  readonly itemCode: string;
  readonly dispatchedWeight: number | null;
  readonly receivedWeight: number | null;
  readonly received: boolean;
  readonly discrepancyNote: string | null;
}

/**
 * A stock movement.
 *
 * An item's location only changes when the movement completes; between
 * dispatch and receipt the item sits in `IN_TRANSIT`, which is why in-transit
 * stock is visible as its own state rather than being unaccounted for.
 */
export interface Movement {
  readonly id: string;
  readonly referenceNumber: string;
  readonly movementType: MovementType;
  readonly status: MovementStatus;
  readonly fromLocationId: string | null;
  readonly toLocationId: string;
  readonly fromBranchId: string | null;
  readonly toBranchId: string | null;
  readonly requiresApproval: boolean;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly secondApprovedBy: string | null;
  readonly secondApprovedAt: string | null;
  readonly dispatchedBy: string | null;
  readonly dispatchedAt: string | null;
  readonly receivedBy: string | null;
  readonly completedAt: string | null;
  readonly rejectionReason: string | null;
  readonly notes: string | null;
  readonly lines: MovementLine[];
  readonly createdAt: string;
  readonly createdBy: string | null;
}

export interface CreateMovementRequest {
  readonly movementType: MovementType;
  readonly fromLocationId: string | null;
  readonly toLocationId: string;
  readonly itemIds: string[];
  readonly notes: string | null;
}

export interface ReceiveMovementRequest {
  readonly lines: ReadonlyArray<{
    readonly jewelleryItemId: string;
    readonly receivedWeight: number | null;
    readonly discrepancyNote: string | null;
  }>;
  readonly notes: string | null;
}

// ---------- reports ----------

export interface InventoryValuationReport {
  readonly asOf: string;
  readonly itemCount: number;
  readonly totalGrossWeight: number | null;
  readonly totalNetMetalWeight: number | null;
  readonly totalCost: number | null;
  readonly totalMetalValueAtToday: number | null;
  readonly byLocation: ReadonlyArray<{
    readonly locationId: string;
    readonly locationCode: string;
    readonly locationName: string;
    readonly itemCount: number;
    readonly netWeight: number | null;
    readonly totalCost: number | null;
  }>;
  readonly byMetal: ReadonlyArray<{
    readonly metalId: string;
    readonly metalCode: string;
    readonly purityCode: string;
    readonly itemCount: number;
    readonly netWeight: number | null;
    readonly totalCost: number | null;
    readonly ratePerUnit: number | null;
    readonly metalValue: number | null;
  }>;
  readonly byStatus: ReadonlyArray<{
    readonly status: string;
    readonly itemCount: number;
    readonly totalCost: number | null;
  }>;
}

export interface StockAgeingReport {
  readonly asOf: string;
  readonly totalItems: number;
  readonly totalCost: number | null;
  readonly buckets: ReadonlyArray<{
    readonly label: string;
    readonly fromDays: number;
    readonly toDays: number | null;
    readonly itemCount: number;
    readonly totalCost: number | null;
  }>;
  readonly oldestItems: ReadonlyArray<{
    readonly itemId: string;
    readonly itemCode: string;
    readonly productId: string;
    readonly daysInStock: number;
    readonly totalCost: number | null;
    readonly locationId: string | null;
  }>;
}
