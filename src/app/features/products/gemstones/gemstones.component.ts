import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import {
  CertificateRequest,
  Gemstone,
  GemstoneRequest,
  StoneCertificate,
} from '../../../core/models/gemstone.model';
import { FileService, formatFileSize } from '../../../core/services/file.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
} from '../../../shared/components/data-table/data-table.model';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../../shared/components/master-panel/master-panel.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { localPage } from '../../../shared/utilities/list.utils';
import { GemstoneService } from '../gemstone.service';

type Tab = 'gemstones' | 'certificates';

/**
 * Gemstone and diamond master data, and the lab certificates behind them.
 *
 * A certificate is recorded independently of the stone it will describe — one
 * often arrives before anyone knows which piece it belongs to — so the PDF goes
 * to file storage and the record keeps only its key. The per-stone grading
 * (carat, cut, colour, clarity, shape) belongs to a stone *set into an item*,
 * which is Phase 4's jewellery-item screen.
 */
@Component({
  selector: 'app-gemstones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    MasterPanelComponent,
    FormFieldComponent,
    SpinnerComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './gemstones.component.html',
  styleUrl: './gemstones.component.scss',
})
export class GemstonesComponent {
  private readonly gemstoneApi = inject(GemstoneService);
  private readonly files = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() =>
    this.auth.hasPermission(Permission.GEMSTONE_MANAGE),
  );
  protected readonly canUpload = computed(() => this.auth.hasPermission(Permission.FILE_UPLOAD));

  protected readonly tab = signal<Tab>('gemstones');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'gemstones', label: 'Gemstones & diamonds' },
    { id: 'certificates', label: 'Certificates' },
  ];

  private readonly gemstones = signal<readonly Gemstone[]>([]);
  protected readonly certificates = signal<PageResponse<StoneCertificate>>(
    emptyPage(environment.defaultPageSize),
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'name', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly editing = signal<Gemstone | StoneCertificate | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  /** The certificate file chosen in the drawer, before it is uploaded. */
  protected readonly uploading = signal(false);
  protected readonly uploadedName = signal<string | null>(null);

  private readonly gemKindTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Gemstone>>>('gemKindCell');
  private readonly gemStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Gemstone>>>('gemStatusCell');
  private readonly certFileTpl =
    viewChild.required<TemplateRef<CellTemplateContext<StoneCertificate>>>('certFileCell');

  protected readonly gemTemplates = computed(() => ({
    diamond: this.gemKindTpl(),
    active: this.gemStatusTpl(),
  }));
  protected readonly certTemplates = computed(() => ({ storageKey: this.certFileTpl() }));

  protected readonly gemstoneForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    diamond: [false],
    precious: [false],
    description: ['', [Validators.maxLength(255)]],
  });

  protected readonly certificateForm = this.fb.nonNullable.group({
    certificateNumber: ['', [Validators.required, Validators.maxLength(100)]],
    issuingLab: ['', [Validators.required, Validators.maxLength(100)]],
    issueDate: [''],
    storageKey: ['', [Validators.maxLength(500)]],
    verificationUrl: ['', [Validators.maxLength(500)]],
    notes: ['', [Validators.maxLength(255)]],
  });

  protected readonly gemstoneColumns: readonly TableColumn<Gemstone>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '140px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Stone', sortable: true, value: (row) => row.name },
    { key: 'diamond', header: 'Kind', width: '200px' },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      value: (row) => row.description,
    },
    { key: 'active', header: 'Status', width: '120px' },
  ];

  protected readonly certificateColumns: readonly TableColumn<StoneCertificate>[] = [
    {
      key: 'certificateNumber',
      header: 'Certificate no.',
      mono: true,
      width: '200px',
      value: (row) => row.certificateNumber,
    },
    { key: 'issuingLab', header: 'Issuing lab', value: (row) => row.issuingLab },
    {
      key: 'issueDate',
      header: 'Issued',
      mono: true,
      width: '140px',
      value: (row) => row.issueDate,
    },
    { key: 'storageKey', header: 'Document', width: '160px' },
    { key: 'notes', header: 'Notes', hideOnMobile: true, value: (row) => row.notes },
  ];

  protected readonly gemstonePage = computed(() =>
    localPage(this.gemstones(), {
      search: this.search(),
      searchFields: [(row) => row.code, (row) => row.name, (row) => row.description],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  protected readonly trackById = (row: { id: string }) => row.id;

  constructor() {
    this.loadGemstones();
  }

  protected loadGemstones(refresh = true): void {
    this.loading.set(true);
    this.error.set(null);
    this.gemstoneApi.listGemstones(refresh).subscribe({
      next: (gemstones) => {
        this.gemstones.set(gemstones);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  protected loadCertificates(): void {
    this.loading.set(true);
    this.error.set(null);
    this.gemstoneApi
      .searchCertificates({
        page: this.page(),
        size: this.size(),
        search: this.search() || null,
      })
      .subscribe({
        next: (page) => {
          this.certificates.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.certificates.set(emptyPage(this.size()));
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.search.set('');
    this.page.set(0);
    this.editing.set(null);
    if (tab === 'certificates') {
      this.loadCertificates();
    }
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
    if (this.tab() === 'certificates') {
      this.loadCertificates();
    }
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
  }

  protected onPage(page: number): void {
    this.page.set(page);
    if (this.tab() === 'certificates') {
      this.loadCertificates();
    }
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
    if (this.tab() === 'certificates') {
      this.loadCertificates();
    }
  }

  // ---------- editing ----------

  protected startCreate(): void {
    this.resetForms();
    this.editing.set('new');
  }

  protected startEdit(row: Gemstone | StoneCertificate): void {
    this.resetForms();

    if (this.tab() === 'gemstones') {
      const gemstone = row as Gemstone;
      this.gemstoneForm.patchValue({
        code: gemstone.code,
        name: gemstone.name,
        diamond: gemstone.diamond,
        precious: gemstone.precious,
        description: gemstone.description ?? '',
      });
      if (!this.canManage()) {
        this.gemstoneForm.disable();
      }
    } else {
      const certificate = row as StoneCertificate;
      this.certificateForm.patchValue({
        certificateNumber: certificate.certificateNumber,
        issuingLab: certificate.issuingLab,
        issueDate: certificate.issueDate ?? '',
        storageKey: certificate.storageKey ?? '',
        verificationUrl: certificate.verificationUrl ?? '',
        notes: certificate.notes ?? '',
      });
      // Certificates are create-only on the backend.
      this.certificateForm.disable();
    }

    this.editing.set(row);
  }

  /** Certificates cannot be updated once recorded. */
  protected readonly editable = computed(() => {
    if (this.tab() === 'certificates') {
      return this.canManage() && this.editing() === 'new';
    }
    return this.canManage();
  });

  protected close(): void {
    this.editing.set(null);
  }

  protected onCertificateFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.files.upload(file, 'stone-certificate').subscribe({
      next: (stored) => {
        this.uploading.set(false);
        this.certificateForm.patchValue({ storageKey: stored.storageKey });
        this.uploadedName.set(`${stored.fileName} · ${formatFileSize(stored.sizeBytes)}`);
        this.toast.success('Certificate uploaded', stored.fileName);
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

    const target = this.editing();
    if (!target || !this.editable()) {
      return;
    }

    if (this.tab() === 'gemstones') {
      if (this.gemstoneForm.invalid) {
        touchAll(this.gemstoneForm);
        return;
      }
      const request = nullifyBlanks(this.gemstoneForm.getRawValue()) as unknown as GemstoneRequest;
      const call =
        target === 'new'
          ? this.gemstoneApi.createGemstone(request)
          : this.gemstoneApi.updateGemstone((target as Gemstone).id, request);

      this.saving.set(true);
      call.subscribe({
        next: (gemstone) => {
          this.saving.set(false);
          this.editing.set(null);
          this.toast.success(
            target === 'new' ? 'Gemstone created' : 'Gemstone updated',
            `${gemstone.code} — ${gemstone.name}`,
          );
          this.loadGemstones();
        },
        error: (error: AppError) => {
          this.saving.set(false);
          const unmatched = applyServerErrors(this.gemstoneForm, error);
          this.formError.set(unmatched[0] ?? error.message);
        },
      });
      return;
    }

    if (this.certificateForm.invalid) {
      touchAll(this.certificateForm);
      return;
    }
    const request = nullifyBlanks(
      this.certificateForm.getRawValue(),
    ) as unknown as CertificateRequest;

    this.saving.set(true);
    this.gemstoneApi.createCertificate(request).subscribe({
      next: (certificate) => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success('Certificate recorded', certificate.certificateNumber);
        this.page.set(0);
        this.loadCertificates();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const unmatched = applyServerErrors(this.certificateForm, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }

  protected downloadCertificate(certificate: StoneCertificate): void {
    if (!certificate.storageKey) {
      return;
    }
    this.files.saveAs(certificate.storageKey, `${certificate.certificateNumber}.pdf`).subscribe({
      error: (error: AppError) => this.toast.error('Could not download the file', error.message),
    });
  }

  private resetForms(): void {
    for (const form of [this.gemstoneForm, this.certificateForm]) {
      form.enable();
      form.reset();
    }
    this.uploadedName.set(null);
    this.submitted.set(false);
    this.formError.set(null);
  }
}
