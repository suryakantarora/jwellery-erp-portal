import { IconName } from '../../shared/components/icon/icon.registry';
import { Tone } from '../../core/models/ui.model';

/** A headline figure on the dashboard. */
export interface MetricTile {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly caption: string;
  readonly icon: IconName;
  /** Period-over-period movement as a percentage; null when not applicable. */
  readonly delta: number | null;
  readonly tone: Tone;
}

/** One bar in the sales trend chart. */
export interface TrendPoint {
  readonly label: string;
  readonly value: number;
}

/** A slice of the inventory-by-category breakdown. */
export interface CategoryShare {
  readonly label: string;
  readonly value: number;
}

export interface ActivityEntry {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly at: string;
  readonly icon: IconName;
}

export interface DashboardSnapshot {
  readonly metrics: readonly MetricTile[];
  readonly salesTrend: readonly TrendPoint[];
  readonly inventoryByCategory: readonly CategoryShare[];
  readonly activity: readonly ActivityEntry[];
}
