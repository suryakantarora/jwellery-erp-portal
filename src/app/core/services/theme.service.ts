import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { StorageKeys } from '../config/api.config';
import { StorageService } from './storage.service';

export type ThemePreference = 'light' | 'dark' | 'system';

const PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

/**
 * The accent palettes a deployment can choose between.
 *
 * The ramps themselves live in `styles/_accents.scss`; this list is what the
 * picker offers, and `swatch` is the mid tone shown on the chip.
 */
export const ACCENTS = [
  {
    value: 'modern-purple',
    label: 'Modern Purple',
    mood: 'Creative · Modern · Premium',
    swatch: '#6d28d9',
  },
  {
    value: 'ocean-breeze',
    label: 'Ocean Breeze',
    mood: 'Calm · Fresh · Trustworthy',
    swatch: '#0ea5e9',
  },
  {
    value: 'nature-green',
    label: 'Nature Green',
    mood: 'Natural · Balanced · Calm',
    swatch: '#16a34a',
  },
  {
    value: 'sunset-vibes',
    label: 'Sunset Vibes',
    mood: 'Warm · Energetic · Friendly',
    swatch: '#f97316',
  },
  {
    value: 'blush-pink',
    label: 'Blush Pink',
    mood: 'Soft · Feminine · Elegant',
    swatch: '#ec4899',
  },
  {
    value: 'deep-blue',
    label: 'Deep Blue',
    mood: 'Professional · Strong · Reliable',
    swatch: '#1e3a8a',
  },
  {
    value: 'bright-yellow',
    label: 'Bright Yellow',
    mood: 'Cheerful · Optimistic · Bold',
    swatch: '#eab308',
  },
  {
    value: 'teal-harmony',
    label: 'Teal Harmony',
    mood: 'Modern · Clean · Balanced',
    swatch: '#14b8a6',
  },
  {
    value: 'royal-dark',
    label: 'Royal Dark',
    mood: 'Luxury · Elegant · Sophisticated',
    swatch: '#4c1d95',
  },
  {
    value: 'minimal-neutral',
    label: 'Minimal Neutral',
    mood: 'Clean · Simple · Timeless',
    swatch: '#374151',
  },
] as const;

export type Accent = (typeof ACCENTS)[number]['value'];

const DEFAULT_ACCENT: Accent = 'modern-purple';

/** Institution id → chosen accent, as persisted. */
type AccentMap = Record<string, Accent>;

/**
 * Owns how the portal looks: the light/dark preference, and the accent palette.
 *
 * Light/dark is a personal setting, so it is stored once per browser.
 *
 * The accent is not: one deployment serves several institutions, and an
 * operator switching between them should see each one's own colour rather than
 * their own preference bleeding across. It is therefore stored per institution,
 * keyed by company, with a shared fallback for the login screen and for anyone
 * whose branch has no company yet.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(StorageService);

  private readonly current = signal<ThemePreference>(this.restore());
  private readonly accents = signal<AccentMap>(this.restoreAccents());
  /** The institution whose palette is in force; null before sign-in. */
  private readonly institution = signal<string | null>(null);

  readonly preference = this.current.asReadonly();
  readonly accentOptions = ACCENTS;

  /** The accent actually rendered right now. */
  readonly accent = computed<Accent>(() => {
    const map = this.accents();
    const company = this.institution();
    return (company ? map[company] : undefined) ?? map['default'] ?? DEFAULT_ACCENT;
  });

  /** Whether the current accent was set for this institution specifically. */
  readonly accentIsInstitutional = computed(() => {
    const company = this.institution();
    return !!company && !!this.accents()[company];
  });

  constructor() {
    effect(() => this.apply(this.current()));
    effect(() => this.applyAccent(this.accent()));
  }

  set(preference: ThemePreference): void {
    this.current.set(preference);
    this.storage.write(StorageKeys.theme, preference);
  }

  /**
   * Flips between light and dark for a single-button control.
   *
   * Deliberately not a three-way cycle through 'system': when the OS is already
   * dark, 'system' and 'dark' render identically, so one press in three would
   * appear to do nothing. This always switches to the opposite of what is on
   * screen, so every press visibly changes something. 'system' remains the
   * default and is still selectable from the explicit picker in the user menu.
   */
  toggle(): void {
    this.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  /** Points the palette at an institution; call when the active branch changes. */
  useInstitution(companyId: string | null): void {
    this.institution.set(companyId);
  }

  /**
   * Chooses the accent for the institution in force, falling back to the shared
   * default when nobody is signed in.
   */
  setAccent(accent: Accent): void {
    const key = this.institution() ?? 'default';
    this.accents.update((current) => {
      const next = { ...current, [key]: accent };
      this.storage.write(StorageKeys.accents, JSON.stringify(next));
      return next;
    });
  }

  /** The theme actually rendered right now, resolving 'system'. */
  resolved(): 'light' | 'dark' {
    const preference = this.current();
    if (preference !== 'system') {
      return preference;
    }
    return this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private apply(preference: ThemePreference): void {
    const root = this.document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
  }

  private applyAccent(accent: Accent): void {
    this.document.documentElement.setAttribute('data-accent', accent);
  }

  private restore(): ThemePreference {
    const stored = this.storage.read(StorageKeys.theme);
    return PREFERENCES.includes(stored as ThemePreference) ? (stored as ThemePreference) : 'system';
  }

  private restoreAccents(): AccentMap {
    const stored = this.storage.read(StorageKeys.accents);
    if (!stored) {
      return {};
    }
    try {
      const parsed: unknown = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      // Drop anything that is no longer a palette we ship.
      const known = new Set<string>(ACCENTS.map((entry) => entry.value));
      return Object.fromEntries(
        Object.entries(parsed as Record<string, string>).filter(([, value]) => known.has(value)),
      ) as AccentMap;
    } catch {
      return {};
    }
  }
}
