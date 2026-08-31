import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  CertificateRequest,
  Gemstone,
  GemstoneRequest,
  ItemStone,
  StoneCertificate,
} from '../../core/models/gemstone.model';
import { ApiService } from '../../core/services/api.service';

/** Gemstone and diamond master data, plus the lab certificates behind them. */
@Injectable({ providedIn: 'root' })
export class GemstoneService {
  private readonly api = inject(ApiService);

  private gemstones$: Observable<Gemstone[]> | null = null;

  listGemstones(refresh = false): Observable<Gemstone[]> {
    if (refresh || !this.gemstones$) {
      this.gemstones$ = this.api
        .get<Gemstone[]>(ApiEndpoints.gemstones.root)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.gemstones$;
  }

  createGemstone(request: GemstoneRequest): Observable<Gemstone> {
    return this.api
      .post<Gemstone>(ApiEndpoints.gemstones.root, request)
      .pipe(tap(() => this.invalidate()));
  }

  updateGemstone(id: string, request: GemstoneRequest): Observable<Gemstone> {
    return this.api
      .put<Gemstone>(ApiEndpoints.gemstones.byId(id), request)
      .pipe(tap(() => this.invalidate()));
  }

  searchCertificates(
    query: PageQuery & { readonly search?: string | null },
  ): Observable<PageResponse<StoneCertificate>> {
    return this.api.getPage<StoneCertificate>(ApiEndpoints.gemstones.certificates, { ...query });
  }

  createCertificate(request: CertificateRequest): Observable<StoneCertificate> {
    return this.api.post<StoneCertificate>(ApiEndpoints.gemstones.certificates, request);
  }

  /** Stones set into one jewellery item; used by the item passport in Phase 4. */
  stonesOfItem(itemId: string): Observable<ItemStone[]> {
    return this.api.get<ItemStone[]>(ApiEndpoints.gemstones.itemStones(itemId));
  }

  invalidate(): void {
    this.gemstones$ = null;
  }
}
