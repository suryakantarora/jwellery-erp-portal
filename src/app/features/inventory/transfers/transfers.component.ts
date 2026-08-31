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
  CreateMovementRequest,
  JewelleryItem,
  MOVEMENT_STATUSES,
  MOVEMENT_TYPES,
  Movement,
  MovementStatus,
  MovementType,
  movementTypeLabel,
} from '../../../core/models/inventory.model';
import { Branch, Location } from '../../../core/models/organization.model';
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
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { touchAll } from '../../../shared/utilities/form.utils';
import { OrganizationService } from '../../organization/organization.service';
import { InventoryService } from '../inventory.service';

/**
 * Stock movements between locations.
 *
 * The workflow is create → approve → dispatch → receive, and an item's location
 * only changes when the movement completes. Between dispatch and receipt the
 * piece sits in `IN_TRANSIT`, which is why in-transit stock is visible rather
 * than simply missing from both ends.
 *
 * Which buttons a row offers is driven by its status, so the screen cannot
 * present a step the backend would reject.
 */
@Component({
  selector: 'app-transfers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MasterPanelComponent,
    DrawerComponent,
    FormFieldComponent,
    SpinnerComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './transfers.component.html',
  styleUrl: './transfers.component.scss',
})
export class TransfersComponent {
  private readonly inventory = inject(InventoryService);
  private readonly organization = inject(OrganizationService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly canTransfer = computed(() =>
    this.auth.hasPermission(Permission.INVENTORY_TRANSFER),
  );
  protected readonly canApprove = computed(() =>
    this.auth.hasPermission(Permission.INVENTORY_TRANSFER_APPROVE),
  );

  protected readonly movementTypes = MOVEMENT_TYPES;
  protected readonly movementStatuses = MOVEMENT_STATUSES;
  protected readonly typeLabel = movementTypeLabel;

  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly locations = signal<readonly Location[]>([]);
  /** Items available at the chosen source location, for the create form. */
  protected readonly sourceItems = signal<readonly JewelleryItem[]>([]);
  protected readonly selectedItems = signal<ReadonlySet<string>>(new Set());

  protected readonly result = signal<PageResponse<Movement>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly statusFilter = signal<MovementStatus | ''>('');
  protected readonly typeFilter = signal<MovementType | ''>('');
  protected readonly sort = signal<TableSort | null>({ field: 'createdAt', direction: 'desc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly viewing = signal<Movement | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly refTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Movement>>>('refCell');
  private readonly routeTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Movement>>>('routeCell');
  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Movement>>>('statusCell');
  private readonly actionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Movement>>>('actionsCell');
  private readonly createdTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Movement>>>('createdCell');

  protected readonly templates = computed(() => ({
    referenceNumber: this.refTpl(),
    fromLocationId: this.routeTpl(),
    status: this.statusTpl(),
    actions: this.actionsTpl(),
    createdAt: this.createdTpl(),
  }));

  protected readonly form = this.fb.nonNullable.group({
    movementType: ['TRANSFER' as MovementType, [Validators.required]],
    fromLocationId: [''],
    toLocationId: ['', [Validators.required]],
    notes: [''],
  });

  protected readonly columns: readonly TableColumn<Movement>[] = [
    { key: 'referenceNumber', header: 'Reference', width: '210px' },
    {
      key: 'movementType',
      header: 'Type',
      width: '150px',
      value: (row) => movementTypeLabel(row.movementType),
    },
    { key: 'fromLocationId', header: 'Route' },
    {
      key: 'lines',
      header: 'Pieces',
      numeric: true,
      align: 'end',
      width: '100px',
      value: (row) => row.lines.length,
    },
    { key: 'status', header: 'Status', width: '160px' },
    { key: 'createdAt', header: 'Raised', hideOnMobile: true, width: '170px' },
    { key: 'actions', header: '', width: '230px', align: 'end' },
  ];

  protected readonly activeFilterCount = computed(
    () => (this.statusFilter() ? 1 : 0) + (this.typeFilter() ? 1 : 0),
  );

  protected readonly trackById = (row: Movement) => row.id;

  constructor() {
    this.organization.listAllBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loadLocations(branches);
      },
    });
    this.load();
  }

  private loadLocations(branches: readonly Branch[]): void {
    const collected: Location[] = [];
    let outstanding = branches.length;
    if (outstanding === 0) {
      return;
    }
    for (const branch of branches) {
      this.organization.listLocations(branch.id).subscribe({
        next: (locations) => collected.push(...locations),
        error: () => undefined,
        complete: () => {
          outstanding -= 1;
          if (outstanding === 0) {
            this.locations.set(collected);
          }
        },
      });
    }
  }

  protected locationName(id: string | null): string {
    if (!id) {
      return 'Outside';
    }
    return this.locations().find((location) => location.id === id)?.name ?? '—';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inventory
      .searchMovements({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        status: this.statusFilter() || null,
        movementType: this.typeFilter() || null,
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

  protected onFilter(which: 'status' | 'type', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (which === 'status') {
      this.statusFilter.set(value as MovementStatus | '');
    } else {
      this.typeFilter.set(value as MovementType | '');
    }
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.statusFilter.set('');
    this.typeFilter.set('');
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

  // ---------- creating ----------

  protected startCreate(): void {
    this.form.enable();
    this.form.reset({ movementType: 'TRANSFER', fromLocationId: '', toLocationId: '', notes: '' });
    this.sourceItems.set([]);
    this.selectedItems.set(new Set());
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  /** Loads the sellable pieces sitting at the chosen source location. */
  protected onSourceChange(event: Event): void {
    const locationId = (event.target as HTMLSelectElement).value;
    this.selectedItems.set(new Set());
    if (!locationId) {
      this.sourceItems.set([]);
      return;
    }
    this.inventory
      .searchItems({ locationId, status: 'AVAILABLE', size: 200, sort: 'itemCode,asc' })
      .subscribe({
        next: (page) => this.sourceItems.set(page.content),
        error: () => this.sourceItems.set([]),
      });
  }

  protected toggleItem(itemId: string): void {
    this.selectedItems.update((current) => {
      const next = new Set(current);
      if (!next.delete(itemId)) {
        next.add(itemId);
      }
      return next;
    });
  }

  protected isSelected(itemId: string): boolean {
    return this.selectedItems().has(itemId);
  }

  protected close(): void {
    this.creating.set(false);
    this.viewing.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }
    if (this.selectedItems().size === 0) {
      this.formError.set('Choose at least one piece to move.');
      return;
    }

    const value = this.form.getRawValue();
    const request: CreateMovementRequest = {
      movementType: value.movementType,
      fromLocationId: value.fromLocationId || null,
      toLocationId: value.toLocationId,
      itemIds: [...this.selectedItems()],
      notes: value.notes || null,
    };

    this.saving.set(true);
    this.inventory.createMovement(request).subscribe({
      next: (movement) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success(
          'Transfer raised',
          `${movement.referenceNumber} — ${movement.lines.length} piece(s)`,
        );
        this.page.set(0);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  // ---------- workflow steps ----------

  /**
   * Whether the signed-in user is the approval already on record.
   *
   * A location marked for dual authorization needs two *different* approvers,
   * so the second click has to come from someone else.
   */
  protected alreadyApprovedByMe(movement: Movement): boolean {
    const username = this.auth.user()?.username;
    return !!username && movement.approvedBy === username;
  }

  protected view(movement: Movement): void {
    this.viewing.set(movement);
  }

  protected approve(movement: Movement): void {
    this.run(this.inventory.approveMovement(movement.id), 'Transfer approved', movement);
  }

  protected async reject(movement: Movement): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Reject transfer',
      message: 'The transfer is closed and the pieces stay where they are.',
      detail: movement.referenceNumber,
      confirmLabel: 'Reject',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.run(
      this.inventory.rejectMovement(movement.id, 'Rejected by approver'),
      'Transfer rejected',
      movement,
    );
  }

  protected dispatch(movement: Movement): void {
    this.run(this.inventory.dispatchMovement(movement.id), 'Dispatched', movement);
  }

  protected receive(movement: Movement): void {
    this.run(this.inventory.receiveMovement(movement.id), 'Received', movement);
  }

  protected async cancel(movement: Movement): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Cancel transfer',
      message: 'The transfer is abandoned and the pieces stay where they are.',
      detail: movement.referenceNumber,
      confirmLabel: 'Cancel transfer',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.run(this.inventory.cancelMovement(movement.id), 'Transfer cancelled', movement);
  }

  private run(
    call: import('rxjs').Observable<Movement>,
    successTitle: string,
    movement: Movement,
  ): void {
    this.saving.set(true);
    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.viewing.set(null);
        this.toast.success(successTitle, movement.referenceNumber);
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.toast.error('The step could not be completed', error.message);
      },
    });
  }
}
