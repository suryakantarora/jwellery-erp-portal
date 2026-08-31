# Jewellery ERP — Admin Portal

Angular 22 administration portal for the jewellery platform. It is a pure
frontend: all business logic lives in the existing Spring Boot backend
(`../pvj-backend`), which this app consumes over REST with JWT authentication.

## Running

```bash
npm install
npm start          # http://localhost:4200
```

The backend is expected at `http://localhost:8080` — see
`src/environments/environment.ts`. Start it with `docker-compose up -d` followed
by `mvn spring-boot:run` in `../pvj-backend`.

## Structure

```text
src/app
├── core        # auth, guards, interceptors, API client, app-wide services
├── shared      # reusable components, directives, pipes, form utilities
├── layout      # shell, header, sidebar, breadcrumb, notification centre
└── features    # one folder per module, all lazily loaded
src/styles      # design tokens, base element styles, control styles
```

### Conventions

- **Every colour is a token.** Components never hardcode a colour; light and
  dark themes swap the custom properties in `src/styles/_tokens.scss`, and the
  brand accent is re-pointed there alone.
- **All HTTP goes through `ApiService`**, which resolves paths from
  `core/config/api.endpoints.ts` and unwraps the backend's `ApiResponse`
  envelope. Feature services deal in domain types only.
- **Errors are normalised once** by the error interceptor into an `AppError`;
  401 and 400 are excluded from the automatic toast because the auth
  interceptor and the owning form handle them respectively.
- **Permissions are advisory in the UI.** `*appHasPermission`, the
  `permissionGuard` and the sidebar filter hide what a user cannot do, but the
  backend remains the authority on every call.
- **Lists are server-driven.** `DataTableComponent` emits sort and page intent;
  the page re-queries. Nothing is sorted or paged in the browser.

## Phase status

Phase 1 (foundation) is complete: authentication, the application shell,
theming, the permission architecture, the shared component library and lazily
loaded routes for every module. Modules from Phase 2 onwards render a
placeholder that names the phase which delivers them; those routes are replaced
one at a time as each phase is built and wired to the backend.
