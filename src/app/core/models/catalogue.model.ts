/** Lifecycle shared by every master-data record in the catalogue. */
export type MasterStatus = 'ACTIVE' | 'INACTIVE';

/**
 * The shape the backend returns for its simple lookup masters — categories,
 * product types, brands and collections all come back as this one record, with
 * the fields that do not apply left null.
 */
export interface MasterRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  /** Parent category, for categories; owning category, for product types. */
  readonly parentId: string | null;
  /** Product types only: whether pieces of this type carry a size. */
  readonly sizeable: boolean | null;
  readonly displayOrder: number | null;
  readonly status: MasterStatus;
}

export interface CategoryRequest {
  readonly code: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly description: string | null;
  readonly displayOrder: number | null;
}

export interface ProductTypeRequest {
  readonly code: string;
  readonly name: string;
  readonly categoryId: string | null;
  readonly sizeable: boolean;
  readonly description: string | null;
}

/** Brands and collections share one request shape. */
export interface SimpleMasterRequest {
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
}

export interface ProductSize {
  readonly id: string;
  readonly productTypeId: string;
  readonly code: string;
  readonly label: string;
  readonly standard: string | null;
  readonly displayOrder: number | null;
  readonly status: MasterStatus;
}

export interface SizeRequest {
  readonly productTypeId: string;
  readonly code: string;
  readonly label: string;
  readonly standard: string | null;
  readonly displayOrder: number | null;
}

export interface Design {
  readonly id: string;
  readonly designCode: string;
  readonly name: string;
  readonly productTypeId: string | null;
  readonly collectionId: string | null;
  readonly brandId: string | null;
  readonly designer: string | null;
  readonly nominalGrossWeight: number | null;
  readonly description: string | null;
  readonly status: MasterStatus;
}

export interface DesignRequest {
  readonly designCode: string;
  readonly name: string;
  readonly productTypeId: string | null;
  readonly collectionId: string | null;
  readonly brandId: string | null;
  readonly designer: string | null;
  readonly nominalGrossWeight: number | null;
  readonly description: string | null;
}

export interface Product {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly designId: string | null;
  readonly productTypeId: string;
  readonly categoryId: string | null;
  readonly brandId: string | null;
  readonly collectionId: string | null;
  readonly defaultMetalId: string | null;
  readonly defaultPurityId: string | null;
  readonly nominalGrossWeight: number | null;
  readonly defaultMakingChargeType: string | null;
  readonly defaultMakingChargeValue: number | null;
  readonly defaultWastagePercentage: number | null;
  readonly hsnCode: string | null;
  readonly description: string | null;
  readonly status: MasterStatus;
}

export interface ProductRequest {
  readonly sku: string;
  readonly name: string;
  readonly designId: string | null;
  readonly productTypeId: string;
  readonly categoryId: string | null;
  readonly brandId: string | null;
  readonly collectionId: string | null;
  readonly defaultMetalId: string | null;
  readonly defaultPurityId: string | null;
  readonly nominalGrossWeight: number | null;
  readonly defaultMakingChargeType: string | null;
  readonly defaultMakingChargeValue: number | null;
  readonly defaultWastagePercentage: number | null;
  readonly hsnCode: string | null;
  readonly description: string | null;
}

/** How a making charge is expressed; mirrors the pricing module's options. */
export const MAKING_CHARGE_TYPES = [
  { value: 'PER_GRAM', label: 'Per gram' },
  { value: 'PERCENTAGE', label: 'Percentage of metal value' },
  { value: 'FLAT', label: 'Flat amount' },
] as const;

export type MakingChargeType = (typeof MAKING_CHARGE_TYPES)[number]['value'];

export function makingChargeLabel(type: string | null | undefined): string {
  return MAKING_CHARGE_TYPES.find((entry) => entry.value === type)?.label ?? '—';
}
