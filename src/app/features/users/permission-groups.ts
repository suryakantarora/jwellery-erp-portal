import { PermissionDefinition } from '../../core/models/identity.model';

/** One module's slice of the permission catalogue. */
export interface PermissionGroup {
  readonly module: string;
  readonly label: string;
  readonly permissions: readonly PermissionDefinition[];
}

/** Words that read wrong in title case and stay as the backend spells them. */
const ACRONYMS = new Set(['CRM', 'KYC', 'POS', 'RFID', 'QR', 'SMS', 'ERP', 'BI']);

/** Turns SCREAMING_SNAKE module and permission codes into readable text. */
export function humanise(code: string): string {
  return code
    .split('_')
    .map((word) =>
      ACRONYMS.has(word.toUpperCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ');
}

/**
 * Groups the backend's permission catalogue by module, so the role matrix and
 * the permission browser follow the server's own grouping rather than a copy
 * of it kept in the portal.
 */
export function groupPermissions(permissions: readonly PermissionDefinition[]): PermissionGroup[] {
  const byModule = new Map<string, PermissionDefinition[]>();

  for (const permission of permissions) {
    const module = permission.module || 'OTHER';
    const bucket = byModule.get(module);
    if (bucket) {
      bucket.push(permission);
    } else {
      byModule.set(module, [permission]);
    }
  }

  return [...byModule.entries()]
    .map(([module, entries]) => ({
      module,
      label: humanise(module),
      permissions: [...entries].sort((left, right) => left.code.localeCompare(right.code)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}
