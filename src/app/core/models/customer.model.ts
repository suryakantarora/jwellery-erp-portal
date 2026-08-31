export const CUSTOMER_TYPES = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'CORPORATE', label: 'Corporate' },
] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number]['value'];

export const CUSTOMER_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'BLACKLISTED', label: 'Blacklisted' },
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]['value'];

export const KYC_STATUSES = [
  { value: 'NOT_REQUIRED', label: 'Not required' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
] as const;

export type KycStatus = (typeof KYC_STATUSES)[number]['value'];

export interface CustomerAddress {
  readonly id: string;
  readonly addressType: string | null;
  readonly addressLine1: string;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly province: string | null;
  readonly postalCode: string | null;
  readonly country: string | null;
  readonly defaultAddress: boolean;
}

export interface CustomerDocument {
  readonly id: string;
  readonly documentType: string;
  readonly documentNumber: string;
  readonly storageKey: string | null;
  readonly issueDate: string | null;
  readonly expiryDate: string | null;
  readonly verified: boolean;
  readonly expired: boolean;
}

/**
 * A customer.
 *
 * The list endpoint returns a summary with `addresses`, `documents` and
 * `preferences` null; fetching one by id fills them in. Null means "not
 * loaded", not "none".
 */
export interface Customer {
  readonly id: string;
  readonly customerCode: string;
  readonly customerType: CustomerType;
  readonly fullName: string;
  readonly companyName: string | null;
  readonly phone: string;
  readonly alternatePhone: string | null;
  readonly email: string | null;
  readonly dateOfBirth: string | null;
  readonly anniversaryDate: string | null;
  readonly gender: string | null;
  readonly taxNumber: string | null;
  readonly registeredBranchId: string | null;
  readonly kycStatus: KycStatus;
  readonly kycVerifiedAt: string | null;
  readonly status: CustomerStatus;
  readonly notes: string | null;
  readonly addresses: CustomerAddress[] | null;
  readonly documents: CustomerDocument[] | null;
  readonly preferences: Record<string, string> | null;
}

export interface CustomerRequest {
  readonly customerCode: string | null;
  readonly customerType: CustomerType | null;
  readonly fullName: string;
  readonly companyName: string | null;
  readonly phone: string;
  readonly alternatePhone: string | null;
  readonly email: string | null;
  readonly dateOfBirth: string | null;
  readonly anniversaryDate: string | null;
  readonly gender: string | null;
  readonly taxNumber: string | null;
  readonly registeredBranchId: string | null;
  readonly notes: string | null;
}

export interface CustomerAddressRequest {
  readonly addressType: string | null;
  readonly addressLine1: string;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly province: string | null;
  readonly postalCode: string | null;
  readonly country: string | null;
  readonly defaultAddress: boolean;
}

export interface CustomerDocumentRequest {
  readonly documentType: string;
  readonly documentNumber: string;
  readonly storageKey: string | null;
  readonly fileName: string | null;
  readonly issueDate: string | null;
  readonly expiryDate: string | null;
}

export interface PreferenceRequest {
  readonly key: string;
  readonly value: string | null;
}

// ---------- CRM ----------

export const ACTIVITY_TYPES = [
  { value: 'CALL', label: 'Call' },
  { value: 'VISIT', label: 'Visit' },
  { value: 'MESSAGE', label: 'Message' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'FEEDBACK', label: 'Feedback' },
  { value: 'NOTE', label: 'Note' },
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number]['value'];

export const FOLLOW_UP_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number]['value'];

export const CAMPAIGN_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]['value'];

export interface CustomerActivity {
  readonly id: string;
  readonly customerId: string;
  readonly activityType: ActivityType;
  readonly subject: string;
  readonly details: string | null;
  readonly branchId: string | null;
  readonly handledBy: string | null;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly occurredAt: string;
}

export interface ActivityRequest {
  readonly customerId: string;
  readonly activityType: ActivityType;
  readonly subject: string;
  readonly details: string | null;
  readonly branchId: string | null;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly occurredAt: string | null;
}

export interface FollowUp {
  readonly id: string;
  readonly customerId: string;
  readonly title: string;
  readonly details: string | null;
  readonly dueDate: string;
  readonly assignedTo: string;
  readonly branchId: string | null;
  readonly status: FollowUpStatus;
  readonly priority: string | null;
  readonly overdue: boolean;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly completedAt: string | null;
  readonly completedBy: string | null;
  readonly outcome: string | null;
}

export interface FollowUpRequest {
  readonly customerId: string;
  readonly title: string;
  readonly details: string | null;
  readonly dueDate: string;
  readonly assignedTo: string;
  readonly branchId: string | null;
  readonly priority: string | null;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
}

/**
 * A customer segment.
 *
 * Membership is a rule, not a list: the backend evaluates the criteria on
 * demand, so a segment never goes stale.
 */
export interface Segment {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly branchId: string | null;
  readonly tierCode: string | null;
  readonly minLifetimeSpend: number | null;
  readonly minPurchaseCount: number | null;
  readonly inactiveDays: number | null;
  readonly birthdayMonth: number | null;
  readonly active: boolean;
}

export interface SegmentRequest {
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly branchId: string | null;
  readonly tierCode: string | null;
  readonly minLifetimeSpend: number | null;
  readonly minPurchaseCount: number | null;
  readonly inactiveDays: number | null;
  readonly birthdayMonth: number | null;
}

export interface Campaign {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: CampaignStatus;
  readonly segmentId: string | null;
  readonly templateCode: string | null;
  readonly branchId: string | null;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly targetCount: number;
  readonly sentCount: number;
  readonly launchedAt: string | null;
}

export interface CampaignRequest {
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly segmentId: string | null;
  readonly templateCode: string | null;
  readonly branchId: string | null;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
}

/** Everything worth knowing about a customer, in one call. */
export interface Customer360 {
  readonly customerId: string;
  readonly customerCode: string;
  readonly fullName: string;
  readonly phone: string;
  readonly kycVerified: boolean;
  readonly purchases: {
    readonly purchaseCount: number;
    readonly lifetimeSpend: number | null;
    readonly averageOrderValue: number | null;
    readonly firstPurchaseDate: string | null;
    readonly lastPurchaseDate: string | null;
    readonly daysSinceLastPurchase: number | null;
  };
  readonly loyalty: {
    readonly enrolled: boolean;
    readonly tierCode: string | null;
    readonly tierName: string | null;
    readonly pointsBalance: number;
    readonly lifetimePoints: number;
    readonly redeemableValue: number | null;
  };
  readonly recentActivity: CustomerActivity[];
  readonly openFollowUps: FollowUp[];
}
