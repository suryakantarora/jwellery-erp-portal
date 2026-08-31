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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import { Customer } from '../../../core/models/customer.model';
import {
  REPAIR_STATUSES,
  Repair,
  RepairStatus,
  repairStatusLabel,
} from '../../../core/models/operations.model';
import { Branch } from '../../../core/models/organization.model';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { FileService, formatFileSize } from '../../../core/services/file.service';
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
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import {
  TimelineComponent,
  TimelineEntry,
} from '../../../shared/components/timeline/timeline.component';
import { touchAll } from '../../../shared/utilities/form.utils';
import { CustomerService } from '../../customers/customer.service';
import { OrganizationService } from '../../organization/organization.service';
import { OperationsService } from '../operations.service';

type Step =
  'inspect' | 'estimate' | 'decision' | 'assign' | 'complete' | 'quality' | 'deliver' | null;

/**
 * Repair job cards.
 *
 * A piece in the workshop belongs to a customer, so every step is recorded
 * against the card — what was found, what it will cost, whether the customer
 * agreed, who did the work and what was handed back. The condition photographs
 * taken on arrival are what settle a later dispute.
 */
@Component({
  selector: 'app-repairs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MasterPanelComponent,
    DrawerComponent,
    FormFieldComponent,
    SpinnerComponent,
    StatusBadgeComponent,
    TimelineComponent,
  ],
  templateUrl: './repairs.component.html',
  styleUrl: './repairs.component.scss',
})
export class RepairsComponent {
  private readonly operations = inject(OperationsService);
  private readonly customers = inject(CustomerService);
  private readonly organization = inject(OrganizationService);
  private readonly branchContext = inject(BranchContextService);
  private readonly files = inject(FileService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canProcess = computed(() =>
    this.auth.hasPermission(Permission.REPAIR_PROCESS),
  );
  protected readonly canEstimate = computed(() =>
    this.auth.hasPermission(Permission.REPAIR_ESTIMATE),
  );

  protected readonly statuses = REPAIR_STATUSES;
  protected readonly statusLabel = repairStatusLabel;

  protected readonly customerList = signal<readonly Customer[]>([]);
  protected readonly branches = signal<readonly Branch[]>([]);

  protected readonly result = signal<PageResponse<Repair>>(emptyPage(environment.defaultPageSize));
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly statusFilter = signal<RepairStatus | ''>('');
  protected readonly sort = signal<TableSort | null>({ field: 'receivedDate', direction: 'desc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly viewing = signal<Repair | null>(null);
  protected readonly step = signal<Step>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly photoKeys = signal<readonly string[]>([]);

  private readonly refTpl = viewChild.required<TemplateRef<CellTemplateContext<Repair>>>('refCell');
  private readonly customerTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Repair>>>('customerCell');
  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Repair>>>('statusCell');
  private readonly costTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Repair>>>('costCell');

  protected readonly templates = computed(() => ({
    requestNumber: this.refTpl(),
    customerId: this.customerTpl(),
    status: this.statusTpl(),
    estimatedCost: this.costTpl(),
  }));

  protected readonly receiveForm = this.fb.nonNullable.group({
    customerId: ['', [Validators.required]],
    branchId: ['', [Validators.required]],
    itemDescription: ['', [Validators.required, Validators.maxLength(500)]],
    reportedProblem: ['', [Validators.required, Validators.maxLength(1000)]],
    conditionOnArrival: ['', [Validators.maxLength(1000)]],
    receivedWeight: [null as number | null, [Validators.min(0)]],
    promisedDate: [''],
    notes: [''],
  });

  protected readonly stepForm = this.fb.nonNullable.group({
    findings: [''],
    conditionNotes: [''],
    estimatedCost: [null as number | null, [Validators.min(0)]],
    estimatedDays: [null as number | null, [Validators.min(1)]],
    estimateNotes: [''],
    approved: [true],
    declineReason: [''],
    assignedTo: [''],
    finalCost: [null as number | null, [Validators.min(0)]],
    passed: [true],
    deliveredTo: [''],
    deliveredWeight: [null as number | null, [Validators.min(0)]],
    notes: [''],
  });

  protected readonly columns: readonly TableColumn<Repair>[] = [
    { key: 'requestNumber', header: 'Job card', width: '200px' },
    { key: 'customerId', header: 'Customer', width: '200px' },
    { key: 'itemDescription', header: 'Piece', value: (row) => row.itemDescription },
    {
      key: 'promisedDate',
      header: 'Promised',
      mono: true,
      width: '130px',
      value: (row) => row.promisedDate,
    },
    {
      key: 'assignedTo',
      header: 'Karigar',
      mono: true,
      hideOnMobile: true,
      width: '140px',
      value: (row) => row.assignedTo,
    },
    { key: 'estimatedCost', header: 'Cost', width: '160px' },
    { key: 'status', header: 'Status', width: '170px' },
  ];

  /** The card's history as timeline entries, newest first. */
  protected readonly timeline = computed<readonly TimelineEntry[]>(() =>
    [...(this.viewing()?.history ?? [])]
      .map((entry) => ({
        id: `${entry.occurredAt}-${entry.toStatus}`,
        title: repairStatusLabel(entry.toStatus),
        detail: entry.notes,
        meta: entry.performedBy,
        at: entry.occurredAt,
        tone:
          entry.toStatus === 'DECLINED' || entry.toStatus === 'CANCELLED'
            ? ('danger' as const)
            : entry.toStatus === 'DELIVERED'
              ? ('success' as const)
              : ('accent' as const),
      }))
      .sort((left, right) => right.at.localeCompare(left.at)),
  );

  protected readonly trackById = (row: Repair) => row.id;

  constructor() {
    this.customers
      .search({ size: 300, sort: 'fullName,asc' })
      .subscribe({ next: (page) => this.customerList.set(page.content) });
    this.organization.listAllBranches().subscribe({ next: (r) => this.branches.set(r) });
    this.load();
  }

  protected customerName(id: string): string {
    return this.customerList().find((customer) => customer.id === id)?.fullName ?? '—';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.operations
      .searchRepairs({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        status: this.statusFilter() || null,
      })
      .subscribe({
        next: (page) => {
          this.result.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.result.set(emptyPage(this.size()));
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  protected onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as RepairStatus | '');
    this.page.set(0);
    this.load();
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
    this.load();
  }

  protected onPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
    this.load();
  }

  // ---------- receiving ----------

  protected startCreate(): void {
    this.receiveForm.reset({
      branchId: this.branchContext.activeBranchId() ?? this.branches()[0]?.id ?? '',
      customerId: '',
    });
    this.photoKeys.set([]);
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  protected onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.files.upload(file, 'repair-condition').subscribe({
      next: (stored) => {
        this.uploading.set(false);
        this.photoKeys.update((current) => [...current, stored.storageKey]);
        this.toast.success(
          'Photograph attached',
          `${stored.fileName} · ${formatFileSize(stored.sizeBytes)}`,
        );
      },
      error: (error: AppError) => {
        this.uploading.set(false);
        this.toast.error('Upload failed', error.message);
      },
    });
    input.value = '';
  }

  protected close(): void {
    this.creating.set(false);
    this.viewing.set(null);
    this.step.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.receiveForm.invalid) {
      touchAll(this.receiveForm);
      return;
    }

    const value = this.receiveForm.getRawValue();
    this.saving.set(true);
    this.operations
      .receiveRepair({
        customerId: value.customerId,
        branchId: value.branchId,
        jewelleryItemId: null,
        itemDescription: value.itemDescription,
        reportedProblem: value.reportedProblem,
        conditionOnArrival: value.conditionOnArrival || null,
        receivedWeight: value.receivedWeight,
        conditionPhotoKeys: this.photoKeys().length > 0 ? this.photoKeys().join(',') : null,
        promisedDate: value.promisedDate || null,
        notes: value.notes || null,
      })
      .subscribe({
        next: (repair) => {
          this.saving.set(false);
          this.creating.set(false);
          this.toast.success('Job card raised', repair.requestNumber);
          this.page.set(0);
          this.load();
          this.view(repair);
        },
        error: (error: AppError) => {
          this.saving.set(false);
          this.formError.set(error.message);
        },
      });
  }

  // ---------- steps ----------

  protected view(repair: Repair): void {
    this.viewing.set(repair);
    this.operations.getRepair(repair.id).subscribe({
      next: (fresh) => this.viewing.set(fresh),
      error: () => undefined,
    });
  }

  protected openStep(step: Step): void {
    const repair = this.viewing();
    if (!repair) {
      return;
    }
    this.stepForm.reset({
      approved: true,
      passed: true,
      estimatedCost: repair.estimatedCost,
      estimatedDays: repair.estimatedDays,
      finalCost: repair.finalCost ?? repair.estimatedCost,
      assignedTo: repair.assignedTo ?? '',
      deliveredTo: this.customerName(repair.customerId),
      deliveredWeight: repair.receivedWeight,
    });
    this.submitted.set(false);
    this.formError.set(null);
    this.step.set(step);
  }

  protected saveStep(): void {
    this.submitted.set(true);
    this.formError.set(null);

    const repair = this.viewing();
    const step = this.step();
    if (!repair || !step) {
      return;
    }

    const value = this.stepForm.getRawValue();
    const calls = {
      inspect: () =>
        this.operations.inspect(repair.id, value.findings, value.conditionNotes || null),
      estimate: () =>
        this.operations.estimate(
          repair.id,
          value.estimatedCost ?? 0,
          value.estimatedDays,
          value.estimateNotes || null,
        ),
      decision: () =>
        this.operations.customerDecision(repair.id, value.approved, value.declineReason || null),
      assign: () => this.operations.assign(repair.id, value.assignedTo, value.notes || null),
      complete: () => this.operations.completeWork(repair.id, value.finalCost, value.notes || null),
      quality: () => this.operations.qualityCheck(repair.id, value.passed, value.notes || null),
      deliver: () =>
        this.operations.deliverRepair(repair.id, {
          deliveredTo: value.deliveredTo,
          deliveredWeight: value.deliveredWeight,
          returnToLocationId: null,
          notes: value.notes || null,
        }),
    };

    // Guard the fields each step genuinely needs, since one form serves them all.
    const required: Record<string, boolean> = {
      inspect: !!value.findings,
      estimate: value.estimatedCost !== null,
      decision: true,
      assign: !!value.assignedTo,
      complete: true,
      quality: true,
      deliver: !!value.deliveredTo,
    };
    if (!required[step]) {
      this.formError.set('Fill in the field this step needs.');
      return;
    }

    this.saving.set(true);
    calls[step]().subscribe({
      next: (fresh) => {
        this.saving.set(false);
        this.step.set(null);
        this.viewing.set(fresh);
        this.toast.success('Job card updated', repairStatusLabel(fresh.status));
        this.view(fresh);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected async cancel(repair: Repair): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Cancel job card',
      message: 'The repair is abandoned. The piece should be returned to the customer.',
      detail: repair.requestNumber,
      confirmLabel: 'Cancel job',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.operations.cancelRepair(repair.id, 'Cancelled at the counter').subscribe({
      next: (fresh) => {
        this.viewing.set(fresh);
        this.toast.success('Job card cancelled', repair.requestNumber);
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not cancel the job', error.message),
    });
  }

  protected photoList(repair: Repair): readonly string[] {
    return repair.conditionPhotoKeys ? repair.conditionPhotoKeys.split(',').filter(Boolean) : [];
  }

  protected downloadPhoto(key: string, index: number): void {
    this.files.saveAs(key, `condition-${index + 1}`).subscribe({
      error: (error: AppError) =>
        this.toast.error('Could not download the photograph', error.message),
    });
  }

  protected can(repair: Repair, status: RepairStatus): boolean {
    return repair.allowedTransitions.includes(status);
  }
}
