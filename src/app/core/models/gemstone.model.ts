export const STONE_SHAPES = [
  'ROUND',
  'PRINCESS',
  'OVAL',
  'MARQUISE',
  'PEAR',
  'CUSHION',
  'EMERALD',
  'ASSCHER',
  'RADIANT',
  'HEART',
  'BAGUETTE',
  'TRILLION',
  'CABOCHON',
  'OTHER',
] as const;

export type StoneShape = (typeof STONE_SHAPES)[number];

export const STONE_SETTING_TYPES = [
  'PRONG',
  'BEZEL',
  'CHANNEL',
  'PAVE',
  'TENSION',
  'FLUSH',
  'CLUSTER',
  'OTHER',
] as const;

export type StoneSettingType = (typeof STONE_SETTING_TYPES)[number];

export interface Gemstone {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly diamond: boolean;
  readonly precious: boolean;
  readonly description: string | null;
  readonly active: boolean;
}

export interface GemstoneRequest {
  readonly code: string;
  readonly name: string;
  readonly diamond: boolean;
  readonly precious: boolean;
  readonly description: string | null;
}

/**
 * A lab certificate.
 *
 * Certificates exist independently of the stone they describe — one can be
 * recorded before anyone knows which item it will be attached to — so the PDF
 * lives in file storage and the record keeps only its key.
 */
export interface StoneCertificate {
  readonly id: string;
  readonly certificateNumber: string;
  readonly issuingLab: string;
  readonly issueDate: string | null;
  readonly storageKey: string | null;
  readonly verificationUrl: string | null;
  readonly notes: string | null;
}

export interface CertificateRequest {
  readonly certificateNumber: string;
  readonly issuingLab: string;
  readonly issueDate: string | null;
  readonly storageKey: string | null;
  readonly verificationUrl: string | null;
  readonly notes: string | null;
}

/** A stone set into a specific jewellery item. */
export interface ItemStone {
  readonly id: string;
  readonly jewelleryItemId: string;
  readonly gemstoneId: string;
  readonly gemstoneName: string;
  readonly certificateId: string | null;
  readonly certificateNumber: string | null;
  readonly stoneCount: number;
  readonly caratWeight: number;
  readonly shape: StoneShape | null;
  readonly cut: string | null;
  readonly colour: string | null;
  readonly clarity: string | null;
  readonly settingType: StoneSettingType | null;
  readonly ratePerCarat: number | null;
  readonly stoneValue: number | null;
  readonly weightGrams: number | null;
  readonly notes: string | null;
}
