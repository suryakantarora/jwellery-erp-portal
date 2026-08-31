import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  Bin,
  BinRequest,
  Exchange,
  ExchangeReceiveRequest,
  ExchangeStatus,
  ExchangeType,
  Repair,
  RepairReceiveRequest,
  RepairStatus,
  StockCount,
  StockCountStatus,
} from '../../core/models/operations.model';
import { ApiService } from '../../core/services/api.service';

/**
 * The three counter-facing workflows: old-gold exchange and buyback, repairs,
 * and physical stock control.
 *
 * Each is a state machine owned by the backend; every step here is a named
 * transition rather than an edit, which is what keeps the audit trail honest.
 */
@Injectable({ providedIn: 'root' })
export class OperationsService {
  private readonly api = inject(ApiService);

  // ---------- exchange and buyback ----------

  searchExchanges(
    query: PageQuery & {
      status?: ExchangeStatus | null;
      exchangeType?: ExchangeType | null;
      customerId?: string | null;
      branchId?: string | null;
    },
  ): Observable<PageResponse<Exchange>> {
    return this.api.getPage<Exchange>(ApiEndpoints.exchanges.root, { ...query });
  }

  getExchange(id: string): Observable<Exchange> {
    return this.api.get<Exchange>(ApiEndpoints.exchanges.byId(id));
  }

  receiveExchange(request: ExchangeReceiveRequest): Observable<Exchange> {
    return this.api.post<Exchange>(ApiEndpoints.exchanges.root, request);
  }

  weigh(id: string, grossWeight: number, stoneWeight: number | null): Observable<Exchange> {
    return this.api.post<Exchange>(ApiEndpoints.exchanges.weigh(id), { grossWeight, stoneWeight });
  }

  testPurity(id: string, testedPurityId: string, testMethod: string | null): Observable<Exchange> {
    return this.api.post<Exchange>(ApiEndpoints.exchanges.purityTest(id), {
      testedPurityId,
      testMethod,
    });
  }

  value(
    id: string,
    deductionPercentage: number | null,
    notes: string | null,
  ): Observable<Exchange> {
    return this.api.post<Exchange>(ApiEndpoints.exchanges.valuation(id), {
      deductionPercentage,
      notes,
    });
  }

  approveExchange(id: string): Observable<Exchange> {
    return this.api.post<Exchange>(ApiEndpoints.exchanges.approve(id));
  }

  rejectExchange(id: string, reason: string): Observable<Exchange> {
    return this.api.post<Exchange>(ApiEndpoints.exchanges.reject(id), undefined, {
      params: { reason },
    });
  }

  completeExchange(
    id: string,
    body: { appliedSaleId?: string | null; scrapLocationId?: string | null; notes?: string | null },
  ): Observable<Exchange> {
    return this.api.post<Exchange>(ApiEndpoints.exchanges.complete(id), body);
  }

  returnExchange(id: string, reason?: string): Observable<Exchange> {
    return this.api.post<Exchange>(ApiEndpoints.exchanges.returnToCustomer(id), undefined, {
      params: { reason },
    });
  }

  // ---------- repairs ----------

  searchRepairs(
    query: PageQuery & {
      status?: RepairStatus | null;
      customerId?: string | null;
      branchId?: string | null;
      assignedTo?: string | null;
    },
  ): Observable<PageResponse<Repair>> {
    return this.api.getPage<Repair>(ApiEndpoints.repairs.root, { ...query });
  }

  getRepair(id: string): Observable<Repair> {
    return this.api.get<Repair>(ApiEndpoints.repairs.byId(id));
  }

  overdueRepairs(branchId: string): Observable<Repair[]> {
    return this.api.get<Repair[]>(ApiEndpoints.repairs.overdue, { params: { branchId } });
  }

  receiveRepair(request: RepairReceiveRequest): Observable<Repair> {
    return this.api.post<Repair>(ApiEndpoints.repairs.root, request);
  }

  inspect(id: string, findings: string, conditionNotes: string | null): Observable<Repair> {
    return this.api.post<Repair>(ApiEndpoints.repairs.inspection(id), {
      findings,
      conditionNotes,
    });
  }

  estimate(
    id: string,
    estimatedCost: number,
    estimatedDays: number | null,
    estimateNotes: string | null,
  ): Observable<Repair> {
    return this.api.post<Repair>(ApiEndpoints.repairs.estimate(id), {
      estimatedCost,
      estimatedDays,
      estimateNotes,
    });
  }

  customerDecision(
    id: string,
    approved: boolean,
    declineReason: string | null,
  ): Observable<Repair> {
    return this.api.post<Repair>(ApiEndpoints.repairs.customerDecision(id), {
      approved,
      declineReason,
    });
  }

  assign(id: string, assignedTo: string, notes: string | null): Observable<Repair> {
    return this.api.post<Repair>(ApiEndpoints.repairs.assign(id), { assignedTo, notes });
  }

  completeWork(id: string, finalCost: number | null, notes: string | null): Observable<Repair> {
    return this.api.post<Repair>(ApiEndpoints.repairs.completeWork(id), { finalCost, notes });
  }

  qualityCheck(id: string, passed: boolean, notes: string | null): Observable<Repair> {
    return this.api.post<Repair>(ApiEndpoints.repairs.qualityCheck(id), { passed, notes });
  }

  deliverRepair(
    id: string,
    body: {
      deliveredTo: string;
      deliveredWeight?: number | null;
      returnToLocationId?: string | null;
      notes?: string | null;
    },
  ): Observable<Repair> {
    return this.api.post<Repair>(ApiEndpoints.repairs.deliver(id), body);
  }

  cancelRepair(id: string, reason: string): Observable<Repair> {
    return this.api.post<Repair>(ApiEndpoints.repairs.cancel(id), undefined, {
      params: { reason },
    });
  }

  // ---------- warehouse ----------

  listBins(locationId: string): Observable<Bin[]> {
    return this.api.get<Bin[]>(ApiEndpoints.warehouse.bins, { params: { locationId } });
  }

  createBin(request: BinRequest): Observable<Bin> {
    return this.api.post<Bin>(ApiEndpoints.warehouse.bins, request);
  }

  deactivateBin(id: string): Observable<Bin> {
    return this.api.delete<Bin>(ApiEndpoints.warehouse.bin(id));
  }

  searchStockCounts(
    query: PageQuery & {
      status?: StockCountStatus | null;
      locationId?: string | null;
      branchId?: string | null;
    },
  ): Observable<PageResponse<StockCount>> {
    return this.api.getPage<StockCount>(ApiEndpoints.warehouse.stockCounts, { ...query });
  }

  getStockCount(id: string): Observable<StockCount> {
    return this.api.get<StockCount>(ApiEndpoints.warehouse.stockCount(id));
  }

  startCount(locationId: string, notes: string | null): Observable<StockCount> {
    return this.api.post<StockCount>(ApiEndpoints.warehouse.stockCounts, { locationId, notes });
  }

  /** The pieces actually found; anything expected but absent becomes a variance. */
  submitCount(id: string, foundItemIds: string[], notes: string | null): Observable<StockCount> {
    return this.api.post<StockCount>(ApiEndpoints.warehouse.submitCount(id), {
      foundItemIds,
      notes,
    });
  }

  approveCount(id: string): Observable<StockCount> {
    return this.api.post<StockCount>(ApiEndpoints.warehouse.approveCount(id));
  }

  cancelCount(id: string, reason?: string): Observable<StockCount> {
    return this.api.post<StockCount>(ApiEndpoints.warehouse.cancelCount(id), undefined, {
      params: { reason },
    });
  }
}
