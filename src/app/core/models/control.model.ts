// Models for the control-side modules: the general ledger, the notification
// outbox, management reporting and the compliance and audit trail.

export const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number]['value'];

export const JOURNAL_SOURCES = [
  { value: 'SALE', label: 'Sale' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'PURCHASE_INVOICE', label: 'Purchase invoice' },
  { value: 'EXCHANGE', label: 'Exchange' },
  { value: 'LOYALTY', label: 'Loyalty' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'MANUAL', label: 'Manual' },
] as const;

export type JournalSource = (typeof JOURNAL_SOURCES)[number]['value'];

export interface LedgerAccount {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly accountType: AccountType;
  readonly parentId: string | null;
  /** Only a postable account may carry a journal line. */
  readonly postable: boolean;
  readonly systemAccount: boolean;
  readonly currency: string | null;
  readonly active: boolean;
}

export interface AccountRequest {
  readonly code: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly postable: boolean;
  readonly companyId: string | null;
  readonly currency: string | null;
  readonly description: string | null;
}

export interface JournalLine {
  readonly accountId: string;
  readonly accountCode: string;
  readonly accountName: string;
  readonly debit: number | null;
  readonly credit: number | null;
  readonly description: string | null;
  readonly partyType: string | null;
  readonly partyId: string | null;
}

/**
 * A posted journal entry.
 *
 * Entries are never edited — a mistake is corrected by posting a reversal,
 * which is why `reversalOfId` and `reversedById` both exist.
 */
export interface JournalEntry {
  readonly id: string;
  readonly entryNumber: string;
  readonly entryDate: string;
  readonly description: string;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly branchId: string | null;
  readonly totalDebit: number | null;
  readonly totalCredit: number | null;
  readonly postedAt: string | null;
  readonly postedBy: string | null;
  readonly reversalOfId: string | null;
  readonly reversedById: string | null;
  readonly lines: JournalLine[];
}

export interface ManualJournalRequest {
  readonly entryDate: string;
  readonly description: string;
  readonly branchId: string | null;
  readonly lines: ReadonlyArray<{
    readonly accountCode: string;
    readonly debit: number | null;
    readonly credit: number | null;
    readonly description: string | null;
  }>;
}

export interface ReportLine {
  readonly accountCode: string;
  readonly accountName: string;
  readonly amount: number | null;
}

export interface TrialBalanceReport {
  readonly from: string;
  readonly to: string;
  readonly totalDebit: number | null;
  readonly totalCredit: number | null;
  readonly balanced: boolean;
  readonly lines: ReadonlyArray<{
    readonly accountCode: string;
    readonly accountName: string;
    readonly accountType: AccountType;
    readonly openingBalance: number | null;
    readonly periodDebit: number | null;
    readonly periodCredit: number | null;
    readonly closingBalance: number | null;
  }>;
}

export interface ProfitAndLossReport {
  readonly from: string;
  readonly to: string;
  readonly totalIncome: number | null;
  readonly totalExpense: number | null;
  readonly grossProfit: number | null;
  readonly netProfit: number | null;
  readonly income: ReportLine[];
  readonly expenses: ReportLine[];
}

export interface BalanceSheetReport {
  readonly asOf: string;
  readonly totalAssets: number | null;
  readonly totalLiabilities: number | null;
  readonly totalEquity: number | null;
  readonly retainedEarnings: number | null;
  readonly balanced: boolean;
  readonly difference: number | null;
  readonly assets: ReportLine[];
  readonly liabilities: ReportLine[];
  readonly equity: ReportLine[];
}

export interface AgeingReport {
  readonly asOf: string;
  readonly partyType: string;
  readonly totalOutstanding: number | null;
  readonly rows: ReadonlyArray<{
    readonly partyId: string;
    readonly partyName: string;
    readonly outstanding: number | null;
    readonly oldestEntry: string | null;
    readonly daysOutstanding: number;
    readonly bucket: string;
  }>;
}

// ---------- notifications ----------

export const NOTIFICATION_CHANNELS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'PUSH', label: 'Push' },
  { value: 'IN_APP', label: 'In app' },
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]['value'];

export const NOTIFICATION_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SENT', label: 'Sent' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'ABANDONED', label: 'Abandoned' },
] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]['value'];

export interface OutboundNotification {
  readonly id: string;
  readonly eventType: string;
  readonly channel: NotificationChannel;
  readonly recipientType: string;
  readonly recipientId: string | null;
  readonly recipientAddress: string | null;
  readonly subject: string | null;
  readonly body: string | null;
  readonly status: NotificationStatus;
  readonly branchId: string | null;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly attemptCount: number;
  readonly sentAt: string | null;
  readonly failureReason: string | null;
  readonly createdAt: string;
}

export interface NotificationTemplate {
  readonly id: string;
  readonly code: string;
  readonly eventType: string;
  readonly channel: NotificationChannel;
  readonly locale: string | null;
  readonly subject: string | null;
  readonly body: string;
  readonly active: boolean;
}

export interface TemplateRequest {
  readonly code: string;
  readonly eventType: string;
  readonly locale: string | null;
  readonly subject: string | null;
  readonly body: string;
}

// ---------- compliance and audit ----------

export interface HighValueTransactionReport {
  readonly from: string;
  readonly to: string;
  readonly threshold: number | null;
  readonly transactionCount: number;
  readonly totalValue: number | null;
  readonly unverifiedCustomerCount: number;
  readonly transactions: ReadonlyArray<{
    readonly saleId: string;
    readonly saleNumber: string;
    readonly invoiceNumber: string | null;
    readonly saleDate: string;
    readonly branchId: string | null;
    readonly customerId: string;
    readonly customerName: string;
    readonly customerCode: string;
    readonly kycStatus: string;
    readonly kycVerified: boolean;
    readonly totalAmount: number | null;
    readonly cashAmount: number | null;
    readonly cashReportable: boolean;
  }>;
}

export interface KycStatusReport {
  readonly asOf: string;
  readonly totalCustomers: number;
  readonly verified: number;
  readonly pending: number;
  readonly rejected: number;
  readonly notRequired: number;
  readonly expired: number;
  readonly verifiedWithExpiredDocuments: number;
  readonly exceptions: ReadonlyArray<{
    readonly customerId: string;
    readonly customerCode: string;
    readonly customerName: string;
    readonly kycStatus: string;
    readonly issue: string;
    readonly documentExpiry: string | null;
    readonly lifetimeSpend: number | null;
  }>;
}

export interface DualAuthorisationReport {
  readonly from: string;
  readonly to: string;
  readonly totalControlled: number;
  readonly fullyAuthorised: number;
  readonly singleApproverOnly: number;
  readonly actions: ReadonlyArray<{
    readonly controlType: string;
    readonly entityId: string;
    readonly reference: string;
    readonly branchId: string | null;
    readonly firstApprover: string | null;
    readonly firstApprovedAt: string | null;
    readonly secondApprover: string | null;
    readonly secondApprovedAt: string | null;
    readonly status: string;
    readonly fullyAuthorised: boolean;
    readonly note: string | null;
  }>;
}

/** One entry in the platform's audit trail. */
export interface AuditLog {
  readonly id: string;
  readonly userId: string | null;
  readonly username: string | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly oldValue: string | null;
  readonly newValue: string | null;
  readonly branchId: string | null;
  readonly correlationId: string | null;
  readonly occurredAt: string;
}

// ---------- management reporting ----------

export interface SalesReport {
  readonly from: string;
  readonly to: string;
  readonly saleCount: number;
  readonly grossSales: number | null;
  readonly totalDiscount: number | null;
  readonly totalTax: number | null;
  readonly netSales: number | null;
  readonly averageOrderValue: number | null;
  readonly byDay: ReadonlyArray<{
    readonly date: string;
    readonly saleCount: number;
    readonly totalAmount: number | null;
  }>;
  readonly byBranch: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly saleCount: number;
    readonly totalAmount: number | null;
  }>;
  readonly byProductType: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly saleCount: number;
    readonly totalAmount: number | null;
  }>;
  readonly bySalesperson: ReadonlyArray<{
    readonly salespersonId: string;
    readonly username: string;
    readonly saleCount: number;
    readonly totalAmount: number | null;
  }>;
}

export interface LoyaltyLiabilityReport {
  readonly asOf: string;
  readonly enrolledCustomers: number;
  readonly [key: string]: unknown;
}
