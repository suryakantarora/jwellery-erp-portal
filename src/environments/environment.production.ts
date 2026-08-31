import { AppEnvironment } from '../app/core/config/environment.model';

export const environment: AppEnvironment = {
  production: true,
  name: 'production',
  // Served behind the same gateway as the API in production.
  apiBaseUrl: '',
  apiPrefix: '/api/v1',
  tokenRefreshLeewaySeconds: 60,
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
  enableMockDashboard: false,
};
