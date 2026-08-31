import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import {
  CalculatePriceRequest,
  DiscountPolicyRequest,
  MakingChargeRuleRequest,
  PriceBreakdown,
  PricingRule,
  TaxRateRequest,
} from '../../core/models/pricing.model';
import { ApiService } from '../../core/services/api.service';

/**
 * Pricing configuration and the calculator that applies it.
 *
 * Nothing here computes a price in the browser: the rules are edited through
 * these endpoints and the server prices an item, so a quote on screen and a
 * charge on an invoice can never disagree.
 */
@Injectable({ providedIn: 'root' })
export class PricingService {
  private readonly api = inject(ApiService);

  calculate(request: CalculatePriceRequest): Observable<PriceBreakdown> {
    return this.api.post<PriceBreakdown>(ApiEndpoints.pricing.calculate, request);
  }

  listMakingChargeRules(): Observable<PricingRule[]> {
    return this.api.get<PricingRule[]>(ApiEndpoints.pricing.makingChargeRules);
  }

  createMakingChargeRule(request: MakingChargeRuleRequest): Observable<PricingRule> {
    return this.api.post<PricingRule>(ApiEndpoints.pricing.makingChargeRules, request);
  }

  deactivateMakingChargeRule(id: string): Observable<PricingRule> {
    return this.api.delete<PricingRule>(ApiEndpoints.pricing.makingChargeRule(id));
  }

  listTaxRates(): Observable<PricingRule[]> {
    return this.api.get<PricingRule[]>(ApiEndpoints.pricing.taxRates);
  }

  createTaxRate(request: TaxRateRequest): Observable<PricingRule> {
    return this.api.post<PricingRule>(ApiEndpoints.pricing.taxRates, request);
  }

  deactivateTaxRate(id: string): Observable<PricingRule> {
    return this.api.delete<PricingRule>(ApiEndpoints.pricing.taxRate(id));
  }

  listDiscountPolicies(): Observable<PricingRule[]> {
    return this.api.get<PricingRule[]>(ApiEndpoints.pricing.discountPolicies);
  }

  createDiscountPolicy(request: DiscountPolicyRequest): Observable<PricingRule> {
    return this.api.post<PricingRule>(ApiEndpoints.pricing.discountPolicies, request);
  }
}
