import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay, tap } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  Branch,
  BranchRequest,
  Company,
  CompanyRequest,
  Location,
  LocationRequest,
  LocationType,
} from '../../core/models/organization.model';
import { ApiService } from '../../core/services/api.service';

/** Filters accepted by the server-paged branch list. */
export interface BranchQuery extends PageQuery {
  readonly companyId?: string | null;
  readonly search?: string | null;
}

/**
 * Company, branch and location master data.
 *
 * Companies and the full branch list double as reference data for the branch,
 * location and user screens, so both are cached here: several pages need the
 * same lookup to turn an id into a name, and re-fetching per page would make
 * every drawer open feel slow.
 */
@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly api = inject(ApiService);

  private companies$: Observable<Company[]> | null = null;
  private branches$: Observable<Branch[]> | null = null;

  // ---------- companies ----------

  /** Cached company list; pass `true` after a mutation to re-fetch. */
  listCompanies(refresh = false): Observable<Company[]> {
    if (refresh || !this.companies$) {
      this.companies$ = this.api
        .get<Company[]>(ApiEndpoints.organization.companies)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.companies$;
  }

  getCompany(id: string): Observable<Company> {
    return this.api.get<Company>(ApiEndpoints.organization.company(id));
  }

  createCompany(request: CompanyRequest): Observable<Company> {
    return this.api
      .post<Company>(ApiEndpoints.organization.companies, request)
      .pipe(tap(() => this.invalidate()));
  }

  updateCompany(id: string, request: CompanyRequest): Observable<Company> {
    return this.api
      .put<Company>(ApiEndpoints.organization.company(id), request)
      .pipe(tap(() => this.invalidate()));
  }

  // ---------- branches ----------

  searchBranches(query: BranchQuery): Observable<PageResponse<Branch>> {
    return this.api.getPage<Branch>(ApiEndpoints.organization.branches, { ...query });
  }

  /** Cached, unpaged branch list used as reference data by other screens. */
  listAllBranches(refresh = false): Observable<Branch[]> {
    if (refresh || !this.branches$) {
      this.branches$ = this.api
        .get<PageResponse<Branch>>(ApiEndpoints.organization.branches, {
          params: { size: 500, sort: 'name,asc' },
        })
        .pipe(
          map((page) => page.content),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.branches$;
  }

  createBranch(request: BranchRequest): Observable<Branch> {
    return this.api
      .post<Branch>(ApiEndpoints.organization.branches, request)
      .pipe(tap(() => this.invalidate()));
  }

  updateBranch(id: string, request: BranchRequest): Observable<Branch> {
    return this.api
      .put<Branch>(ApiEndpoints.organization.branch(id), request)
      .pipe(tap(() => this.invalidate()));
  }

  deactivateBranch(id: string): Observable<void> {
    return this.api
      .delete<void>(ApiEndpoints.organization.branch(id))
      .pipe(tap(() => this.invalidate()));
  }

  // ---------- locations ----------

  listLocations(branchId: string, type?: LocationType | null): Observable<Location[]> {
    return this.api.get<Location[]>(ApiEndpoints.organization.branchLocations(branchId), {
      params: { type: type ?? undefined },
    });
  }

  createLocation(request: LocationRequest): Observable<Location> {
    return this.api.post<Location>(ApiEndpoints.organization.locations, request);
  }

  updateLocation(id: string, request: LocationRequest): Observable<Location> {
    return this.api.put<Location>(ApiEndpoints.organization.location(id), request);
  }

  deactivateLocation(id: string): Observable<void> {
    return this.api.delete<void>(ApiEndpoints.organization.location(id));
  }

  /** Drops the reference-data caches after a company or branch changes. */
  invalidate(): void {
    this.companies$ = null;
    this.branches$ = null;
  }
}
