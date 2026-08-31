export const SUPPLIER_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'BLOCKED', label: 'Blocked' },
] as const;

export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number]['value'];

export interface SupplierContact {
  readonly id: string;
  readonly name: string;
  readonly designation: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly primaryContact: boolean;
}

export interface SupplierBankAccount {
  readonly id: string;
  readonly bankName: string;
  readonly accountName: string;
  readonly accountNumber: string;
  readonly branchName: string | null;
  readonly swiftCode: string | null;
  readonly currency: string | null;
  readonly primaryAccount: boolean;
}

/**
 * A supplier.
 *
 * The list endpoint returns a summary with `contacts` and `bankAccounts` null;
 * fetching one by id fills them in. Treat null as "not loaded", not "none".
 */
export interface Supplier {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly taxNumber: string | null;
  readonly supplierType: string | null;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly currency: string | null;
  readonly paymentTermsDays: number | null;
  readonly creditLimit: number | null;
  readonly status: SupplierStatus;
  readonly notes: string | null;
  readonly contacts: SupplierContact[] | null;
  readonly bankAccounts: SupplierBankAccount[] | null;
}

export interface SupplierRequest {
  readonly code: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly taxNumber: string | null;
  readonly supplierType: string | null;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly currency: string | null;
  readonly paymentTermsDays: number | null;
  readonly creditLimit: number | null;
  readonly notes: string | null;
}

export interface SupplierContactRequest {
  readonly name: string;
  readonly designation: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly primaryContact: boolean;
}

export interface SupplierBankAccountRequest {
  readonly bankName: string;
  readonly accountName: string;
  readonly accountNumber: string;
  readonly branchName: string | null;
  readonly swiftCode: string | null;
  readonly currency: string | null;
  readonly primaryAccount: boolean;
}

// ---------- requisitions ----------

export const REQUISITION_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number]['value'];

export interface RequisitionLine {
  readonly id: string;
  readonly productId: string;
  readonly quantity: number;
  readonly estimatedWeight: number | null;
  readonly notes: string | null;
}

export interface Requisition {
  readonly id: string;
  readonly referenceNumber: string;
  readonly branchId: string;
  readonly status: RequisitionStatus;
  readonly requiredBy: string | null;
  readonly justification: string | null;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly rejectionReason: string | null;
  readonly lines: RequisitionLine[];
  readonly createdAt: string;
  readonly createdBy: string | null;
}

export interface RequisitionRequest {
  readonly branchId: string;
  readonly requiredBy: string | null;
  readonly justification: string | null;
  readonly lines: ReadonlyArray<{
    readonly productId: string;
    readonly quantity: number;
    readonly estimatedWeight: number | null;
    readonly notes: string | null;
  }>;
}

// ---------- purchase orders ----------

export const PURCHASE_ORDER_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially received' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'CLOSED', label: 'Closed' },
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number]['value'];

/** Statuses in which the order can still take a goods receipt. */
export function acceptsReceipt(status: PurchaseOrderStatus): boolean {
  return status === 'APPROVED' || status === 'PARTIALLY_RECEIVED';
}

export interface PurchaseOrderLine {
  readonly id: string;
  readonly productId: string;
  readonly metalId: string | null;
  readonly purityId: string | null;
  readonly orderedQuantity: number;
  readonly receivedQuantity: number;
  readonly outstandingQuantity: number;
  readonly estimatedWeight: number | null;
  readonly ratePerGram: number | null;
  readonly makingChargePerUnit: number | null;
  readonly lineTotal: number | null;
  readonly notes: string | null;
}

export interface PurchaseOrder {
  readonly id: string;
  readonly orderNumber: string;
  readonly supplierId: string;
  readonly branchId: string;
  readonly deliveryLocationId: string;
  readonly requisitionId: string | null;
  readonly status: PurchaseOrderStatus;
  readonly orderDate: string;
  readonly expectedDeliveryDate: string | null;
  readonly currency: string | null;
  readonly estimatedTotal: number | null;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly rejectionReason: string | null;
  readonly notes: string | null;
  readonly lines: PurchaseOrderLine[];
  readonly createdAt: string;
  readonly createdBy: string | null;
}

export interface PurchaseOrderRequest {
  readonly supplierId: string;
  readonly branchId: string;
  readonly deliveryLocationId: string;
  readonly requisitionId: string | null;
  readonly expectedDeliveryDate: string | null;
  readonly currency: string | null;
  readonly notes: string | null;
  readonly lines: ReadonlyArray<{
    readonly productId: string;
    readonly metalId: string | null;
    readonly purityId: string | null;
    readonly orderedQuantity: number;
    readonly estimatedWeight: number | null;
    readonly ratePerGram: number | null;
    readonly makingChargePerUnit: number | null;
    readonly notes: string | null;
  }>;
}

// ---------- goods receipts ----------

export const GOODS_RECEIPT_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_QUALITY_CHECK', label: 'Pending quality check' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type GoodsReceiptStatus = (typeof GOODS_RECEIPT_STATUSES)[number]['value'];

export interface GoodsReceiptLine {
  readonly id: string;
  readonly purchaseOrderLineId: string;
  readonly productId: string;
  readonly grossWeight: number;
  readonly stoneWeight: number | null;
  readonly purchaseCost: number | null;
  readonly makingCost: number | null;
  readonly stoneCost: number | null;
  readonly barcode: string | null;
  readonly rfidTag: string | null;
  /** Set once the receipt is accepted and the serialized item exists. */
  readonly jewelleryItemId: string | null;
  readonly notes: string | null;
}

/**
 * A goods receipt.
 *
 * Because jewellery is serialized, each received line becomes one physical
 * piece: accepting the receipt is what creates the jewellery item and puts it
 * into stock, which is why `jewelleryItemId` is empty until then.
 */
export interface GoodsReceipt {
  readonly id: string;
  readonly receiptNumber: string;
  readonly purchaseOrderId: string;
  readonly supplierId: string;
  readonly locationId: string;
  readonly branchId: string;
  readonly status: GoodsReceiptStatus;
  readonly receiptDate: string;
  readonly supplierDeliveryNote: string | null;
  readonly qualityCheckedBy: string | null;
  readonly qualityCheckedAt: string | null;
  readonly rejectionReason: string | null;
  readonly notes: string | null;
  readonly lines: GoodsReceiptLine[];
  readonly createdAt: string;
  readonly createdBy: string | null;
}

export interface GoodsReceiptRequest {
  readonly purchaseOrderId: string;
  readonly receiptDate: string | null;
  readonly supplierDeliveryNote: string | null;
  readonly notes: string | null;
  readonly lines: ReadonlyArray<{
    readonly purchaseOrderLineId: string;
    readonly grossWeight: number;
    readonly stoneWeight: number | null;
    readonly purchaseCost: number | null;
    readonly makingCost: number | null;
    readonly stoneCost: number | null;
    readonly hallmarkNumber: string | null;
    readonly barcode: string | null;
    readonly rfidTag: string | null;
    readonly notes: string | null;
  }>;
}

export interface SupplierInvoice {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly supplierId: string;
  readonly purchaseOrderId: string | null;
  readonly goodsReceiptId: string | null;
  readonly invoiceDate: string;
  readonly dueDate: string | null;
  readonly currency: string | null;
  readonly subTotal: number;
  readonly taxAmount: number | null;
  readonly totalAmount: number | null;
  readonly status: string;
  readonly notes: string | null;
}

export interface SupplierInvoiceRequest {
  readonly supplierId: string;
  readonly invoiceNumber: string;
  readonly purchaseOrderId: string | null;
  readonly goodsReceiptId: string | null;
  readonly invoiceDate: string;
  readonly dueDate: string | null;
  readonly currency: string | null;
  readonly subTotal: number;
  readonly taxAmount: number | null;
  readonly notes: string | null;
}
