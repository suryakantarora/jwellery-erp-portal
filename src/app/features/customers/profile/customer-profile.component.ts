import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError } from '../../../core/models/api.model';
import {
  ACTIVITY_TYPES,
  ActivityRequest,
  ActivityType,
  Customer,
  Customer360,
  CustomerActivity,
  CustomerAddressRequest,
  CustomerDocumentRequest,
  CustomerRequest,
  FollowUp,
  FollowUpRequest,
  KYC_STATUSES,
} from '../../../core/models/customer.model';
import { FileService, formatFileSize } from '../../../core/services/file.service';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import {
  TimelineComponent,
  TimelineEntry,
} from '../../../shared/components/timeline/timeline.component';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { CustomerService } from '../customer.service';

type Editor = 'customer' | 'address' | 'document' | 'activity' | 'follow-up' | 'preference' | null;

/**
 * Customer 360.
 *
 * One page answering the question a salesperson actually has when someone walks
 * in: who is this, what have they bought, what do they like, what is owed to
 * them, and what did we promise to do next.
 */
@Component({
  selector: 'app-customer-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    PageHeaderComponent,
    DrawerComponent,
    FormFieldComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    SpinnerComponent,
    StatusBadgeComponent,
    TimelineComponent,
  ],
  templateUrl: './customer-profile.component.html',
  styleUrl: './customer-profile.component.scss',
})
export class CustomerProfileComponent {
  private readonly customers = inject(CustomerService);
  private readonly files = inject(FileService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly id = input.required<string>();

  protected readonly canManage = computed(() =>
    this.auth.hasPermission(Permission.CUSTOMER_MANAGE),
  );
  protected readonly canVerifyKyc = computed(() =>
    this.auth.hasPermission(Permission.CUSTOMER_KYC_VERIFY),
  );
  protected readonly canManageCrm = computed(() => this.auth.hasPermission(Permission.CRM_MANAGE));

  protected readonly activityTypes = ACTIVITY_TYPES;

  /** Readable wording for a KYC state, rather than the raw enum. */
  protected kycLabel(status: string): string {
    return KYC_STATUSES.find((entry) => entry.value === status)?.label ?? status;
  }

  protected readonly customer = signal<Customer | null>(null);
  protected readonly overview = signal<Customer360 | null>(null);
  protected readonly activities = signal<readonly CustomerActivity[]>([]);
  protected readonly followUps = signal<readonly FollowUp[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly editor = signal<Editor>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly uploadedName = signal<string | null>(null);

  protected readonly customerForm = this.fb.nonNullable.group({
    customerCode: [''],
    customerType: ['INDIVIDUAL'],
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    companyName: [''],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    alternatePhone: [''],
    email: ['', [Validators.email]],
    dateOfBirth: [''],
    anniversaryDate: [''],
    gender: [''],
    taxNumber: [''],
    registeredBranchId: [''],
    notes: [''],
  });

  protected readonly addressForm = this.fb.nonNullable.group({
    addressType: ['HOME'],
    addressLine1: ['', [Validators.required, Validators.maxLength(255)]],
    addressLine2: [''],
    city: [''],
    province: [''],
    postalCode: [''],
    country: [''],
    defaultAddress: [false],
  });

  protected readonly documentForm = this.fb.nonNullable.group({
    documentType: ['', [Validators.required, Validators.maxLength(50)]],
    documentNumber: ['', [Validators.required, Validators.maxLength(100)]],
    storageKey: [''],
    fileName: [''],
    issueDate: [''],
    expiryDate: [''],
  });

  protected readonly activityForm = this.fb.nonNullable.group({
    activityType: ['CALL' as ActivityType, [Validators.required]],
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    details: [''],
  });

  protected readonly followUpForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    details: [''],
    dueDate: ['', [Validators.required]],
    assignedTo: ['', [Validators.required, Validators.maxLength(100)]],
    priority: ['NORMAL'],
  });

  protected readonly preferenceForm = this.fb.nonNullable.group({
    key: ['', [Validators.required, Validators.maxLength(50)]],
    value: ['', [Validators.maxLength(255)]],
  });

  /** Preferences as pairs, since the API returns them as an object. */
  protected readonly preferencePairs = computed(() =>
    Object.entries(this.customer()?.preferences ?? {}).map(([key, value]) => ({ key, value })),
  );

  /**
   * The relationship as one story: registration, every logged interaction and
   * every follow-up, newest first.
   */
  protected readonly timeline = computed<readonly TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];

    for (const activity of this.activities()) {
      entries.push({
        id: `activity-${activity.id}`,
        title: activity.subject,
        detail: activity.details,
        meta: [activity.activityType, activity.handledBy].filter(Boolean).join(' · '),
        at: activity.occurredAt,
        tone: activity.activityType === 'COMPLAINT' ? 'danger' : 'accent',
      });
    }

    for (const followUp of this.followUps()) {
      entries.push({
        id: `follow-up-${followUp.id}`,
        title: followUp.title,
        detail:
          followUp.status === 'COMPLETED'
            ? (followUp.outcome ?? 'Completed')
            : `Due ${followUp.dueDate} · ${followUp.assignedTo}`,
        meta: `Follow-up · ${followUp.status.toLowerCase()}`,
        // Dates only; the backend gives no time for a follow-up.
        at: followUp.completedAt ?? `${followUp.dueDate}T00:00:00Z`,
        tone: followUp.status === 'COMPLETED' ? 'success' : followUp.overdue ? 'danger' : 'warning',
      });
    }

    return entries.sort((left, right) => right.at.localeCompare(left.at));
  });

  protected readonly openFollowUps = computed(() =>
    this.followUps().filter((followUp) => followUp.status === 'OPEN'),
  );

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected reload(): void {
    this.load(this.id());
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      customer: this.customers.get(id),
      overview: this.customers.customer360(id),
      activities: this.customers.searchActivities({ customerId: id, size: 100 }),
      followUps: this.customers.searchFollowUps({ customerId: id, size: 100 }),
    }).subscribe({
      next: ({ customer, overview, activities, followUps }) => {
        this.customer.set(customer);
        this.overview.set(overview);
        this.activities.set(activities.content);
        this.followUps.set(followUps.content);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  // ---------- editors ----------

  protected edit(): void {
    const customer = this.customer();
    if (!customer) {
      return;
    }
    this.customerForm.reset({
      customerCode: customer.customerCode,
      customerType: customer.customerType,
      fullName: customer.fullName,
      companyName: customer.companyName ?? '',
      phone: customer.phone,
      alternatePhone: customer.alternatePhone ?? '',
      email: customer.email ?? '',
      dateOfBirth: customer.dateOfBirth ?? '',
      anniversaryDate: customer.anniversaryDate ?? '',
      gender: customer.gender ?? '',
      taxNumber: customer.taxNumber ?? '',
      registeredBranchId: customer.registeredBranchId ?? '',
      notes: customer.notes ?? '',
    });
    this.open('customer');
  }

  protected addAddress(): void {
    this.addressForm.reset({ addressType: 'HOME', defaultAddress: false });
    this.open('address');
  }

  protected addDocument(): void {
    this.documentForm.reset();
    this.uploadedName.set(null);
    this.open('document');
  }

  protected logActivity(): void {
    this.activityForm.reset({ activityType: 'CALL' });
    this.open('activity');
  }

  protected addFollowUp(): void {
    this.followUpForm.reset({
      priority: 'NORMAL',
      assignedTo: this.auth.user()?.username ?? '',
      dueDate: '',
    });
    this.open('follow-up');
  }

  protected addPreference(): void {
    this.preferenceForm.reset();
    this.open('preference');
  }

  private open(editor: Editor): void {
    this.submitted.set(false);
    this.formError.set(null);
    this.editor.set(editor);
  }

  protected close(): void {
    this.editor.set(null);
  }

  protected onDocumentFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.files.upload(file, 'customer-document').subscribe({
      next: (stored) => {
        this.uploading.set(false);
        this.documentForm.patchValue({ storageKey: stored.storageKey, fileName: stored.fileName });
        this.uploadedName.set(`${stored.fileName} · ${formatFileSize(stored.sizeBytes)}`);
      },
      error: (error: AppError) => {
        this.uploading.set(false);
        this.toast.error('Upload failed', error.message);
      },
    });
    input.value = '';
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    const which = this.editor();
    if (which === 'customer') {
      this.commit(this.customerForm, (value) =>
        this.customers.update(this.id(), value as unknown as CustomerRequest),
      );
    } else if (which === 'address') {
      this.commit(this.addressForm, (value) =>
        this.customers.addAddress(this.id(), value as unknown as CustomerAddressRequest),
      );
    } else if (which === 'document') {
      this.commit(this.documentForm, (value) =>
        this.customers.addDocument(this.id(), value as unknown as CustomerDocumentRequest),
      );
    } else if (which === 'preference') {
      this.commit(this.preferenceForm, (value) =>
        this.customers.setPreference(this.id(), value as { key: string; value: string | null }),
      );
    } else if (which === 'activity') {
      this.saveActivity();
    } else if (which === 'follow-up') {
      this.saveFollowUp();
    }
  }

  private commit(
    form: Parameters<typeof applyServerErrors>[0],
    call: (value: Record<string, unknown>) => import('rxjs').Observable<Customer>,
  ): void {
    if (form.invalid) {
      touchAll(form);
      return;
    }
    const value = nullifyBlanks(form.getRawValue() as Record<string, unknown>);
    this.saving.set(true);
    call(value).subscribe({
      next: (customer) => {
        this.saving.set(false);
        this.editor.set(null);
        this.customer.set(customer);
        this.toast.success('Customer updated', customer.fullName);
        this.reload();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const unmatched = applyServerErrors(form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }

  private saveActivity(): void {
    if (this.activityForm.invalid) {
      touchAll(this.activityForm);
      return;
    }
    const value = this.activityForm.getRawValue();
    const request: ActivityRequest = {
      customerId: this.id(),
      activityType: value.activityType,
      subject: value.subject,
      details: value.details || null,
      branchId: null,
      referenceType: null,
      referenceId: null,
      occurredAt: null,
    };

    this.saving.set(true);
    this.customers.logActivity(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.editor.set(null);
        this.toast.success('Activity logged', value.subject);
        this.reload();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  private saveFollowUp(): void {
    if (this.followUpForm.invalid) {
      touchAll(this.followUpForm);
      return;
    }
    const value = this.followUpForm.getRawValue();
    const request: FollowUpRequest = {
      customerId: this.id(),
      title: value.title,
      details: value.details || null,
      dueDate: value.dueDate,
      assignedTo: value.assignedTo,
      branchId: null,
      priority: value.priority || null,
      referenceType: null,
      referenceId: null,
    };

    this.saving.set(true);
    this.customers.createFollowUp(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.editor.set(null);
        this.toast.success('Follow-up scheduled', value.title);
        this.reload();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  // ---------- actions ----------

  protected async completeFollowUp(followUp: FollowUp): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Complete follow-up',
      message: 'The task is closed and recorded on the customer’s timeline.',
      detail: followUp.title,
      confirmLabel: 'Mark complete',
    });
    if (!confirmed) {
      return;
    }

    this.customers.completeFollowUp(followUp.id, 'Completed from the customer profile').subscribe({
      next: () => {
        this.toast.success('Follow-up completed', followUp.title);
        this.reload();
      },
      error: (error: AppError) => this.toast.error('Could not complete the task', error.message),
    });
  }

  protected async decideKyc(decision: 'VERIFIED' | 'REJECTED'): Promise<void> {
    const customer = this.customer();
    if (!customer) {
      return;
    }

    const confirmed = await this.confirm.ask({
      title: decision === 'VERIFIED' ? 'Verify KYC' : 'Reject KYC',
      message:
        decision === 'VERIFIED'
          ? 'Confirms the documents on file identify this customer. The decision is audited.'
          : 'Marks the documents as insufficient. The customer must supply new ones.',
      detail: `${customer.customerCode} — ${customer.fullName}`,
      confirmLabel: decision === 'VERIFIED' ? 'Verify' : 'Reject',
      tone: decision === 'VERIFIED' ? 'default' : 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.customers.decideKyc(customer.id, decision).subscribe({
      next: (updated) => {
        this.customer.set(updated);
        this.toast.success('KYC updated', updated.kycStatus);
        this.reload();
      },
      error: (error: AppError) => this.toast.error('Could not record the decision', error.message),
    });
  }

  protected downloadDocument(storageKey: string, name: string): void {
    this.files.saveAs(storageKey, name).subscribe({
      error: (error: AppError) => this.toast.error('Could not download the file', error.message),
    });
  }
}
