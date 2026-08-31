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
  GoodsReceipt,
  PurchaseOrder,
  SUPPLIER_STATUSES,
  Supplier,
  SupplierBankAccountRequest,
  SupplierContactRequest,
  SupplierRequest,
  SupplierStatus,
} from '../../../core/models/procurement.model';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { ProcurementService } from '../procurement.service';

type Editor = 'supplier' | 'contact' | 'bank' | null;

/**
 * One supplier in full: terms, the people to call, where to pay, and how they
 * have actually traded.
 *
 * Performance is derived from the orders and receipts already recorded rather
 * than from a separate scorecard — a supplier's record *is* their history.
 */
@Component({
  selector: 'app-supplier-detail',
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
    RelativeTimePipe,
  ],
  templateUrl: './supplier-detail.component.html',
  styleUrl: './supplier-detail.component.scss',
})
export class SupplierDetailComponent {
  private readonly procurement = inject(ProcurementService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly id = input.required<string>();

  protected readonly canManage = computed(() =>
    this.auth.hasPermission(Permission.SUPPLIER_MANAGE),
  );
  protected readonly statuses = SUPPLIER_STATUSES;

  protected readonly supplier = signal<Supplier | null>(null);
  protected readonly orders = signal<readonly PurchaseOrder[]>([]);
  protected readonly receipts = signal<readonly GoodsReceipt[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly editor = signal<Editor>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly supplierForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    legalName: ['', [Validators.maxLength(200)]],
    taxNumber: ['', [Validators.maxLength(50)]],
    supplierType: ['', [Validators.maxLength(30)]],
    addressLine: ['', [Validators.maxLength(255)]],
    city: ['', [Validators.maxLength(100)]],
    country: ['', [Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    currency: ['', [Validators.minLength(3), Validators.maxLength(3)]],
    paymentTermsDays: [null as number | null, [Validators.min(0)]],
    creditLimit: [null as number | null, [Validators.min(0)]],
    notes: ['', [Validators.maxLength(500)]],
  });

  protected readonly contactForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    designation: ['', [Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    primaryContact: [false],
  });

  protected readonly bankForm = this.fb.nonNullable.group({
    bankName: ['', [Validators.required, Validators.maxLength(150)]],
    accountName: ['', [Validators.required, Validators.maxLength(150)]],
    accountNumber: ['', [Validators.required, Validators.maxLength(50)]],
    branchName: ['', [Validators.maxLength(150)]],
    swiftCode: ['', [Validators.maxLength(20)]],
    currency: ['', [Validators.minLength(3), Validators.maxLength(3)]],
    primaryAccount: [false],
  });

  /** Orders that have been fully received, as a share of those raised. */
  protected readonly performance = computed(() => {
    const orders = this.orders();
    const received = orders.filter(
      (order) => order.status === 'RECEIVED' || order.status === 'CLOSED',
    ).length;
    const outstanding = orders.filter(
      (order) => order.status === 'APPROVED' || order.status === 'PARTIALLY_RECEIVED',
    ).length;
    const committed = orders.reduce((sum, order) => sum + (order.estimatedTotal ?? 0), 0);
    return {
      orderCount: orders.length,
      received,
      outstanding,
      committed,
      fulfilment: orders.length === 0 ? null : Math.round((received / orders.length) * 100),
      receiptCount: this.receipts().length,
      rejectedReceipts: this.receipts().filter((receipt) => receipt.status === 'REJECTED').length,
    };
  });

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
      supplier: this.procurement.getSupplier(id),
      orders: this.procurement.searchOrders({ supplierId: id, size: 100, sort: 'orderDate,desc' }),
      receipts: this.procurement.searchReceipts({ size: 100, sort: 'receiptDate,desc' }),
    }).subscribe({
      next: ({ supplier, orders, receipts }) => {
        this.supplier.set(supplier);
        this.orders.set(orders.content);
        // The receipt endpoint filters by order, not supplier, so narrow here.
        this.receipts.set(receipts.content.filter((receipt) => receipt.supplierId === id));
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  // ---------- editors ----------

  protected editSupplier(): void {
    const supplier = this.supplier();
    if (!supplier) {
      return;
    }
    this.supplierForm.enable();
    this.supplierForm.reset({
      code: supplier.code,
      name: supplier.name,
      legalName: supplier.legalName ?? '',
      taxNumber: supplier.taxNumber ?? '',
      supplierType: supplier.supplierType ?? '',
      addressLine: supplier.addressLine ?? '',
      city: supplier.city ?? '',
      country: supplier.country ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      currency: supplier.currency ?? '',
      paymentTermsDays: supplier.paymentTermsDays,
      creditLimit: supplier.creditLimit,
      notes: supplier.notes ?? '',
    });
    this.openEditor('supplier');
  }

  protected addContact(): void {
    this.contactForm.reset({ primaryContact: false });
    this.openEditor('contact');
  }

  protected addBankAccount(): void {
    this.bankForm.reset({
      primaryAccount: false,
      currency: this.supplier()?.currency ?? '',
    });
    this.openEditor('bank');
  }

  private openEditor(editor: Editor): void {
    this.submitted.set(false);
    this.formError.set(null);
    this.editor.set(editor);
  }

  protected close(): void {
    this.editor.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    const which = this.editor();
    if (which === 'supplier') {
      this.saveSupplier();
    } else if (which === 'contact') {
      this.saveContact();
    } else if (which === 'bank') {
      this.saveBankAccount();
    }
  }

  private saveSupplier(): void {
    if (this.supplierForm.invalid) {
      touchAll(this.supplierForm);
      return;
    }
    const request = nullifyBlanks(this.supplierForm.getRawValue()) as unknown as SupplierRequest;
    this.saving.set(true);
    this.procurement.updateSupplier(this.id(), request).subscribe({
      next: (supplier) => this.onSaved(supplier, 'Supplier updated'),
      error: (error: AppError) => this.onFailed(error, this.supplierForm),
    });
  }

  private saveContact(): void {
    if (this.contactForm.invalid) {
      touchAll(this.contactForm);
      return;
    }
    const request = nullifyBlanks(
      this.contactForm.getRawValue(),
    ) as unknown as SupplierContactRequest;
    this.saving.set(true);
    this.procurement.addContact(this.id(), request).subscribe({
      next: (supplier) => this.onSaved(supplier, 'Contact added'),
      error: (error: AppError) => this.onFailed(error, this.contactForm),
    });
  }

  private saveBankAccount(): void {
    if (this.bankForm.invalid) {
      touchAll(this.bankForm);
      return;
    }
    const request = nullifyBlanks(
      this.bankForm.getRawValue(),
    ) as unknown as SupplierBankAccountRequest;
    this.saving.set(true);
    this.procurement.addBankAccount(this.id(), request).subscribe({
      next: (supplier) => this.onSaved(supplier, 'Bank account added'),
      error: (error: AppError) => this.onFailed(error, this.bankForm),
    });
  }

  private onSaved(supplier: Supplier, title: string): void {
    this.saving.set(false);
    this.editor.set(null);
    this.supplier.set(supplier);
    this.toast.success(title, supplier.name);
    this.reload();
  }

  private onFailed(error: AppError, form: Parameters<typeof applyServerErrors>[0]): void {
    this.saving.set(false);
    const unmatched = applyServerErrors(form, error);
    this.formError.set(unmatched[0] ?? error.message);
  }

  // ---------- status ----------

  protected async changeStatus(status: SupplierStatus): Promise<void> {
    const supplier = this.supplier();
    if (!supplier) {
      return;
    }

    const confirmed = await this.confirm.ask({
      title: status === 'BLOCKED' ? 'Block supplier' : `Mark supplier ${status.toLowerCase()}`,
      message:
        status === 'BLOCKED'
          ? 'No new orders can be raised against a blocked supplier. Existing orders are unaffected.'
          : 'The supplier’s availability for new orders changes. Existing orders are unaffected.',
      detail: `${supplier.code} — ${supplier.name}`,
      confirmLabel: 'Confirm',
      tone: status === 'BLOCKED' ? 'danger' : 'default',
    });
    if (!confirmed) {
      return;
    }

    this.procurement.changeSupplierStatus(supplier.id, status).subscribe({
      next: (updated) => {
        this.supplier.set(updated);
        this.toast.success('Supplier status changed', updated.status);
        this.reload();
      },
      error: (error: AppError) => this.toast.error('Could not change the status', error.message),
    });
  }
}
