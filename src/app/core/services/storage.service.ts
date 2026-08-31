import { Injectable } from '@angular/core';

/**
 * Thin wrapper over Web Storage.
 *
 * Every access is guarded: private browsing modes and hardened browser settings
 * make `localStorage` throw rather than return null, and a portal that crashes
 * on boot because of a storage policy is worse than one that forgets a
 * preference.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage unavailable — the preference simply does not persist.
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to do.
    }
  }

  readJson<T>(key: string): T | null {
    const raw = this.read(key);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.remove(key);
      return null;
    }
  }

  writeJson(key: string, value: unknown): void {
    try {
      this.write(key, JSON.stringify(value));
    } catch {
      // Value was not serialisable; skip rather than break the caller.
    }
  }
}
