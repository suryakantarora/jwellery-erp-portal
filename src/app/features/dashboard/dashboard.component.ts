import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { environment } from '../../../environments/environment';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { DashboardMockService } from './dashboard-mock.service';
import { DashboardSnapshot } from './dashboard.model';
import { MetricCardComponent } from './components/metric-card.component';
import { ShareBarsComponent } from './components/share-bars.component';
import { TrendChartComponent } from './components/trend-chart.component';

/**
 * Landing page.
 *
 * The figures here are placeholders drawn from {@link DashboardMockService} —
 * the reporting APIs arrive in Phase 15 — and the page says so plainly rather
 * than presenting invented numbers as real ones.
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    MetricCardComponent,
    TrendChartComponent,
    ShareBarsComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    IconComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly source = inject(DashboardMockService);

  protected readonly auth = inject(AuthService);
  protected readonly branches = inject(BranchContextService);

  protected readonly snapshot = signal<DashboardSnapshot | null>(null);
  protected readonly loading = signal(true);
  protected readonly usingMockData = environment.enableMockDashboard;

  ngOnInit(): void {
    if (!this.usingMockData) {
      this.loading.set(false);
      return;
    }

    this.source.load().subscribe((snapshot) => {
      this.snapshot.set(snapshot);
      this.loading.set(false);
    });
  }

  protected greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    return hour < 17 ? 'Good afternoon' : 'Good evening';
  }

  /** First name only — the header already carries the full identity. */
  protected firstName(): string {
    const fullName = this.auth.user()?.fullName ?? '';
    return fullName.trim().split(/\s+/)[0] || 'there';
  }
}
