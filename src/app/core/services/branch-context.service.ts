import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { StorageKeys } from '../config/api.config';
import { ApiEndpoints } from '../config/api.endpoints';
import { AuthService } from '../auth/auth.service';
import { Branch } from '../models/organization.model';
import { PageResponse } from '../models/api.model';
import { ApiService } from './api.service';
import { SILENT } from '../interceptors/http-context.tokens';
import { StorageService } from './storage.service';
import { ThemeService } from './theme.service';

/**
 * The branch an operator is currently working in.
 *
 * ERP data is branch-scoped, so most feature queries carry this id. It is held
 * centrally — and persisted — so switching branch in the header takes effect
 * everywhere without each page tracking its own copy.
 */
@Injectable({ providedIn: 'root' })
export class BranchContextService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly theme = inject(ThemeService);

  private readonly branches = signal<Branch[]>([]);
  private readonly activeId = signal<string | null>(this.storage.read(StorageKeys.activeBranch));
  private readonly loading = signal(false);

  /** Branches the signed-in user is assigned to. */
  readonly available = this.branches.asReadonly();
  readonly isLoading = this.loading.asReadonly();

  readonly activeBranchId = this.activeId.asReadonly();
  readonly activeBranch = computed(
    () => this.branches().find((branch) => branch.id === this.activeId()) ?? null,
  );
  readonly canSwitch = computed(() => this.branches().length > 1);

  constructor() {
    // One deployment serves several institutions, so the palette follows the
    // company whose branch the operator is working in.
    effect(() => this.theme.useInstitution(this.activeBranch()?.companyId ?? null));
  }

  /**
   * Loads the branches visible to the user and settles on an active one.
   *
   * A user assigned to specific branches only sees those; the previously chosen
   * branch is honoured when it is still assigned, otherwise the primary branch
   * wins, and failing that the first one available.
   */
  load(): void {
    if (!this.auth.isAuthenticated() || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.api
      .get<PageResponse<Branch>>(ApiEndpoints.organization.branches, {
        params: { size: 200, sort: 'name' },
        context: SILENT(),
      })
      .pipe(
        catchError(() => of(null)),
        tap(() => this.loading.set(false)),
      )
      .subscribe((page) => {
        if (!page) {
          return;
        }
        const user = this.auth.user();
        const assigned = user?.branchIds ?? [];
        const visible =
          assigned.length > 0
            ? page.content.filter((branch) => assigned.includes(branch.id))
            : page.content;

        this.branches.set(visible);
        this.settleActive(visible);
      });
  }

  setActive(branchId: string): void {
    if (!this.branches().some((branch) => branch.id === branchId)) {
      return;
    }
    this.activeId.set(branchId);
    this.storage.write(StorageKeys.activeBranch, branchId);
  }

  clear(): void {
    this.branches.set([]);
    this.activeId.set(null);
    this.storage.remove(StorageKeys.activeBranch);
  }

  private settleActive(visible: readonly Branch[]): void {
    const stored = this.activeId();
    if (stored && visible.some((branch) => branch.id === stored)) {
      return;
    }

    const primary = this.auth.user()?.primaryBranchId ?? null;
    const chosen =
      (primary && visible.find((branch) => branch.id === primary)?.id) ?? visible[0]?.id ?? null;

    this.activeId.set(chosen);
    if (chosen) {
      this.storage.write(StorageKeys.activeBranch, chosen);
    }
  }
}
