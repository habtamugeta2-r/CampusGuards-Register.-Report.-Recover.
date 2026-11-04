import type { ProductType, Role } from './types';

export const SESSION_COOKIE = 'cg_session';
export const SESSION_TTL_HOURS = 12;
export const OFFICER_SESSION_TTL_HOURS = 10;

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: '/student',
  SECURITY: '/security',
  ADMIN: '/admin',
};

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Student',
  SECURITY: 'Security officer',
  ADMIN: 'Administrator',
};

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  LAPTOP: 'Laptop',
  PHONE: 'Phone',
  TABLET: 'Tablet',
  MONITOR: 'Monitor',
  CAMERA: 'Camera',
  AUDIO: 'Audio equipment',
  WATCH: 'Watch',
  OTHER: 'Other',
};

export const PRODUCT_TYPES = Object.keys(PRODUCT_TYPE_LABEL) as ProductType[];

/** QR label artwork sizes. */
export const QR_LABEL_SIZES = {
  small: 128,
  medium: 256,
  large: 512,
} as const;

/** How long a security officer's offline registry cache stays valid. */
export const OFFLINE_CACHE_TTL_HOURS = 12;

/** Maximum number of registry rows pushed to an officer's device cache. */
export const OFFLINE_CACHE_MAX_ROWS = 20000;

export const SCAN_RESULT_META = {
  REGISTERED_OK: {
    label: 'Registered — no active reports',
    tone: 'ok' as const,
    action: 'Allow the student to proceed. Optionally confirm ID.',
  },
  AUTHORIZED_BORROWER: {
    label: 'Registered — authorised borrower',
    tone: 'ok' as const,
    action: 'Confirm the carrier is the authorised borrower, then allow through.',
  },
  ACTIVE_MISSING_REPORT: {
    label: 'Reported missing',
    tone: 'danger' as const,
    action: 'Do not detain anyone. Refer to the security supervisor; the carrier may be a legitimate finder or buyer.',
  },
  NOT_REGISTERED: {
    label: 'Not in the registry',
    tone: 'warn' as const,
    action: 'Absence of registration is not evidence of wrongdoing. Note it and allow through.',
  },
  MISMATCH: {
    label: 'Carrier is not the registered owner',
    tone: 'warn' as const,
    action: 'Ask for ID and clarification. No confiscation or accusation on the basis of this result alone.',
  },
} as const;

/** Data-retention defaults (days) — overridden per institution. */
export const DEFAULT_RETENTION = {
  scanDays: 90,
  reportDays: 730,
  auditDays: 1095,
  notificationDays: 180,
  sessionDays: 30,
};

export const CONSENT_VERSIONS = {
  TERMS_OF_USE: '2026-01-01',
  PRIVACY_NOTICE: '2026-01-01',
  PILOT_PARTICIPATION: '2026-01-01',
  DATA_PROCESSING: '2026-01-01',
} as const;
