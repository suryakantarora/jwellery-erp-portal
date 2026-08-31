/**
 * Inline SVG path data for every icon in the portal.
 *
 * Icons ship as path strings rather than an icon font or an external sprite so
 * they inherit `currentColor`, cost no extra request, and stay crisp in both
 * themes. All paths are drawn on a 24x24 grid with a 1.6 stroke.
 */
export const ICON_PATHS = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
  organization: 'M3 21h18M6 21V8l6-4 6 4v13M10 12h4M10 16h4',
  users:
    'M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm10 8v-1.5a3.5 3.5 0 0 0-2.7-3.4M15.5 5.2a3.5 3.5 0 0 1 0 6.6',
  products: 'M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Zm0 0v18M3 7.5 12 12l9-4.5',
  inventory: 'M4 8h16M4 8 6 4h12l2 4M4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8M10 12h4',
  procurement:
    'M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20 8H6M9 20.5h.01M17 20.5h.01',
  pricing:
    'M20.6 12.3 12.3 20.6a1.5 1.5 0 0 1-2.1 0l-7-7A1.5 1.5 0 0 1 2.8 12.5V4.5A1.5 1.5 0 0 1 4.3 3h8a1.5 1.5 0 0 1 1.1.4l7.2 7.2a1.5 1.5 0 0 1 0 2.1ZM7.5 7.5h.01',
  customers:
    'M17 20v-1.5A3.5 3.5 0 0 0 13.5 15h-5A3.5 3.5 0 0 0 5 18.5V20M11 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  crm: 'M4 5h16v11H8l-4 4V5Zm4 4h8M8 12h5',
  loyalty: 'm12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z',
  repairs: 'm14.7 6.3 3 3M3 21l1-4 10.3-10.3a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L8 21H3Z',
  exchange: 'M4 8h13l-3-3M20 16H7l3 3',
  warehouse: 'M3 21V9l9-5 9 5v12M3 21h18M9 21v-6h6v6M7 12h2M15 12h2',
  finance: 'M3 20h18M6 20V10M11 20V4M16 20v-7M21 20v-4',
  notifications: 'M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9ZM13.7 19a2 2 0 0 1-3.4 0',
  reports:
    'M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M9 3h6v3H9V3Zm-1 9h8M8 16h5',
  compliance: 'M12 3 4 6v6c0 4.5 3.2 8.3 8 9 4.8-.7 8-4.5 8-9V6l-8-3Zm-2.5 9.5 2 2 4.5-4.5',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2l-.4-2.6h-4l-.4 2.6c-.7.3-1.4.7-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  chevronUp: 'm6 15 6-6 6 6',
  chevronsLeft: 'm11 6-6 6 6 6M18 6l-6 6 6 6',
  chevronsRight: 'm13 6 6 6-6 6M6 6l6 6-6 6',
  close: 'M6 6 18 18M18 6 6 18',
  check: 'm5 13 4 4L19 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  sort: 'M8 4v16m0 0-3-3m3 3 3-3M16 20V4m0 0-3 3m3-3 3 3',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 19h16',
  upload: 'M12 21V9m0 0 4 4M12 9l-4 4M4 5h16',
  refresh: 'M20 11a8 8 0 0 0-13.7-5.3L4 8m0-5v5h5M4 13a8 8 0 0 0 13.7 5.3L20 16m0 5v-5h-5',
  logout: 'M15 17l5-5-5-5M20 12H9M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  branch:
    'M12 21V10m0 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 5 5-3M12 15l-5-3M17 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-14v2m0 14v2M5.6 5.6 7 7m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17M17 7l1.4-1.4',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  monitor: 'M4 5h16v10H4V5Zm4 15h8m-4-5v5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9v5m0-9h.01',
  warning: 'M12 4 2.5 20h19L12 4Zm0 6v5m0 3h.01',
  danger: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9 9l6 6m0-6-6 6',
  success: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3.5-9 2.5 2.5L15.5 9',
  empty: 'M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Zm0 0 2-4h12l2 4M9 13h6',
  lock: 'M6 11h12v9H6v-9Zm2 0V7a4 4 0 1 1 8 0v4',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  eyeOff:
    'M4 4l16 16M10 5.8A7.7 7.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M6 7.8A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1 0 2-.2 2.8-.5M10.2 10.2a2.5 2.5 0 0 0 3.5 3.5',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5',
  image: 'M4 5h16v14H4V5Zm0 10 4.5-4.5L14 16m2-3 4 4M15.5 9.5h.01',
  trash: 'M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13M10 11v5m4-5v5',
  edit: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z',
  more: 'M12 6h.01M12 12h.01M12 18h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  gem: 'M12 3 3 9l9 12 9-12-9-6Zm0 0L8 9l4 12M12 3l4 6-4 12M3 9h18',
  approvals: 'M4 6h16M4 12h10M4 18h7m4 1 2.5 2.5L22 16',
} as const;

export type IconName = keyof typeof ICON_PATHS;
