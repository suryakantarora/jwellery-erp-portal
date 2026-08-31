import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import {
  ACCOUNT_TYPES,
  BalanceSheetReport,
  JournalEntry,
  LedgerAccount,
  ProfitAndLossReport,
  TrialBalanceReport,
} from '../../../core/models/control.model';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
  toSortParam,
} from '../../../shared/components/data-table/data-table.model';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../../shared/components/master-panel/master-panel.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { touchAll } from '../../../shared/utilities/form.utils';
import { localPage } from '../../../shared/utilities/list.utils';
import { ControlService } from '../control.service';

type Tab = 'journal' | 'accounts' | 'reports';

/** One line of a manual journal being drafted. */
interface DraftLine {
  readonly key: number;
  accountCode: FormControl<string>;
  debit: FormControl<number | null>;
  credit: FormControl<number | null>;
  description: FormControl<string>;
}

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Finance administration: the chart of accounts, the journal, and the three
 * statements a manager actually asks for.
 *
 * Almost every entry here is posted by another module — a sale, a payment, a
 * receipt. The manual entry exists for the corrections those modules cannot
 * make, and nothing is ever edited: a mistake is reversed, never overwritten.
 */
@Component({
  selector: 'app-finance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    PageHeaderComponent,
    MasterPanelComponent,
    DrawerComponent,
    FormFieldComponent,
    SpinnerComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss',
})
export class FinanceComponent {
  private readonly control = inject(ControlService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() => this.auth.hasPermission(Permission.FINANCE_MANAGE));
  protected readonly canPost = computed(() => this.auth.hasPermission(Permission.FINANCE_POST));

  protected readonly accountTypes = ACCOUNT_TYPES;

  protected readonly tab = signal<Tab>('journal');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'journal', label: 'Journal' },
    { id: 'accounts', label: 'Chart of accounts' },
    { id: 'reports', label: 'Statements' },
  ];

  protected readonly accounts = signal<readonly LedgerAccount[]>([]);
  protected readonly entries = signal<PageResponse<JournalEntry>>(
    emptyPage(environment.defaultPageSize),
  );

  protected readonly trialBalance = signal<TrialBalanceReport | null>(null);
  protected readonly profitAndLoss = signal<ProfitAndLossReport | null>(null);
  protected readonly balanceSheet = signal<BalanceSheetReport | null>(null);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly from = signal(monthStart());
  protected readonly to = signal(today());
  protected readonly sort = signal<TableSort | null>({ field: 'entryDate', direction: 'desc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly viewing = signal<JournalEntry | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly entryRefTpl =
    viewChild.required<TemplateRef<CellTemplateContext<JournalEntry>>>('entryRefCell');
  private readonly entryAmountTpl =
    viewChild.required<TemplateRef<CellTemplateContext<JournalEntry>>>('entryAmountCell');
  private readonly entryStateTpl =
    viewChild.required<TemplateRef<CellTemplateContext<JournalEntry>>>('entryStateCell');
  private readonly accountTypeTpl =
    viewChild.required<TemplateRef<CellTemplateContext<LedgerAccount>>>('accountTypeCell');
  private readonly accountFlagsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<LedgerAccount>>>('accountFlagsCell');

  protected readonly entryTemplates = computed(() => ({
    entryNumber: this.entryRefTpl(),
    totalDebit: this.entryAmountTpl(),
    postedAt: this.entryStateTpl(),
  }));

  protected readonly accountTemplates = computed(() => ({
    accountType: this.accountTypeTpl(),
    postable: this.accountFlagsTpl(),
  }));

  protected readonly accountForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    parentId: [''],
    postable: [true],
    currency: ['INR', [Validators.minLength(3), Validators.maxLength(3)]],
    description: [''],
  });

  protected readonly journalForm = this.fb.nonNullable.group({
    entryDate: [today(), [Validators.required]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
  });

  private nextLineKey = 0;
  protected readonly lines = signal<readonly DraftLine[]>([]);

  /** A journal only posts when both sides agree. */
  protected totals(): { debit: number; credit: number; balanced: boolean } {
    const debit = this.lines().reduce((sum, line) => sum + (line.debit.value ?? 0), 0);
    const credit = this.lines().reduce((sum, line) => sum + (line.credit.value ?? 0), 0);
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 && debit > 0 };
  }

  protected readonly entryColumns: readonly TableColumn<JournalEntry>[] = [
    { key: 'entryNumber', header: 'Entry', width: '200px' },
    {
      key: 'entryDate',
      header: 'Date',
      mono: true,
      sortable: true,
      width: '130px',
      value: (row) => row.entryDate,
    },
    { key: 'description', header: 'Description', value: (row) => row.description },
    {
      key: 'referenceType',
      header: 'Source',
      hideOnMobile: true,
      width: '150px',
      value: (row) => row.referenceType,
    },
    { key: 'totalDebit', header: 'Amount', width: '150px' },
    { key: 'postedAt', header: 'Posted', width: '190px' },
  ];

  protected readonly accountColumns: readonly TableColumn<LedgerAccount>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '130px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Account', sortable: true, value: (row) => row.name },
    { key: 'accountType', header: 'Type', width: '150px' },
    { key: 'postable', header: 'Flags' },
    {
      key: 'currency',
      header: 'Currency',
      mono: true,
      align: 'center',
      width: '110px',
      value: (row) => row.currency,
    },
  ];

  protected readonly accountPage = computed(() =>
    localPage(this.accounts(), {
      search: this.search(),
      searchFields: [(row) => row.code, (row) => row.name],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  /** Postable accounts only — the journal cannot touch a summary account. */
  protected readonly postableAccounts = computed(() =>
    this.accounts().filter((account) => account.postable && account.active),
  );

  protected readonly trackById = (row: { id: string }) => row.id;
  protected readonly trackLine = (line: DraftLine) => line.key;

  constructor() {
    this.control.listAccounts().subscribe({ next: (r) => this.accounts.set(r) });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const tab = this.tab();

    if (tab === 'accounts') {
      this.control.listAccounts().subscribe({
        next: (accounts) => {
          this.accounts.set(accounts);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
      return;
    }

    if (tab === 'reports') {
      this.control.trialBalance(this.from(), this.to()).subscribe({
        next: (report) => this.trialBalance.set(report),
        error: (error: AppError) => this.fail(error),
      });
      this.control.profitAndLoss(this.from(), this.to()).subscribe({
        next: (report) => this.profitAndLoss.set(report),
        error: () => undefined,
      });
      this.control.balanceSheet(this.to()).subscribe({
        next: (report) => {
          this.balanceSheet.set(report);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      return;
    }

    this.control
      .searchJournalEntries({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        from: this.from(),
        to: this.to(),
      })
      .subscribe({
        next: (page) => {
          this.entries.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
  }

  private fail(error: AppError): void {
    this.error.set(error);
    this.loading.set(false);
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.search.set('');
    this.page.set(0);
    this.creating.set(false);
    this.sort.set(
      tab === 'accounts'
        ? { field: 'code', direction: 'asc' }
        : { field: 'entryDate', direction: 'desc' },
    );
    this.load();
  }

  protected onDate(which: 'from' | 'to', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    (which === 'from' ? this.from : this.to).set(value);
    this.page.set(0);
    this.load();
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
    if (this.tab() === 'journal') {
      this.load();
    }
  }

  protected onPage(page: number): void {
    this.page.set(page);
    if (this.tab() === 'journal') {
      this.load();
    }
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
    if (this.tab() === 'journal') {
      this.load();
    }
  }

  // ---------- drafting ----------

  protected startCreate(): void {
    this.accountForm.reset({ postable: true, currency: 'INR' });
    this.journalForm.reset({ entryDate: today(), description: '' });
    this.lines.set([]);
    this.addLine();
    this.addLine();
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  protected addLine(): void {
    this.lines.update((current) => [
      ...current,
      {
        key: this.nextLineKey++,
        accountCode: this.fb.nonNullable.control('', [Validators.required]),
        debit: this.fb.control<number | null>(null),
        credit: this.fb.control<number | null>(null),
        description: this.fb.nonNullable.control(''),
      },
    ]);
  }

  protected removeLine(key: number): void {
    this.lines.update((current) => current.filter((line) => line.key !== key));
  }

  protected close(): void {
    this.creating.set(false);
    this.viewing.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.tab() === 'accounts') {
      if (this.accountForm.invalid) {
        touchAll(this.accountForm);
        return;
      }
      const value = this.accountForm.getRawValue();
      this.saving.set(true);
      this.control
        .createAccount({
          code: value.code,
          name: value.name,
          parentId: value.parentId || null,
          postable: value.postable,
          companyId: null,
          currency: value.currency || null,
          description: value.description || null,
        })
        .subscribe({
          next: (account) => {
            this.saving.set(false);
            this.creating.set(false);
            this.toast.success('Account created', `${account.code} — ${account.name}`);
            this.load();
          },
          error: (error: AppError) => {
            this.saving.set(false);
            this.formError.set(error.message);
          },
        });
      return;
    }

    if (this.journalForm.invalid) {
      touchAll(this.journalForm);
      return;
    }
    const totals = this.totals();
    if (!totals.balanced) {
      this.formError.set(
        `Debits and credits must agree and be greater than zero — currently ${totals.debit.toFixed(2)} against ${totals.credit.toFixed(2)}.`,
      );
      return;
    }
    if (this.lines().some((line) => !line.accountCode.value)) {
      this.formError.set('Every line needs an account.');
      return;
    }

    const value = this.journalForm.getRawValue();
    this.saving.set(true);
    this.control
      .postManualEntry({
        entryDate: value.entryDate,
        description: value.description,
        branchId: null,
        lines: this.lines().map((line) => ({
          accountCode: line.accountCode.value,
          debit: line.debit.value,
          credit: line.credit.value,
          description: line.description.value || null,
        })),
      })
      .subscribe({
        next: (entry) => {
          this.saving.set(false);
          this.creating.set(false);
          this.toast.success('Entry posted', entry.entryNumber);
          this.page.set(0);
          this.load();
        },
        error: (error: AppError) => {
          this.saving.set(false);
          this.formError.set(error.message);
        },
      });
  }

  protected view(entry: JournalEntry): void {
    this.viewing.set(entry);
    this.control.getJournalEntry(entry.id).subscribe({
      next: (fresh) => this.viewing.set(fresh),
      error: () => undefined,
    });
  }

  protected async reverse(entry: JournalEntry): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Reverse the entry',
      message:
        'A mirror-image entry is posted to cancel this one. Neither entry is ever edited or removed.',
      detail: `${entry.entryNumber} — ${entry.description}`,
      confirmLabel: 'Post reversal',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.control.reverseEntry(entry.id, 'Reversed from the finance screen').subscribe({
      next: (reversal) => {
        this.viewing.set(null);
        this.toast.success('Reversal posted', reversal.entryNumber);
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not reverse the entry', error.message),
    });
  }
}
