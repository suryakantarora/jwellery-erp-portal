import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage } from '../../../core/models/api.model';
import {
  Branch,
  LOCATION_TYPES,
  Location,
  LocationRequest,
  LocationType,
  locationTypeLabel,
} from '../../../core/models/organization.model';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import {
  CellDefDirective,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { TableColumn, TableSort } from '../../../shared/components/data-table/data-table.model';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FilterPanelComponent } from '../../../shared/components/filter-panel/filter-panel.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { localPage } from '../../../shared/utilities/list.utils';
import { OrganizationService } from '../organization.service';

/**
 * Location master: the showrooms, counters, vaults, store rooms and warehouses
 * inside a branch.
 *
 * The API is branch-scoped (`/branches/{id}/locations`), so the screen leads
 * with a branch selector rather than a flat list, and defaults to the branch
 * the operator is already working in.
 */
@Component({
  selector: 'app-locations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    DataTableComponent,
    CellDefDirective,
    DrawerComponent,
    EmptyStateComponent,
    FilterPanelComponent,
    FormFieldComponent,
    PaginationComponent,
    SearchBoxComponent,
    SpinnerComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './locations.component.html',
})
export class LocationsComponent {
  private readonly organization = inject(OrganizationService);
  private readonly branchContext = inject(BranchContextService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() =>
    this.auth.hasPermission(Permission.ORGANIZATION_MANAGE),
  );

  protected readonly locationTypes = LOCATION_TYPES;
  protected readonly typeLabel = locationTypeLabel;

  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly branchId = signal<string>('');
  private readonly all = signal<readonly Location[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly typeFilter = signal<LocationType | ''>('');
  protected readonly sort = signal<TableSort | null>({ field: 'code', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly activeFilterCount = computed(() => (this.typeFilter() ? 1 : 0));

  protected readonly editing = signal<Location | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    type: ['SHOWROOM' as LocationType, [Validators.required]],
    parentId: [''],
    dualAuthorization: [false],
    lowStockThreshold: [null as number | null, [Validators.min(0)]],
    description: ['', [Validators.maxLength(255)]],
  });

  /** Candidate parents: every other location in the same branch. */
  protected readonly parentOptions = computed(() => {
    const current = this.editing();
    const currentId = current && current !== 'new' ? current.id : null;
    return this.all().filter((location) => location.id !== currentId);
  });

  protected readonly result = computed(() =>
    this.error()
      ? emptyPage<Location>(this.size())
      : localPage(this.all(), {
          search: this.search(),
          searchFields: [(row) => row.code, (row) => row.name, (row) => row.description],
          sort: this.sort(),
          sortValues: { type: (row) => locationTypeLabel(row.type) },
          page: this.page(),
          size: this.size(),
        }),
  );

  protected readonly columns: readonly TableColumn<Location>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Location', sortable: true },
    { key: 'type', header: 'Type', sortable: true, width: '170px' },
    { key: 'parentId', header: 'Inside', hideOnMobile: true },
    { key: 'controls', header: 'Controls', hideOnMobile: true },
    { key: 'status', header: 'Status', width: '120px' },
    { key: 'actions', header: '', width: '150px', align: 'end' },
  ];

  protected readonly trackById = (row: Location) => row.id;

  constructor() {
    this.organization.listAllBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        const preferred =
          this.branchContext.activeBranchId() &&
          branches.some((branch) => branch.id === this.branchContext.activeBranchId())
            ? this.branchContext.activeBranchId()!
            : (branches[0]?.id ?? '');
        this.branchId.set(preferred);
        if (preferred) {
          this.load();
        }
      },
      error: (error: AppError) => this.error.set(error),
    });
  }

  protected parentName(parentId: string | null): string {
    if (!parentId) {
      return '—';
    }
    return this.all().find((location) => location.id === parentId)?.name ?? '—';
  }

  protected load(): void {
    const branchId = this.branchId();
    if (!branchId) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.organization.listLocations(branchId, this.typeFilter() || null).subscribe({
      next: (locations) => {
        this.all.set(locations);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.all.set([]);
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  protected onBranchChange(event: Event): void {
    this.branchId.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
    this.load();
  }

  protected onTypeFilter(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value as LocationType | '');
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.typeFilter.set('');
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
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
  }

  protected startCreate(): void {
    this.resetForm();
    this.editing.set('new');
  }

  protected startEdit(location: Location): void {
    this.resetForm();
    this.form.patchValue({
      code: location.code,
      name: location.name,
      type: location.type,
      parentId: location.parentId ?? '',
      dualAuthorization: location.dualAuthorization,
      lowStockThreshold: location.lowStockThreshold ?? null,
      description: location.description ?? '',
    });
    if (!this.canManage()) {
      this.form.disable();
    }
    this.editing.set(location);
  }

  protected close(): void {
    this.editing.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const target = this.editing();
    if (!target) {
      return;
    }

    const value = nullifyBlanks(this.form.getRawValue());
    const request: LocationRequest = {
      branchId: this.branchId(),
      parentId: value.parentId,
      code: value.code,
      name: value.name,
      type: value.type,
      dualAuthorization: value.dualAuthorization,
      lowStockThreshold: value.lowStockThreshold,
      description: value.description,
    };

    const call =
      target === 'new'
        ? this.organization.createLocation(request)
        : this.organization.updateLocation(target.id, request);

    this.saving.set(true);
    call.subscribe({
      next: (location) => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(
          target === 'new' ? 'Location created' : 'Location updated',
          `${location.code} — ${location.name}`,
        );
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const unmatched = applyServerErrors(this.form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }

  protected async deactivate(location: Location): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Deactivate location',
      message: 'Stock can no longer be moved into this location. Its history is kept.',
      detail: `${location.code} — ${location.name}`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.organization.deactivateLocation(location.id).subscribe({
      next: () => {
        this.toast.success('Location deactivated', location.name);
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not deactivate location', error.message),
    });
  }

  private resetForm(): void {
    this.form.enable();
    this.form.reset({
      type: 'SHOWROOM',
      dualAuthorization: false,
      parentId: '',
      lowStockThreshold: null,
    });
    this.submitted.set(false);
    this.formError.set(null);
  }
}
