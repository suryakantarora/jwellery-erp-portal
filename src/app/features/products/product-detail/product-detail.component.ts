import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError } from '../../../core/models/api.model';
import {
  Design,
  MAKING_CHARGE_TYPES,
  makingChargeLabel,
  MasterRecord,
  Product,
  ProductRequest,
  ProductSize,
} from '../../../core/models/catalogue.model';
import { Metal, Purity } from '../../../core/models/metal.model';
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
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { CatalogueService, nameOf } from '../catalogue.service';
import { MetalService } from '../metal.service';

/**
 * A single product, in full.
 *
 * The page leads with the piece itself and keeps the commercial facts —
 * design, metal, weight, making charge, tax — beside it, because that is the
 * order someone reads a product in: what it is, then what it costs to make.
 */
@Component({
  selector: 'app-product-detail',
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
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent {
  private readonly catalogue = inject(CatalogueService);
  private readonly metalApi = inject(MetalService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  /** Bound from the route path, which is `products/:id`. */
  readonly id = input.required<string>();

  protected readonly canUpdate = computed(() => this.auth.hasPermission(Permission.PRODUCT_UPDATE));
  protected readonly makingChargeTypes = MAKING_CHARGE_TYPES;
  protected readonly chargeLabel = makingChargeLabel;

  protected readonly product = signal<Product | null>(null);
  protected readonly design = signal<Design | null>(null);
  protected readonly sizes = signal<readonly ProductSize[]>([]);

  protected readonly categories = signal<readonly MasterRecord[]>([]);
  protected readonly types = signal<readonly MasterRecord[]>([]);
  protected readonly brands = signal<readonly MasterRecord[]>([]);
  protected readonly collections = signal<readonly MasterRecord[]>([]);
  protected readonly metals = signal<readonly Metal[]>([]);
  protected readonly purities = signal<readonly Purity[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    productTypeId: ['', [Validators.required]],
    designId: [''],
    categoryId: [''],
    brandId: [''],
    collectionId: [''],
    defaultMetalId: [''],
    defaultPurityId: [''],
    nominalGrossWeight: [null as number | null, [Validators.min(0.0001)]],
    defaultMakingChargeType: [''],
    defaultMakingChargeValue: [null as number | null, [Validators.min(0)]],
    defaultWastagePercentage: [null as number | null, [Validators.min(0)]],
    hsnCode: ['', [Validators.maxLength(30)]],
    description: [''],
  });

  protected readonly typeName = computed(() =>
    nameOf(this.types(), this.product()?.productTypeId ?? null),
  );
  protected readonly categoryName = computed(() =>
    nameOf(this.categories(), this.product()?.categoryId ?? null),
  );
  protected readonly brandName = computed(() =>
    nameOf(this.brands(), this.product()?.brandId ?? null),
  );
  protected readonly collectionName = computed(() =>
    nameOf(this.collections(), this.product()?.collectionId ?? null),
  );

  protected readonly metalName = computed(() => {
    const id = this.product()?.defaultMetalId;
    return this.metals().find((metal) => metal.id === id)?.name ?? '—';
  });

  protected readonly purityName = computed(() => {
    const id = this.product()?.defaultPurityId;
    return this.purities().find((purity) => purity.id === id)?.name ?? '—';
  });

  /** Initials shown on the image placeholder while no photograph exists. */
  protected readonly monogram = computed(() => {
    const name = this.product()?.name ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '—';
  });

  constructor() {
    this.catalogue.listCategories().subscribe({ next: (r) => this.categories.set(r) });
    this.catalogue.listProductTypes().subscribe({ next: (r) => this.types.set(r) });
    this.catalogue.listBrands().subscribe({ next: (r) => this.brands.set(r) });
    this.catalogue.listCollections().subscribe({ next: (r) => this.collections.set(r) });
    this.metalApi.listMetals().subscribe({ next: (r) => this.metals.set(r) });

    // Route inputs are bound after construction, and the same component instance
    // is reused when navigating from one product to another, so the load is
    // driven by the id rather than run once here.
    effect(() => this.load(this.id()));
  }

  protected reload(): void {
    this.load(this.id());
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.catalogue
      .getProduct(id)
      .pipe(
        switchMap((product) =>
          forkJoin({
            product: of(product),
            design: product.designId ? this.catalogue.getDesign(product.designId) : of(null),
            purities: product.defaultMetalId
              ? this.metalApi.listPurities(product.defaultMetalId)
              : of([] as Purity[]),
            sizes: product.productTypeId
              ? this.catalogue.listSizes(product.productTypeId)
              : of([] as ProductSize[]),
          }),
        ),
      )
      .subscribe({
        next: ({ product, design, purities, sizes }) => {
          this.product.set(product);
          this.design.set(design);
          this.purities.set(purities);
          this.sizes.set(sizes);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  protected startEdit(): void {
    const product = this.product();
    if (!product) {
      return;
    }
    this.form.enable();
    this.form.reset({
      sku: product.sku,
      name: product.name,
      productTypeId: product.productTypeId,
      designId: product.designId ?? '',
      categoryId: product.categoryId ?? '',
      brandId: product.brandId ?? '',
      collectionId: product.collectionId ?? '',
      defaultMetalId: product.defaultMetalId ?? '',
      defaultPurityId: product.defaultPurityId ?? '',
      nominalGrossWeight: product.nominalGrossWeight,
      defaultMakingChargeType: product.defaultMakingChargeType ?? '',
      defaultMakingChargeValue: product.defaultMakingChargeValue,
      defaultWastagePercentage: product.defaultWastagePercentage,
      hsnCode: product.hsnCode ?? '',
      description: product.description ?? '',
    });
    this.submitted.set(false);
    this.formError.set(null);
    this.editing.set(true);
  }

  protected onMetalChange(event: Event): void {
    const metalId = (event.target as HTMLSelectElement).value;
    this.form.patchValue({ defaultPurityId: '' });
    if (!metalId) {
      this.purities.set([]);
      return;
    }
    this.metalApi.listPurities(metalId).subscribe({
      next: (purities) => this.purities.set(purities),
      error: () => this.purities.set([]),
    });
  }

  protected close(): void {
    this.editing.set(false);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const request = nullifyBlanks(this.form.getRawValue()) as unknown as ProductRequest;
    this.saving.set(true);
    this.catalogue.updateProduct(this.id(), request).subscribe({
      next: (product) => {
        this.saving.set(false);
        this.editing.set(false);
        this.product.set(product);
        this.toast.success('Product updated', `${product.sku} — ${product.name}`);
        this.reload();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const unmatched = applyServerErrors(this.form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }

  protected async deactivate(): Promise<void> {
    const product = this.product();
    if (!product) {
      return;
    }

    const confirmed = await this.confirm.ask({
      title: 'Deactivate product',
      message: 'The SKU stops being available for new items and sales. Its history is kept.',
      detail: `${product.sku} — ${product.name}`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.catalogue.deactivateProduct(product.id).subscribe({
      next: () => {
        this.toast.success('Product deactivated', product.name);
        this.reload();
      },
      error: (error: AppError) => this.toast.error('Could not deactivate product', error.message),
    });
  }

  protected back(): void {
    void this.router.navigate(['/products']);
  }
}
