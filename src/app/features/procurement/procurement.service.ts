import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay, tap } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  GoodsReceipt,
  GoodsReceiptRequest,
  GoodsReceiptStatus,
  PurchaseOrder,
  PurchaseOrderRequest,
  PurchaseOrderStatus,
  Requisition,
  RequisitionRequest,
  RequisitionStatus,
  Supplier,
  SupplierBankAccountRequest,
  SupplierContactRequest,
  SupplierInvoice,
  SupplierInvoiceRequest,
  SupplierRequest,
  SupplierStatus,
} from '../../core/models/procurement.model';
import { ApiService } from '../../core/services/api.service';

export interface SupplierQuery extends PageQuery {
  readonly search?: string | null;
  readonly status?: SupplierStatus | null;
}

/**
 * Suppliers and the procurement workflow: requisition, order, receipt, invoice.
 */
@Injectable({ providedIn: 'root' })
export class ProcurementService {
  private readonly api = inject(ApiService);

  private suppliers$: Observable<Supplier[]> | null = null;

  // ---------- suppliers ----------

  searchSuppliers(query: SupplierQuery): Observable<PageResponse<Supplier>> {
    return this.api.getPage<Supplier>(ApiEndpoints.suppliers.root, { ...query });
  }

  /** Cached supplier list used as reference data by the order screens. */
  listAllSuppliers(refresh = false): Observable<Supplier[]> {
    if (refresh || !this.suppliers$) {
      this.suppliers$ = this.api
        .get<PageResponse<Supplier>>(ApiEndpoints.suppliers.root, {
          params: { size: 300, sort: 'name,asc' },
        })
        .pipe(
          map((page) => page.content),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.suppliers$;
  }

  /** The detailed record, which carries contacts and bank accounts. */
  getSupplier(id: string): Observable<Supplier> {
    return this.api.get<Supplier>(ApiEndpoints.suppliers.byId(id));
  }

  createSupplier(request: SupplierRequest): Observable<Supplier> {
    return this.api
      .post<Supplier>(ApiEndpoints.suppliers.root, request)
      .pipe(tap(() => this.invalidate()));
  }

  updateSupplier(id: string, request: SupplierRequest): Observable<Supplier> {
    return this.api
      .put<Supplier>(ApiEndpoints.suppliers.byId(id), request)
      .pipe(tap(() => this.invalidate()));
  }

  changeSupplierStatus(id: string, status: SupplierStatus, reason?: string): Observable<Supplier> {
    return this.api
      .post<Supplier>(ApiEndpoints.suppliers.status(id), undefined, {
        params: { status, reason },
      })
      .pipe(tap(() => this.invalidate()));
  }

  addContact(id: string, request: SupplierContactRequest): Observable<Supplier> {
    return this.api.post<Supplier>(ApiEndpoints.suppliers.contacts(id), request);
  }

  addBankAccount(id: string, request: SupplierBankAccountRequest): Observable<Supplier> {
    return this.api.post<Supplier>(ApiEndpoints.suppliers.bankAccounts(id), request);
  }

  // ---------- requisitions ----------

  searchRequisitions(
    query: PageQuery & { status?: RequisitionStatus | null; branchId?: string | null },
  ): Observable<PageResponse<Requisition>> {
    return this.api.getPage<Requisition>(ApiEndpoints.procurement.requisitions, { ...query });
  }

  createRequisition(request: RequisitionRequest): Observable<Requisition> {
    return this.api.post<Requisition>(ApiEndpoints.procurement.requisitions, request);
  }

  approveRequisition(id: string): Observable<Requisition> {
    return this.api.post<Requisition>(ApiEndpoints.procurement.approveRequisition(id));
  }

  rejectRequisition(id: string, reason: string): Observable<Requisition> {
    return this.api.post<Requisition>(ApiEndpoints.procurement.rejectRequisition(id), undefined, {
      params: { reason },
    });
  }

  // ---------- purchase orders ----------

  searchOrders(
    query: PageQuery & {
      status?: PurchaseOrderStatus | null;
      supplierId?: string | null;
      branchId?: string | null;
    },
  ): Observable<PageResponse<PurchaseOrder>> {
    return this.api.getPage<PurchaseOrder>(ApiEndpoints.procurement.orders, { ...query });
  }

  getOrder(id: string): Observable<PurchaseOrder> {
    return this.api.get<PurchaseOrder>(ApiEndpoints.procurement.order(id));
  }

  createOrder(request: PurchaseOrderRequest): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>(ApiEndpoints.procurement.orders, request);
  }

  approveOrder(id: string): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>(ApiEndpoints.procurement.approveOrder(id));
  }

  rejectOrder(id: string, reason: string): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>(ApiEndpoints.procurement.rejectOrder(id), undefined, {
      params: { reason },
    });
  }

  cancelOrder(id: string, reason?: string): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>(ApiEndpoints.procurement.cancelOrder(id), undefined, {
      params: { reason },
    });
  }

  closeOrder(id: string, reason?: string): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>(ApiEndpoints.procurement.closeOrder(id), undefined, {
      params: { reason },
    });
  }

  // ---------- goods receipts ----------

  searchReceipts(
    query: PageQuery & {
      status?: GoodsReceiptStatus | null;
      purchaseOrderId?: string | null;
      branchId?: string | null;
    },
  ): Observable<PageResponse<GoodsReceipt>> {
    return this.api.getPage<GoodsReceipt>(ApiEndpoints.procurement.receipts, { ...query });
  }

  getReceipt(id: string): Observable<GoodsReceipt> {
    return this.api.get<GoodsReceipt>(ApiEndpoints.procurement.receipt(id));
  }

  createReceipt(request: GoodsReceiptRequest): Observable<GoodsReceipt> {
    return this.api.post<GoodsReceipt>(ApiEndpoints.procurement.receipts, request);
  }

  /** Passes quality check, which is what turns the lines into stock. */
  acceptReceipt(id: string): Observable<GoodsReceipt> {
    return this.api.post<GoodsReceipt>(ApiEndpoints.procurement.acceptReceipt(id));
  }

  rejectReceipt(id: string, reason: string): Observable<GoodsReceipt> {
    return this.api.post<GoodsReceipt>(ApiEndpoints.procurement.rejectReceipt(id), undefined, {
      params: { reason },
    });
  }

  // ---------- supplier invoices ----------

  searchInvoices(
    query: PageQuery & { supplierId?: string | null; status?: string | null },
  ): Observable<PageResponse<SupplierInvoice>> {
    return this.api.getPage<SupplierInvoice>(ApiEndpoints.procurement.invoices, { ...query });
  }

  createInvoice(request: SupplierInvoiceRequest): Observable<SupplierInvoice> {
    return this.api.post<SupplierInvoice>(ApiEndpoints.procurement.invoices, request);
  }

  invalidate(): void {
    this.suppliers$ = null;
  }
}
