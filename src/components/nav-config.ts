import type { Role } from '@/lib/types';

/**
 * Navigation model, kept in a plain module so server components (the shells)
 * can build it and the client sidebar can render it. Icons are referenced by
 * name and resolved to components inside nav.tsx.
 */

export type IconName =
  | 'home'
  | 'laptop'
  | 'file'
  | 'swap'
  | 'bell'
  | 'lock'
  | 'qr'
  | 'history'
  | 'book'
  | 'chart'
  | 'inbox'
  | 'tag'
  | 'users'
  | 'map-pin'
  | 'audit'
  | 'settings'
  | 'globe'
  | 'building';

export type SidebarItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Unread-style counter rendered as a small pill. */
  badge?: number;
};

export type SidebarSection = {
  label?: string;
  items: SidebarItem[];
};

export const CONSOLE_LABEL: Record<Role, string> = {
  STUDENT: 'Student portal',
  SECURITY: 'Security console',
  ADMIN: 'Administration',
};

export function sectionsForRole(role: Role, unread: number): SidebarSection[] {
  if (role === 'STUDENT') {
    return [
      {
        items: [
          { href: '/student', label: 'Overview', icon: 'home' },
          { href: '/student/products', label: 'My devices', icon: 'laptop' },
          { href: '/student/reports', label: 'Reports', icon: 'file' },
          { href: '/student/authorizations', label: 'Borrowing', icon: 'swap' },
        ],
      },
      {
        label: 'Account',
        items: [
          { href: '/student/notifications', label: 'Notifications', icon: 'bell', badge: unread },
          { href: '/student/privacy', label: 'My data', icon: 'lock' },
        ],
      },
    ];
  }
  if (role === 'SECURITY') {
    return [
      {
        items: [
          { href: '/security', label: 'Scan', icon: 'qr' },
          { href: '/security/history', label: 'My scans', icon: 'history' },
          { href: '/security/guidance', label: 'Guidance', icon: 'book' },
        ],
      },
      {
        label: 'Account',
        items: [{ href: '/student/notifications', label: 'Notifications', icon: 'bell', badge: unread }],
      },
    ];
  }
  return [
    {
      items: [
        { href: '/admin', label: 'Dashboard', icon: 'chart' },
        { href: '/admin/reports', label: 'Reports', icon: 'file' },
        { href: '/admin/found', label: 'Found items', icon: 'inbox' },
        { href: '/admin/products', label: 'Registry', icon: 'tag' },
        { href: '/admin/users', label: 'People', icon: 'users' },
      ],
    },
    {
      label: 'Field operations',
      items: [
        { href: '/admin/checkpoints', label: 'Checkpoints', icon: 'map-pin' },
        { href: '/admin/scans', label: 'Scan log', icon: 'history' },
      ],
    },
    {
      label: 'Governance',
      items: [
        { href: '/admin/audit', label: 'Audit log', icon: 'audit' },
        { href: '/admin/settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ];
}
