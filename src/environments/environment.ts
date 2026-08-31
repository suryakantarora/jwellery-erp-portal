import { AppEnvironment } from '../app/core/config/environment.model';

export const environment: AppEnvironment = {
  production: false,
  name: 'development',
  apiBaseUrl: 'http://localhost:8081',
  apiPrefix: '/api/v1',
  // Refresh the access token this many seconds before it actually expires so an
  // in-flight request never races the expiry.
  tokenRefreshLeewaySeconds: 60,
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
  enableMockDashboard: true,
};
