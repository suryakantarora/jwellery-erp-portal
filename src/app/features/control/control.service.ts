import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  AccountRequest,
  AgeingReport,
  AuditLog,
  BalanceSheetReport,
  DualAuthorisationReport,
  HighValueTransactionReport,
  JournalEntry,
  JournalSource,
  KycStatusReport,
  LedgerAccount,
  ManualJournalRequest,
  NotificationChannel,
  NotificationStatus,
  NotificationTemplate,
  OutboundNotification,
  ProfitAndLossReport,
  SalesReport,
  TemplateRequest,
  TrialBalanceReport,
} from '../../core/models/control.model';
import { InventoryValuationReport, StockAgeingReport } from '../../core/models/inventory.model';
import { ApiService } from '../../core/services/api.service';

/**
 * The control-side modules: the general ledger, the notification outbox,
 * management reporting, and the compliance and audit trail.
 *
 * Everything here is read-heavy and derived from what the business modules
 * already recorded — the ledger is posted to by those modules, not by this UI.
 */
@Injectable({ providedIn: 'root' })
export class ControlService {
  private readonly api = inject(ApiService);

  // ---------- finance ----------

  listAccounts(): Observable<LedgerAccount[]> {
    return this.api.get<LedgerAccount[]>(ApiEndpoints.finance.accounts);
  }

  createAccount(request: AccountRequest): Observable<LedgerAccount> {
    return this.api.post<LedgerAccount>(ApiEndpoints.finance.accounts, request);
  }

  deactivateAccount(id: string): Observable<LedgerAccount> {
    return this.api.delete<LedgerAccount>(ApiEndpoints.finance.account(id));
  }

  accountLedger(id: string, from: string, to: string): Observable<unknown[]> {
    return this.api.get<unknown[]>(ApiEndpoints.finance.ledger(id), { params: { from, to } });
  }

  searchJournalEntries(
    query: PageQuery & {
      source?: JournalSource | null;
      branchId?: string | null;
      from?: string | null;
      to?: string | null;
    },
  ): Observable<PageResponse<JournalEntry>> {
    return this.api.getPage<JournalEntry>(ApiEndpoints.finance.journalEntries, { ...query });
  }

  getJournalEntry(id: string): Observable<JournalEntry> {
    return this.api.get<JournalEntry>(ApiEndpoints.finance.journalEntry(id));
  }

  postManualEntry(request: ManualJournalRequest): Observable<JournalEntry> {
    return this.api.post<JournalEntry>(ApiEndpoints.finance.journalEntries, request);
  }

  /** Corrects an entry by posting its mirror image; nothing is ever edited. */
  reverseEntry(id: string, reason: string): Observable<JournalEntry> {
    return this.api.post<JournalEntry>(ApiEndpoints.finance.reverseEntry(id), undefined, {
      params: { reason },
    });
  }

  trialBalance(from: string, to: string, branchId?: string | null): Observable<TrialBalanceReport> {
    return this.api.get<TrialBalanceReport>(ApiEndpoints.finance.trialBalance, {
      params: { from, to, branchId: branchId ?? undefined },
    });
  }

  profitAndLoss(
    from: string,
    to: string,
    branchId?: string | null,
  ): Observable<ProfitAndLossReport> {
    return this.api.get<ProfitAndLossReport>(ApiEndpoints.finance.profitAndLoss, {
      params: { from, to, branchId: branchId ?? undefined },
    });
  }

  balanceSheet(asOf?: string | null, branchId?: string | null): Observable<BalanceSheetReport> {
    return this.api.get<BalanceSheetReport>(ApiEndpoints.finance.balanceSheet, {
      params: { asOf: asOf ?? undefined, branchId: branchId ?? undefined },
    });
  }

  receivablesAgeing(): Observable<AgeingReport> {
    return this.api.get<AgeingReport>(ApiEndpoints.finance.receivablesAgeing);
  }

  // ---------- notifications ----------

  searchNotifications(
    query: PageQuery & {
      status?: NotificationStatus | null;
      channel?: NotificationChannel | null;
      eventType?: string | null;
      recipientId?: string | null;
    },
  ): Observable<PageResponse<OutboundNotification>> {
    return this.api.getPage<OutboundNotification>(ApiEndpoints.notifications.root, { ...query });
  }

  listTemplates(): Observable<NotificationTemplate[]> {
    return this.api.get<NotificationTemplate[]>(ApiEndpoints.notifications.templates);
  }

  createTemplate(request: TemplateRequest): Observable<NotificationTemplate> {
    return this.api.post<NotificationTemplate>(ApiEndpoints.notifications.templates, request);
  }

  updateTemplate(id: string, request: TemplateRequest): Observable<NotificationTemplate> {
    return this.api.put<NotificationTemplate>(ApiEndpoints.notifications.template(id), request);
  }

  setTemplateActive(id: string, active: boolean): Observable<NotificationTemplate> {
    return this.api.post<NotificationTemplate>(
      ApiEndpoints.notifications.templateActive(id),
      undefined,
      { params: { active } },
    );
  }

  // ---------- reporting ----------

  salesReport(from: string, to: string, branchId?: string | null): Observable<SalesReport> {
    return this.api.get<SalesReport>(ApiEndpoints.reports.sales, {
      params: { from, to, branchId: branchId ?? undefined },
    });
  }

  inventoryValuation(branchId?: string | null): Observable<InventoryValuationReport> {
    return this.api.get<InventoryValuationReport>(ApiEndpoints.reports.inventoryValuation, {
      params: { branchId: branchId ?? undefined },
    });
  }

  stockAgeing(branchId?: string | null): Observable<StockAgeingReport> {
    return this.api.get<StockAgeingReport>(ApiEndpoints.reports.stockAgeing, {
      params: { branchId: branchId ?? undefined },
    });
  }

  // ---------- compliance ----------

  highValueTransactions(
    from: string,
    to: string,
    branchId?: string | null,
    threshold?: number | null,
  ): Observable<HighValueTransactionReport> {
    return this.api.get<HighValueTransactionReport>(ApiEndpoints.compliance.highValue, {
      params: {
        from,
        to,
        branchId: branchId ?? undefined,
        threshold: threshold ?? undefined,
      },
    });
  }

  kycStatusReport(): Observable<KycStatusReport> {
    return this.api.get<KycStatusReport>(ApiEndpoints.compliance.kycStatus);
  }

  dualAuthorisation(
    from: string,
    to: string,
    branchId?: string | null,
  ): Observable<DualAuthorisationReport> {
    return this.api.get<DualAuthorisationReport>(ApiEndpoints.compliance.dualAuthorisation, {
      params: { from, to, branchId: branchId ?? undefined },
    });
  }

  searchAuditLogs(
    query: PageQuery & {
      entityType?: string | null;
      entityId?: string | null;
      userId?: string | null;
    },
  ): Observable<PageResponse<AuditLog>> {
    return this.api.getPage<AuditLog>(ApiEndpoints.auditLogs.root, { ...query });
  }
}
