/** Shape every environment file must satisfy. */
export interface AppEnvironment {
  readonly production: boolean;
  readonly name: string;
  /** Origin of the Spring Boot backend. Empty when served from the same origin. */
  readonly apiBaseUrl: string;
  /** Version prefix shared by every REST endpoint. */
  readonly apiPrefix: string;
  readonly tokenRefreshLeewaySeconds: number;
  readonly defaultPageSize: number;
  readonly pageSizeOptions: readonly number[];
  /**
   * Whether the dashboard renders mock tiles. Phase 1 has no reporting APIs
   * wired up yet; this flag keeps the mock data out of production builds.
   */
  readonly enableMockDashboard: boolean;
}
