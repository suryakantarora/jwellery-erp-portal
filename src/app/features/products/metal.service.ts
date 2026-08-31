import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  Metal,
  MetalRate,
  MetalRequest,
  PublishRateRequest,
  Purity,
  PurityRequest,
  RateType,
} from '../../core/models/metal.model';
import { ApiService } from '../../core/services/api.service';

export interface RateQuery extends PageQuery {
  readonly metalId?: string | null;
  readonly purityId?: string | null;
  readonly rateType?: RateType | null;
  readonly from?: string | null;
  readonly to?: string | null;
}

/**
 * Metals, their purities, and the rate board.
 *
 * Rates are published, never edited: `publish` appends a new row and the
 * history endpoint returns every row that was ever quoted.
 */
@Injectable({ providedIn: 'root' })
export class MetalService {
  private readonly api = inject(ApiService);

  private metals$: Observable<Metal[]> | null = null;

  listMetals(refresh = false): Observable<Metal[]> {
    if (refresh || !this.metals$) {
      this.metals$ = this.api
        .get<Metal[]>(ApiEndpoints.metals.root)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.metals$;
  }

  createMetal(request: MetalRequest): Observable<Metal> {
    return this.api
      .post<Metal>(ApiEndpoints.metals.root, request)
      .pipe(tap(() => this.invalidate()));
  }

  updateMetal(id: string, request: MetalRequest): Observable<Metal> {
    return this.api
      .put<Metal>(ApiEndpoints.metals.byId(id), request)
      .pipe(tap(() => this.invalidate()));
  }

  listPurities(metalId: string): Observable<Purity[]> {
    return this.api.get<Purity[]>(ApiEndpoints.metals.purities(metalId));
  }

  createPurity(request: PurityRequest): Observable<Purity> {
    return this.api.post<Purity>(ApiEndpoints.metals.createPurity, request);
  }

  updatePurity(id: string, request: PurityRequest): Observable<Purity> {
    return this.api.put<Purity>(ApiEndpoints.metals.purity(id), request);
  }

  searchRates(query: RateQuery): Observable<PageResponse<MetalRate>> {
    return this.api.getPage<MetalRate>(ApiEndpoints.metals.rates, { ...query });
  }

  publishRate(request: PublishRateRequest): Observable<MetalRate> {
    return this.api.post<MetalRate>(ApiEndpoints.metals.rates, request);
  }

  /** The rate in force for a metal and purity, optionally on a past date. */
  currentRate(
    metalId: string,
    purityId: string,
    rateType: RateType = 'SELLING',
    onDate?: string,
    branchId?: string,
  ): Observable<MetalRate> {
    return this.api.get<MetalRate>(ApiEndpoints.metals.currentRate, {
      params: { metalId, purityId, rateType, onDate, branchId },
    });
  }

  invalidate(): void {
    this.metals$ = null;
  }
}
