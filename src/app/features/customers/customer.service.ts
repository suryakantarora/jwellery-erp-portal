import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  ActivityRequest,
  ActivityType,
  Campaign,
  CampaignRequest,
  CampaignStatus,
  Customer,
  Customer360,
  CustomerActivity,
  CustomerAddressRequest,
  CustomerDocumentRequest,
  CustomerRequest,
  CustomerStatus,
  FollowUp,
  FollowUpRequest,
  FollowUpStatus,
  KycStatus,
  PreferenceRequest,
  Segment,
  SegmentRequest,
} from '../../core/models/customer.model';
import { ApiService } from '../../core/services/api.service';
import { SILENT } from '../../core/interceptors/http-context.tokens';

export interface CustomerQuery extends PageQuery {
  readonly search?: string | null;
  readonly status?: CustomerStatus | null;
  readonly kycStatus?: KycStatus | null;
  readonly branchId?: string | null;
}

/** Customers, their KYC and documents, and everything CRM does with them. */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly api = inject(ApiService);

  // ---------- customers ----------

  search(query: CustomerQuery): Observable<PageResponse<Customer>> {
    return this.api.getPage<Customer>(ApiEndpoints.customers.root, { ...query });
  }

  /** Counter lookup by phone; a miss is an ordinary outcome, so it is silent. */
  findByPhone(phone: string): Observable<Customer> {
    return this.api.get<Customer>(ApiEndpoints.customers.byPhone, {
      params: { phone },
      context: SILENT(),
    });
  }

  get(id: string): Observable<Customer> {
    return this.api.get<Customer>(ApiEndpoints.customers.byId(id));
  }

  create(request: CustomerRequest): Observable<Customer> {
    return this.api.post<Customer>(ApiEndpoints.customers.root, request);
  }

  update(id: string, request: CustomerRequest): Observable<Customer> {
    return this.api.put<Customer>(ApiEndpoints.customers.byId(id), request);
  }

  addAddress(id: string, request: CustomerAddressRequest): Observable<Customer> {
    return this.api.post<Customer>(ApiEndpoints.customers.addresses(id), request);
  }

  addDocument(id: string, request: CustomerDocumentRequest): Observable<Customer> {
    return this.api.post<Customer>(ApiEndpoints.customers.documents(id), request);
  }

  decideKyc(id: string, decision: KycStatus, reason?: string): Observable<Customer> {
    return this.api.post<Customer>(ApiEndpoints.customers.kyc(id), undefined, {
      params: { decision, reason },
    });
  }

  setPreference(id: string, request: PreferenceRequest): Observable<Customer> {
    return this.api.post<Customer>(ApiEndpoints.customers.preferences(id), request);
  }

  changeStatus(id: string, status: CustomerStatus, reason?: string): Observable<Customer> {
    return this.api.post<Customer>(ApiEndpoints.customers.status(id), undefined, {
      params: { status, reason },
    });
  }

  // ---------- CRM ----------

  customer360(customerId: string): Observable<Customer360> {
    return this.api.get<Customer360>(ApiEndpoints.crm.customer360(customerId));
  }

  searchActivities(
    query: PageQuery & {
      customerId?: string | null;
      activityType?: ActivityType | null;
      branchId?: string | null;
    },
  ): Observable<PageResponse<CustomerActivity>> {
    return this.api.getPage<CustomerActivity>(ApiEndpoints.crm.activities, { ...query });
  }

  logActivity(request: ActivityRequest): Observable<CustomerActivity> {
    return this.api.post<CustomerActivity>(ApiEndpoints.crm.activities, request);
  }

  searchFollowUps(
    query: PageQuery & {
      status?: FollowUpStatus | null;
      customerId?: string | null;
      assignedTo?: string | null;
      branchId?: string | null;
    },
  ): Observable<PageResponse<FollowUp>> {
    return this.api.getPage<FollowUp>(ApiEndpoints.crm.followUps, { ...query });
  }

  myFollowUps(query: PageQuery = {}): Observable<PageResponse<FollowUp>> {
    return this.api.getPage<FollowUp>(ApiEndpoints.crm.myFollowUps, { ...query });
  }

  createFollowUp(request: FollowUpRequest): Observable<FollowUp> {
    return this.api.post<FollowUp>(ApiEndpoints.crm.followUps, request);
  }

  completeFollowUp(id: string, outcome: string): Observable<FollowUp> {
    return this.api.post<FollowUp>(ApiEndpoints.crm.completeFollowUp(id), { outcome });
  }

  cancelFollowUp(id: string, reason?: string): Observable<FollowUp> {
    return this.api.post<FollowUp>(ApiEndpoints.crm.cancelFollowUp(id), undefined, {
      params: { reason },
    });
  }

  listSegments(): Observable<Segment[]> {
    return this.api.get<Segment[]>(ApiEndpoints.crm.segments);
  }

  createSegment(request: SegmentRequest): Observable<Segment> {
    return this.api.post<Segment>(ApiEndpoints.crm.segments, request);
  }

  updateSegment(id: string, request: SegmentRequest): Observable<Segment> {
    return this.api.put<Segment>(ApiEndpoints.crm.segment(id), request);
  }

  /** Evaluates the segment's rules now and returns the matching customer ids. */
  segmentMembers(id: string): Observable<string[]> {
    return this.api.get<string[]>(ApiEndpoints.crm.segmentMembers(id));
  }

  searchCampaigns(
    query: PageQuery & { status?: CampaignStatus | null; branchId?: string | null },
  ): Observable<PageResponse<Campaign>> {
    return this.api.getPage<Campaign>(ApiEndpoints.crm.campaigns, { ...query });
  }

  createCampaign(request: CampaignRequest): Observable<Campaign> {
    return this.api.post<Campaign>(ApiEndpoints.crm.campaigns, request);
  }
}
