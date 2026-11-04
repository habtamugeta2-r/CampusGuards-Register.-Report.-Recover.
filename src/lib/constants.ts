import type { InstitutionKind, ProductType, Role } from './types';

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

/**
 * Kinds of organisation that can use the platform. Universities are where this
 * started; colleges, TVET institutes, companies and government offices have the
 * same four needs (register equipment, report it missing, verify it at a gate,
 * authorise someone else to carry it), so the tenant is typed rather than
 * hard-coded to higher education.
 */
export const INSTITUTION_KINDS = [
  'UNIVERSITY',
  'COLLEGE',
  'TVET',
  'SCHOOL',
  'COMPANY',
  'GOVERNMENT',
  'NGO',
  'OTHER',
] as const;

export const INSTITUTION_KIND_LABEL: Record<(typeof INSTITUTION_KINDS)[number], string> = {
  UNIVERSITY: 'University',
  COLLEGE: 'College',
  TVET: 'TVET institute',
  SCHOOL: 'School',
  COMPANY: 'Company',
  GOVERNMENT: 'Government office',
  NGO: 'NGO / non-profit',
  OTHER: 'Other organisation',
};

export const INSTITUTION_STATUSES = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CLOSED'] as const;

export const INSTITUTION_STATUS_LABEL: Record<(typeof INSTITUTION_STATUSES)[number], string> = {
  TRIAL: 'Trial',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  CLOSED: 'Closed',
};

/**
 * The same registry serves universities and companies, and the same role
 * (`STUDENT`) covers a student, an employee and a member of staff. Calling them
 * "students" inside a company tenant is the kind of small lie that makes people
 * distrust the rest of the interface, so the words come from the tenant's kind.
 */
export const MEMBER_LABELS: Record<InstitutionKind, { noun: string; plural: string; idLabel: string }> = {
  UNIVERSITY: { noun: 'Student', plural: 'Students', idLabel: 'Student ID' },
  COLLEGE: { noun: 'Student', plural: 'Students', idLabel: 'Student ID' },
  TVET: { noun: 'Trainee', plural: 'Trainees', idLabel: 'Trainee ID' },
  SCHOOL: { noun: 'Student', plural: 'Students', idLabel: 'Student ID' },
  COMPANY: { noun: 'Employee', plural: 'Employees', idLabel: 'Employee ID' },
  GOVERNMENT: { noun: 'Staff member', plural: 'Staff', idLabel: 'Staff ID' },
  NGO: { noun: 'Staff member', plural: 'Staff', idLabel: 'Staff ID' },
  OTHER: { noun: 'Member', plural: 'Members', idLabel: 'Member ID' },
};

export function memberLabels(kind: InstitutionKind | string | null | undefined) {
  return MEMBER_LABELS[(kind ?? 'OTHER') as InstitutionKind] ?? MEMBER_LABELS.OTHER;
}
