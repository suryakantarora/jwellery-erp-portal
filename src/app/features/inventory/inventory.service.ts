import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  ChangeStatusRequest,
  CreateItemRequest,
  CreateMovementRequest,
  InventoryValuationReport,
  ItemPassport,
  ItemStatus,
  JewelleryItem,
  Movement,
  MovementStatus,
  MovementType,
  ReceiveMovementRequest,
  ReserveItemRequest,
  StockAgeingReport,
  TagItemRequest,
  UpdateItemRequest,
} from '../../core/models/inventory.model';
import { ApiService } from '../../core/services/api.service';
import { SILENT } from '../../core/interceptors/http-context.tokens';

export interface ItemQuery extends PageQuery {
  readonly search?: string | null;
  readonly productId?: string | null;
  readonly status?: ItemStatus | null;
  readonly locationId?: string | null;
  readonly branchId?: string | null;
  readonly metalId?: string | null;
  readonly purityId?: string | null;
}

export interface MovementQuery extends PageQuery {
  readonly status?: MovementStatus | null;
  readonly movementType?: MovementType | null;
  readonly fromLocationId?: string | null;
  readonly toLocationId?: string | null;
}

/**
 * Serialized inventory: individual pieces, their passports, and the movements
 * that carry them between locations.
 */
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly api = inject(ApiService);

  // ---------- items ----------

  searchItems(query: ItemQuery): Observable<PageResponse<JewelleryItem>> {
    return this.api.getPage<JewelleryItem>(ApiEndpoints.inventory.items, { ...query });
  }

  getItem(id: string): Observable<JewelleryItem> {
    return this.api.get<JewelleryItem>(ApiEndpoints.inventory.item(id));
  }

  /**
   * Looks an item up by any of its physical tags.
   *
   * Silenced because a scan that finds nothing is an ordinary outcome the
   * scanning UI reports itself, not an error worth a global toast.
   */
  findByTag(tag: string): Observable<JewelleryItem> {
    return this.api.get<JewelleryItem>(ApiEndpoints.inventory.itemByTag, {
      params: { tag },
      context: SILENT(),
    });
  }

  passport(id: string): Observable<ItemPassport> {
    return this.api.get<ItemPassport>(ApiEndpoints.inventory.passport(id));
  }

  createItem(request: CreateItemRequest): Observable<JewelleryItem> {
    return this.api.post<JewelleryItem>(ApiEndpoints.inventory.items, request);
  }

  updateItem(id: string, request: UpdateItemRequest): Observable<JewelleryItem> {
    return this.api.put<JewelleryItem>(ApiEndpoints.inventory.item(id), request);
  }

  tagItem(id: string, request: TagItemRequest): Observable<JewelleryItem> {
    return this.api.post<JewelleryItem>(ApiEndpoints.inventory.tag(id), request);
  }

  /** Passes quality check and moves a draft item into sellable stock. */
  releaseToStock(id: string): Observable<JewelleryItem> {
    return this.api.post<JewelleryItem>(ApiEndpoints.inventory.release(id));
  }

  reserve(request: ReserveItemRequest): Observable<JewelleryItem> {
    return this.api.post<JewelleryItem>(ApiEndpoints.inventory.reservations, request);
  }

  releaseReservation(id: string): Observable<void> {
    return this.api.post<void>(ApiEndpoints.inventory.releaseReservation(id));
  }

  changeStatus(id: string, request: ChangeStatusRequest): Observable<JewelleryItem> {
    return this.api.post<JewelleryItem>(ApiEndpoints.inventory.changeStatus(id), request);
  }

  // ---------- movements ----------

  searchMovements(query: MovementQuery): Observable<PageResponse<Movement>> {
    return this.api.getPage<Movement>(ApiEndpoints.inventory.transfers, { ...query });
  }

  getMovement(id: string): Observable<Movement> {
    return this.api.get<Movement>(ApiEndpoints.inventory.transfer(id));
  }

  createMovement(request: CreateMovementRequest): Observable<Movement> {
    return this.api.post<Movement>(ApiEndpoints.inventory.transfers, request);
  }

  approveMovement(id: string): Observable<Movement> {
    return this.api.post<Movement>(ApiEndpoints.inventory.approveTransfer(id));
  }

  rejectMovement(id: string, reason: string): Observable<Movement> {
    return this.api.post<Movement>(ApiEndpoints.inventory.rejectTransfer(id), { reason });
  }

  dispatchMovement(id: string): Observable<Movement> {
    return this.api.post<Movement>(ApiEndpoints.inventory.dispatchTransfer(id));
  }

  receiveMovement(id: string, request?: ReceiveMovementRequest): Observable<Movement> {
    return this.api.post<Movement>(ApiEndpoints.inventory.receiveTransfer(id), request ?? {});
  }

  cancelMovement(id: string): Observable<Movement> {
    return this.api.post<Movement>(ApiEndpoints.inventory.cancelTransfer(id));
  }

  // ---------- reports ----------

  valuation(branchId?: string | null): Observable<InventoryValuationReport> {
    return this.api.get<InventoryValuationReport>(ApiEndpoints.reports.inventoryValuation, {
      params: { branchId: branchId ?? undefined },
    });
  }

  ageing(branchId?: string | null): Observable<StockAgeingReport> {
    return this.api.get<StockAgeingReport>(ApiEndpoints.reports.stockAgeing, {
      params: { branchId: branchId ?? undefined },
    });
  }
}
