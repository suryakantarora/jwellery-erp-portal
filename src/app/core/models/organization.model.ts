export type OrganizationStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Where an item can physically be. Mirrors `LocationType.java`; the
 * `stockHolding` flag is repeated here so the UI can warn when a location that
 * cannot hold stock is chosen.
 */
export const LOCATION_TYPES = [
  { value: 'HEAD_OFFICE', label: 'Head office', stockHolding: false },
  { value: 'CENTRAL_WAREHOUSE', label: 'Central warehouse', stockHolding: true },
  { value: 'BRANCH_WAREHOUSE', label: 'Branch warehouse', stockHolding: true },
  { value: 'SHOWROOM', label: 'Showroom', stockHolding: true },
  { value: 'COUNTER', label: 'Counter', stockHolding: true },
  { value: 'VAULT', label: 'Vault', stockHolding: true },
  { value: 'STORE_ROOM', label: 'Store room', stockHolding: true },
  { value: 'IN_TRANSIT', label: 'In transit', stockHolding: false },
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number]['value'];

export function locationTypeLabel(type: LocationType | null | undefined): string {
  return LOCATION_TYPES.find((entry) => entry.value === type)?.label ?? '—';
}

export interface Company {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly taxNumber: string | null;
  readonly registrationNumber: string | null;
  readonly baseCurrency: string | null;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly status: OrganizationStatus;
}

/** Body of `POST /companies` and `PUT /companies/{id}`. */
export interface CompanyRequest {
  readonly code: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly taxNumber: string | null;
  readonly registrationNumber: string | null;
  readonly baseCurrency: string | null;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly phone: string | null;
  readonly email: string | null;
}

export interface Branch {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly headOffice: boolean;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly timezone: string | null;
  readonly status: OrganizationStatus;
}

export interface BranchRequest {
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly headOffice: boolean;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly timezone: string | null;
}

export interface Location {
  readonly id: string;
  readonly branchId: string;
  readonly parentId: string | null;
  readonly code: string;
  readonly name: string;
  readonly type: LocationType;
  readonly dualAuthorization: boolean;
  readonly lowStockThreshold: number | null;
  readonly description: string | null;
  readonly status: OrganizationStatus;
}

export interface LocationRequest {
  readonly branchId: string;
  readonly parentId: string | null;
  readonly code: string;
  readonly name: string;
  readonly type: LocationType;
  readonly dualAuthorization: boolean;
  readonly lowStockThreshold: number | null;
  readonly description: string | null;
}
