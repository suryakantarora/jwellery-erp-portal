import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  AdjustRequest,
  LoyaltyAccount,
  LoyaltyProgram,
  LoyaltyProgramRequest,
  LoyaltyTransaction,
  RedeemRequest,
} from '../../core/models/loyalty.model';
import { ApiService } from '../../core/services/api.service';
import { SILENT } from '../../core/interceptors/http-context.tokens';

/** Loyalty programmes, tiers, and the points ledger behind them. */
@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private readonly api = inject(ApiService);

  listPrograms(): Observable<LoyaltyProgram[]> {
    return this.api.get<LoyaltyProgram[]>(ApiEndpoints.loyalty.programs);
  }

  getProgram(id: string): Observable<LoyaltyProgram> {
    return this.api.get<LoyaltyProgram>(ApiEndpoints.loyalty.program(id));
  }

  createProgram(request: LoyaltyProgramRequest): Observable<LoyaltyProgram> {
    return this.api.post<LoyaltyProgram>(ApiEndpoints.loyalty.programs, request);
  }

  setProgramActive(id: string, active: boolean): Observable<LoyaltyProgram> {
    return this.api.post<LoyaltyProgram>(ApiEndpoints.loyalty.programActive(id), undefined, {
      params: { active },
    });
  }

  /**
   * A customer's account.
   *
   * Silenced: a customer who has never enrolled is an ordinary case the screen
   * handles itself, not an error worth a global toast.
   */
  getAccount(customerId: string): Observable<LoyaltyAccount> {
    return this.api.get<LoyaltyAccount>(ApiEndpoints.loyalty.account(customerId), {
      context: SILENT(),
    });
  }

  statement(
    customerId: string,
    query: PageQuery = {},
  ): Observable<PageResponse<LoyaltyTransaction>> {
    return this.api.getPage<LoyaltyTransaction>(ApiEndpoints.loyalty.statement(customerId), {
      ...query,
    });
  }

  enrol(customerId: string): Observable<LoyaltyAccount> {
    return this.api.post<LoyaltyAccount>(ApiEndpoints.loyalty.accounts, { customerId });
  }

  redeem(request: RedeemRequest): Observable<LoyaltyAccount> {
    return this.api.post<LoyaltyAccount>(ApiEndpoints.loyalty.redemptions, request);
  }

  adjust(request: AdjustRequest): Observable<LoyaltyAccount> {
    return this.api.post<LoyaltyAccount>(ApiEndpoints.loyalty.adjustments, request);
  }
}
