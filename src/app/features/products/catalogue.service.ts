import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  CategoryRequest,
  Design,
  DesignRequest,
  MasterRecord,
  Product,
  ProductRequest,
  ProductSize,
  ProductTypeRequest,
  SimpleMasterRequest,
  SizeRequest,
} from '../../core/models/catalogue.model';
import { ApiService } from '../../core/services/api.service';

export interface ProductQuery extends PageQuery {
  readonly search?: string | null;
  readonly categoryId?: string | null;
  readonly productTypeId?: string | null;
  readonly brandId?: string | null;
  readonly collectionId?: string | null;
}

export interface DesignQuery extends PageQuery {
  readonly search?: string | null;
  readonly collectionId?: string | null;
  readonly productTypeId?: string | null;
}

/**
 * Product catalogue: the lookup masters, designs and products themselves.
 *
 * The four lookup masters are cached because nearly every screen in this module
 * needs them to turn an id into a name, and the drawers need them to populate
 * their selects. Any write invalidates the lot rather than trying to patch a
 * single cache entry — they are small lists and correctness beats cleverness.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private readonly api = inject(ApiService);

  private categories$: Observable<MasterRecord[]> | null = null;
  private productTypes$: Observable<MasterRecord[]> | null = null;
  private brands$: Observable<MasterRecord[]> | null = null;
  private collections$: Observable<MasterRecord[]> | null = null;

  // ---------- categories ----------

  listCategories(refresh = false): Observable<MasterRecord[]> {
    if (refresh || !this.categories$) {
      this.categories$ = this.cached(ApiEndpoints.catalogue.categories);
    }
    return this.categories$;
  }

  createCategory(request: CategoryRequest): Observable<MasterRecord> {
    return this.api
      .post<MasterRecord>(ApiEndpoints.catalogue.categories, request)
      .pipe(tap(() => this.invalidate()));
  }

  updateCategory(id: string, request: CategoryRequest): Observable<MasterRecord> {
    return this.api
      .put<MasterRecord>(ApiEndpoints.catalogue.category(id), request)
      .pipe(tap(() => this.invalidate()));
  }

  // ---------- product types ----------

  listProductTypes(refresh = false): Observable<MasterRecord[]> {
    if (refresh || !this.productTypes$) {
      this.productTypes$ = this.cached(ApiEndpoints.catalogue.productTypes);
    }
    return this.productTypes$;
  }

  createProductType(request: ProductTypeRequest): Observable<MasterRecord> {
    return this.api
      .post<MasterRecord>(ApiEndpoints.catalogue.productTypes, request)
      .pipe(tap(() => this.invalidate()));
  }

  updateProductType(id: string, request: ProductTypeRequest): Observable<MasterRecord> {
    return this.api
      .put<MasterRecord>(ApiEndpoints.catalogue.productType(id), request)
      .pipe(tap(() => this.invalidate()));
  }

  // ---------- brands and collections ----------

  listBrands(refresh = false): Observable<MasterRecord[]> {
    if (refresh || !this.brands$) {
      this.brands$ = this.cached(ApiEndpoints.catalogue.brands);
    }
    return this.brands$;
  }

  createBrand(request: SimpleMasterRequest): Observable<MasterRecord> {
    return this.api
      .post<MasterRecord>(ApiEndpoints.catalogue.brands, request)
      .pipe(tap(() => this.invalidate()));
  }

  listCollections(refresh = false): Observable<MasterRecord[]> {
    if (refresh || !this.collections$) {
      this.collections$ = this.cached(ApiEndpoints.catalogue.collections);
    }
    return this.collections$;
  }

  createCollection(request: SimpleMasterRequest): Observable<MasterRecord> {
    return this.api
      .post<MasterRecord>(ApiEndpoints.catalogue.collections, request)
      .pipe(tap(() => this.invalidate()));
  }

  // ---------- sizes ----------

  listSizes(productTypeId: string): Observable<ProductSize[]> {
    return this.api.get<ProductSize[]>(ApiEndpoints.catalogue.sizes, {
      params: { productTypeId },
    });
  }

  createSize(request: SizeRequest): Observable<ProductSize> {
    return this.api.post<ProductSize>(ApiEndpoints.catalogue.sizes, request);
  }

  // ---------- designs ----------

  searchDesigns(query: DesignQuery): Observable<PageResponse<Design>> {
    return this.api.getPage<Design>(ApiEndpoints.catalogue.designs, { ...query });
  }

  getDesign(id: string): Observable<Design> {
    return this.api.get<Design>(ApiEndpoints.catalogue.design(id));
  }

  createDesign(request: DesignRequest): Observable<Design> {
    return this.api.post<Design>(ApiEndpoints.catalogue.designs, request);
  }

  updateDesign(id: string, request: DesignRequest): Observable<Design> {
    return this.api.put<Design>(ApiEndpoints.catalogue.design(id), request);
  }

  // ---------- products ----------

  searchProducts(query: ProductQuery): Observable<PageResponse<Product>> {
    return this.api.getPage<Product>(ApiEndpoints.catalogue.products, { ...query });
  }

  getProduct(id: string): Observable<Product> {
    return this.api.get<Product>(ApiEndpoints.catalogue.product(id));
  }

  createProduct(request: ProductRequest): Observable<Product> {
    return this.api.post<Product>(ApiEndpoints.catalogue.products, request);
  }

  updateProduct(id: string, request: ProductRequest): Observable<Product> {
    return this.api.put<Product>(ApiEndpoints.catalogue.product(id), request);
  }

  deactivateProduct(id: string): Observable<void> {
    return this.api.delete<void>(ApiEndpoints.catalogue.product(id));
  }

  /** Drops every lookup cache after a master changes. */
  invalidate(): void {
    this.categories$ = null;
    this.productTypes$ = null;
    this.brands$ = null;
    this.collections$ = null;
  }

  private cached(path: string): Observable<MasterRecord[]> {
    return this.api.get<MasterRecord[]>(path).pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }
}

/** Name of the master with this id, or an em dash. Used across the module. */
export function nameOf(records: readonly MasterRecord[], id: string | null): string {
  if (!id) {
    return '—';
  }
  return records.find((record) => record.id === id)?.name ?? '—';
}
