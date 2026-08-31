import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  CreateSaleRequest,
  DailyClosing,
  Payment,
  PaymentStatus,
  Quotation,
  QuotationRequest,
  QuotationStatus,
  RecordPaymentRequest,
  RefundRequest,
  Sale,
  SaleReturnRequest,
  SaleStatus,
} from '../../core/models/sales.model';
import { ApiService } from '../../core/services/api.service';

/** Sales, the quotations they come from, and the money collected against them. */
@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly api = inject(ApiService);

  searchSales(
    query: PageQuery & {
      status?: SaleStatus | null;
      customerId?: string | null;
      branchId?: string | null;
      from?: string | null;
      to?: string | null;
    },
  ): Observable<PageResponse<Sale>> {
    return this.api.getPage<Sale>(ApiEndpoints.sales.root, { ...query });
  }

  getSale(id: string): Observable<Sale> {
    return this.api.get<Sale>(ApiEndpoints.sales.byId(id));
  }

  createSale(request: CreateSaleRequest): Observable<Sale> {
    return this.api.post<Sale>(ApiEndpoints.sales.root, request);
  }

  cancelSale(id: string, reason?: string): Observable<Sale> {
    return this.api.post<Sale>(ApiEndpoints.sales.cancel(id), undefined, { params: { reason } });
  }

  deliverSale(id: string): Observable<Sale> {
    return this.api.post<Sale>(ApiEndpoints.sales.deliver(id));
  }

  returnItems(id: string, request: SaleReturnRequest): Observable<Sale> {
    return this.api.post<Sale>(ApiEndpoints.sales.returns(id), request);
  }

  dailyClosing(branchId: string, date?: string): Observable<DailyClosing> {
    return this.api.get<DailyClosing>(ApiEndpoints.sales.dailyClosing, {
      params: { branchId, date },
    });
  }

  // ---------- quotations ----------

  searchQuotations(
    query: PageQuery & {
      status?: QuotationStatus | null;
      customerId?: string | null;
      branchId?: string | null;
    },
  ): Observable<PageResponse<Quotation>> {
    return this.api.getPage<Quotation>(ApiEndpoints.sales.quotations, { ...query });
  }

  createQuotation(request: QuotationRequest): Observable<Quotation> {
    return this.api.post<Quotation>(ApiEndpoints.sales.quotations, request);
  }

  cancelQuotation(id: string, reason?: string): Observable<Quotation> {
    return this.api.post<Quotation>(ApiEndpoints.sales.cancelQuotation(id), undefined, {
      params: { reason },
    });
  }

  // ---------- payments ----------

  searchPayments(
    query: PageQuery & {
      saleId?: string | null;
      branchId?: string | null;
      status?: PaymentStatus | null;
      from?: string | null;
      to?: string | null;
    },
  ): Observable<PageResponse<Payment>> {
    return this.api.getPage<Payment>(ApiEndpoints.payments.root, { ...query });
  }

  paymentsForSale(saleId: string): Observable<Payment[]> {
    return this.api.get<Payment[]>(ApiEndpoints.payments.forSale(saleId));
  }

  recordPayment(saleId: string, request: RecordPaymentRequest): Observable<Payment> {
    return this.api.post<Payment>(ApiEndpoints.payments.forSale(saleId), request);
  }

  refund(request: RefundRequest): Observable<Payment> {
    return this.api.post<Payment>(ApiEndpoints.payments.refunds, request);
  }

  /** Ties a captured payment to a line on the bank statement. */
  reconcile(id: string, statementReference?: string): Observable<Payment> {
    return this.api.post<Payment>(ApiEndpoints.payments.reconcile(id), undefined, {
      params: { statementReference },
    });
  }
}
