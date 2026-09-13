# PHASE 17 — Settings & Production Polish

Complete the Admin ERP.

## Settings

Build:

- Company settings
- Branch settings
- Currency
- Tax configuration
- Invoice numbering
- Notification settings
- User preferences
- Theme settings
- System configuration

## Production polish

Review the entire application for:

- Consistent UI
- Responsive behavior
- Accessibility
- Keyboard navigation
- Loading states
- Empty states
- Error handling
- API error messages
- Form validation
- Pagination
- Search
- Filtering
- Permission handling
- Session expiry
- Unsaved form changes
- Confirmation dialogs

## Performance

Implement where appropriate:

- Lazy loading
- Route-level code splitting
- Efficient RxJS subscriptions
- OnPush/change detection strategy where appropriate
- Pagination instead of loading large datasets
- Debounced search
- Image optimization
- Avoid unnecessary API requests

## Security

Never rely on frontend permissions alone.

Backend authorization remains authoritative.

Do not store sensitive secrets in frontend source code.

Do not expose internal cost or compliance information to users who do not have permission.