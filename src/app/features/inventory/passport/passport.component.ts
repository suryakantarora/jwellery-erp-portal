import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError } from '../../../core/models/api.model';
import { Design, Product, ProductSize } from '../../../core/models/catalogue.model';
import {
  ChangeStatusRequest,
  ItemPassport,
  ItemStatus,
  itemStatusLabel,
  LifecycleEvent,
  TagItemRequest,
} from '../../../core/models/inventory.model';
import { Metal, Purity } from '../../../core/models/metal.model';
import { Location } from '../../../core/models/organization.model';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { touchAll } from '../../../shared/utilities/form.utils';
import { CatalogueService } from '../../products/catalogue.service';
import { MetalService } from '../../products/metal.service';
import { OrganizationService } from '../../organization/organization.service';
import { InventoryService } from '../inventory.service';

/** Human wording for the backend's lifecycle event types. */
const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Created',
  QUALITY_CHECKED: 'Quality checked',
  TAGGED: 'Tagged',
  STATUS_CHANGED: 'Status changed',
  LOCATION_CHANGED: 'Moved',
  RESERVED: 'Reserved',
  RESERVATION_RELEASED: 'Reservation released',
  PRICE_UPDATED: 'Price updated',
  SOLD: 'Sold',
  RETURNED: 'Returned',
  REPAIRED: 'Repaired',
  EXCHANGED: 'Exchanged',
  BOUGHT_BACK: 'Bought back',
  SCRAPPED: 'Scrapped',
};

/**
 * The digital jewellery passport.
 *
 * One page holding everything true about a single physical piece: what it is,
 * what it is made of, what is set into it, how it is tagged, what it cost, where
 * it is, and everything that has ever happened to it.
 *
 * Which actions are offered comes from `allowedTransitions` on the item, so the
 * page never invents a transition the backend would refuse.
 */
@Component({
  selector: 'app-passport',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    DrawerComponent,
    FormFieldComponent,
    IconComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    SpinnerComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './passport.component.html',
  styleUrl: './passport.component.scss',
})
export class PassportComponent {
  private readonly inventory = inject(InventoryService);
  private readonly catalogue = inject(CatalogueService);
  private readonly metalApi = inject(MetalService);
  private readonly organization = inject(OrganizationService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly id = input.required<string>();

  protected readonly canTag = computed(() => this.auth.hasPermission(Permission.INVENTORY_CREATE));
  protected readonly canAdjust = computed(() =>
    this.auth.hasPermission(Permission.INVENTORY_ADJUST),
  );
  protected readonly canReserve = computed(() =>
    this.auth.hasPermission(Permission.INVENTORY_RESERVE),
  );

  protected readonly statusLabel = itemStatusLabel;

  protected readonly passport = signal<ItemPassport | null>(null);
  protected readonly product = signal<Product | null>(null);
  protected readonly design = signal<Design | null>(null);
  protected readonly metal = signal<Metal | null>(null);
  protected readonly purity = signal<Purity | null>(null);
  protected readonly size = signal<ProductSize | null>(null);
  protected readonly location = signal<Location | null>(null);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly working = signal(false);

  protected readonly tagging = signal(false);
  protected readonly changingStatus = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly item = computed(() => this.passport()?.item ?? null);
  protected readonly stones = computed(() => this.passport()?.stones ?? []);

  /** History newest first — what happened last is what someone is looking for. */
  protected readonly history = computed<readonly LifecycleEvent[]>(() =>
    [...(this.passport()?.history ?? [])].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    ),
  );

  protected readonly tagForm = this.fb.nonNullable.group({
    rfidTag: [''],
    qrCode: [''],
    barcode: [''],
  });

  protected readonly statusForm = this.fb.nonNullable.group({
    targetStatus: ['' as ItemStatus | '', [Validators.required]],
    reason: ['', [Validators.required, Validators.maxLength(500)]],
  });

  /** Only the transitions the backend says are legal from here. */
  protected readonly transitions = computed<readonly ItemStatus[]>(
    () => this.item()?.allowedTransitions ?? [],
  );

  protected readonly certificateNumbers = computed(() =>
    this.stones()
      .map((stone) => stone.certificateNumber)
      .filter((number): number is string => !!number),
  );

  protected eventLabel(type: string): string {
    return EVENT_LABELS[type] ?? type;
  }

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected reload(): void {
    this.load(this.id());
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.inventory
      .passport(id)
      .pipe(
        switchMap((passport) =>
          forkJoin({
            passport: of(passport),
            product: this.catalogue.getProduct(passport.item.productId),
            design: passport.item.designId
              ? this.catalogue.getDesign(passport.item.designId)
              : of(null),
            metals: this.metalApi.listMetals(),
            purities: passport.item.metalId
              ? this.metalApi.listPurities(passport.item.metalId)
              : of([] as Purity[]),
          }),
        ),
      )
      .subscribe({
        next: ({ passport, product, design, metals, purities }) => {
          this.passport.set(passport);
          this.product.set(product);
          this.design.set(design);
          this.metal.set(metals.find((entry) => entry.id === passport.item.metalId) ?? null);
          this.purity.set(purities.find((entry) => entry.id === passport.item.purityId) ?? null);
          this.loading.set(false);
          this.resolveSize(product.productTypeId, passport.item.sizeId);
          this.resolveLocation(passport.item.currentBranchId, passport.item.currentLocationId);
        },
        error: (error: AppError) => {
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  private resolveSize(productTypeId: string, sizeId: string | null): void {
    if (!sizeId) {
      this.size.set(null);
      return;
    }
    this.catalogue.listSizes(productTypeId).subscribe({
      next: (sizes) => this.size.set(sizes.find((entry) => entry.id === sizeId) ?? null),
      error: () => this.size.set(null),
    });
  }

  private resolveLocation(branchId: string | null, locationId: string | null): void {
    if (!branchId || !locationId) {
      this.location.set(null);
      return;
    }
    this.organization.listLocations(branchId).subscribe({
      next: (locations) =>
        this.location.set(locations.find((entry) => entry.id === locationId) ?? null),
      error: () => this.location.set(null),
    });
  }

  // ---------- actions ----------

  protected startTagging(): void {
    const item = this.item();
    if (!item) {
      return;
    }
    this.tagForm.reset({
      rfidTag: item.rfidTag ?? '',
      qrCode: item.qrCode ?? '',
      barcode: item.barcode ?? '',
    });
    this.submitted.set(false);
    this.formError.set(null);
    this.tagging.set(true);
  }

  protected saveTags(): void {
    this.submitted.set(true);
    this.formError.set(null);

    const request = this.tagForm.getRawValue() as TagItemRequest;
    this.saving.set(true);
    this.inventory.tagItem(this.id(), request).subscribe({
      next: () => {
        this.saving.set(false);
        this.tagging.set(false);
        this.toast.success('Identifiers updated');
        this.reload();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected async releaseToStock(): Promise<void> {
    const item = this.item();
    if (!item) {
      return;
    }

    const confirmed = await this.confirm.ask({
      title: 'Release into stock',
      message:
        'Marks the piece quality-checked and makes it available to sell. It must already be tagged.',
      detail: item.itemCode,
      confirmLabel: 'Release',
    });
    if (!confirmed) {
      return;
    }

    this.working.set(true);
    this.inventory.releaseToStock(item.id).subscribe({
      next: () => {
        this.working.set(false);
        this.toast.success('Released into stock', item.itemCode);
        this.reload();
      },
      error: (error: AppError) => {
        this.working.set(false);
        this.toast.error('Could not release the item', error.message);
      },
    });
  }

  protected startStatusChange(): void {
    this.statusForm.reset({ targetStatus: '', reason: '' });
    this.submitted.set(false);
    this.formError.set(null);
    this.changingStatus.set(true);
  }

  protected saveStatus(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.statusForm.invalid) {
      touchAll(this.statusForm);
      return;
    }

    const request = this.statusForm.getRawValue() as ChangeStatusRequest;
    this.saving.set(true);
    this.inventory.changeStatus(this.id(), request).subscribe({
      next: (item) => {
        this.saving.set(false);
        this.changingStatus.set(false);
        this.toast.success('Status changed', `Now ${itemStatusLabel(item.status)}`);
        this.reload();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected async releaseReservation(): Promise<void> {
    const item = this.item();
    if (!item) {
      return;
    }

    const confirmed = await this.confirm.ask({
      title: 'Release reservation',
      message: 'The hold is lifted and the piece returns to available stock.',
      detail: item.itemCode,
      confirmLabel: 'Release hold',
    });
    if (!confirmed) {
      return;
    }

    this.working.set(true);
    this.inventory.releaseReservation(item.id).subscribe({
      next: () => {
        this.working.set(false);
        this.toast.success('Reservation released', item.itemCode);
        this.reload();
      },
      error: (error: AppError) => {
        this.working.set(false);
        this.toast.error('Could not release the reservation', error.message);
      },
    });
  }

  protected closeDrawers(): void {
    this.tagging.set(false);
    this.changingStatus.set(false);
  }
}
