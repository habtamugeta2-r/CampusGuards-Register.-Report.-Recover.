/**
 * Domain types.
 *
 * These mirror the database schema in db/migrations/0001_init.sql. The project
 * uses SQL directly (via node-postgres) rather than an ORM on purpose — see
 * docs/02-architecture/adr-0002-sql-access-layer.md.
 */

export type Role = 'STUDENT' | 'SECURITY' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
export type ProductType = 'LAPTOP' | 'PHONE' | 'TABLET' | 'MONITOR' | 'CAMERA' | 'AUDIO' | 'WATCH' | 'OTHER';
export type ProductStatus = 'ACTIVE' | 'REPORTED_MISSING' | 'RECOVERED' | 'RETIRED';
export type IdentifierKind = 'QR_TOKEN' | 'SERIAL' | 'ASSET_TAG';
export type ReportCategory = 'LOST' | 'STOLEN' | 'MISPLACED' | 'CONFISCATED';
export type MissingReportStatus = 'OPEN' | 'RESOLVED_RECOVERED' | 'CLOSED_UNFOUND' | 'WITHDRAWN' | 'FALSE_REPORT';
export type FoundReportStatus = 'PENDING' | 'MATCHED' | 'RETURNED' | 'DISPOSED';
export type ScanResult = 'REGISTERED_OK' | 'AUTHORIZED_BORROWER' | 'ACTIVE_MISSING_REPORT' | 'NOT_REGISTERED' | 'MISMATCH';
export type ScanSource = 'LIVE' | 'OFFLINE_CACHE' | 'MANUAL_ENTRY';
export type NotificationChannel = 'IN_APP' | 'EMAIL';
export type ConsentType = 'TERMS_OF_USE' | 'PRIVACY_NOTICE' | 'PILOT_PARTICIPATION' | 'DATA_PROCESSING';

export type InstitutionKind =
  | 'UNIVERSITY'
  | 'COLLEGE'
  | 'TVET'
  | 'SCHOOL'
  | 'COMPANY'
  | 'GOVERNMENT'
  | 'NGO'
  | 'OTHER';

export type InstitutionStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

/**
 * Platform-level authority, independent of the institution role.
 *
 * 'COUNTRY_ADMIN' is scoped to one country (users.platform_scope_country): a
 * ministry or federation that can measure the platform across every
 * organisation in that country, and cannot open any of them.
 */
export type PlatformRole = 'NONE' | 'PLATFORM_ADMIN' | 'COUNTRY_ADMIN';

/**
 * One organisation using the platform: a university, a college, a company, a
 * government office. Every row of tenant data carries an institution_id, so
 * this is the tenant boundary — see docs/02-architecture/multi-tenancy.md.
 */
export type Institution = {
  id: string;
  name: string;
  code: string;
  email_domain: string;
  city: string | null;
  country: string;
  timezone: string;
  kind: InstitutionKind;
  status: InstitutionStatus;
  licence_expires_at: Date | null;
  seat_limit: number | null;
  logo_url: string | null;
  /** Hex (#rrggbb) or null for the platform default. See src/lib/brand.ts. */
  brand_primary: string | null;
  data_region: string;
  scan_retention_days: number;
  report_retention_days: number;
  audit_retention_days: number;
  qr_token_rotate_days: number;
  require_scan_justification: boolean;
  allow_aggregate_analytics: boolean;
  created_at: Date;
  updated_at: Date;
};

/** An email domain claimed by an organisation. Globally unique. */
export type InstitutionDomain = {
  id: string;
  institution_id: string;
  domain: string;
  is_primary: boolean;
  verified_at: Date | null;
  created_at: Date;
};

/** An organisation's application to join the platform. */
export type InstitutionRequest = {
  id: string;
  organisation_name: string;
  kind: InstitutionKind;
  country: string;
  city: string | null;
  contact_name: string;
  contact_email: string;
  primary_domain: string;
  extra_domains: string[];
  estimated_people: number | null;
  message: string | null;
  status: 'NEW' | 'APPROVED' | 'REJECTED';
  reviewed_by_user_id: string | null;
  reviewed_at: Date | null;
  review_notes: string | null;
  created_institution_id: string | null;
  created_at: Date;
  updated_at: Date;
};

export type PlatformAuditLog = {
  id: string;
  actor_user_id: string | null;
  actor_email: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: unknown;
  ip: string | null;
  user_agent: string | null;
  created_at: Date;
};

export type User = {
  id: string;
  institution_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  role: Role;
  /** Platform-level grant, independent of the institution role. */
  platform_role: PlatformRole;
  platform_scope_country: string | null;
  status: UserStatus;
  last_login_at: Date | null;
  password_changed_at: Date;
  failed_login_count: number;
  locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

/** A user row with the password hash removed. Never send the hash to the client. */
export type SafeUser = Omit<User, 'password_hash'>;

export type StudentProfile = {
  id: string;
  user_id: string;
  student_id: string;
  department: string | null;
  year_of_study: number | null;
  dorm: string | null;
  fayda_id: string | null;
  created_at: Date;
  updated_at: Date;
};

export type SessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  ip: string | null;
  user_agent: string | null;
  created_at: Date;
  last_seen_at: Date;
};

export type Product = {
  id: string;
  institution_id: string;
  owner_id: string;
  type: ProductType;
  brand: string;
  model: string;
  serial_number: string | null;
  color: string | null;
  distinguishing_marks: string | null;
  photo_url: string | null;
  status: ProductStatus;
  registered_at: Date;
  updated_at: Date;
  retired_at: Date | null;
  retired_reason: string | null;
  notes: string | null;
};

export type ProductIdentifier = {
  id: string;
  product_id: string;
  kind: IdentifierKind;
  value: string;
  label: string | null;
  is_primary: boolean;
  created_at: Date;
  revoked_at: Date | null;
  revoked_reason: string | null;
};

export type Ownership = {
  id: string;
  product_id: string;
  owner_id: string;
  started_at: Date;
  ended_at: Date | null;
  event: string;
  note: string | null;
};

export type BorrowAuthorization = {
  id: string;
  product_id: string;
  owner_id: string;
  borrower_id: string;
  borrower_identifier: string;
  reason: string | null;
  starts_at: Date;
  ends_at: Date;
  revoked_at: Date | null;
  created_at: Date;
};

export type MissingReport = {
  id: string;
  institution_id: string;
  product_id: string;
  reporter_id: string;
  category: ReportCategory;
  status: MissingReportStatus;
  description: string | null;
  last_known_location: string | null;
  occurred_at: Date | null;
  reported_at: Date;
  resolved_at: Date | null;
  resolution_notes: string | null;
  channel: string;
  handled_by_id: string | null;
};

export type FoundReport = {
  id: string;
  institution_id: string;
  product_id: string | null;
  token_scanned: string | null;
  reporter_id: string | null;
  finder_name: string | null;
  finder_contact: string | null;
  location: string | null;
  found_at: Date;
  description: string | null;
  status: FoundReportStatus;
  matched_missing_report_id: string | null;
  matched_at: Date | null;
  returned_at: Date | null;
  return_notes: string | null;
  custody_location: string | null;
  handled_by_id: string | null;
};

export type Checkpoint = {
  id: string;
  institution_id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type ScanEvent = {
  id: string;
  institution_id: string;
  checkpoint_id: string | null;
  product_id: string | null;
  token_scanned: string;
  scanned_by_id: string;
  result: ScanResult;
  source: ScanSource;
  carrier_id: string | null;
  carrier_name: string | null;
  carrier_id_shown: boolean;
  note: string | null;
  duration_ms: number | null;
  scanned_at: Date;
  recorded_at: Date;
  sync_batch_id: string | null;
};

export type Notification = {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string;
  link: string | null;
  sent_at: Date | null;
  read_at: Date | null;
  created_at: Date;
};

export type AuditLog = {
  id: string;
  institution_id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  justification: string | null;
  metadata: unknown;
  ip: string | null;
  user_agent: string | null;
  created_at: Date;
};

export type ConsentRecord = {
  id: string;
  user_id: string;
  type: ConsentType;
  version: string;
  accepted: boolean;
  ip: string | null;
  user_agent: string | null;
  created_at: Date;
};

export type BaselineMetric = {
  id: string;
  institution_id: string;
  period_start: Date;
  period_end: Date;
  incidents_reported: number;
  incidents_recovered: number;
  median_recovery_hours: number | null;
  source: string;
  notes: string | null;
  created_at: Date;
};

export type SessionUser = {
  sessionId: string;
  user: SafeUser;
  institution: Institution;
  role: Role;
  /**
   * Platform-level authority, independent of the institution role. Almost
   * everyone is 'NONE'; a PLATFORM_ADMIN can administer every tenant from
   * /platform, a COUNTRY_ADMIN can measure every tenant in one country and
   * open none of them. Deliberately a separate axis: granting someone control
   * of one university must never quietly grant them control of all of them.
   */
  platformRole: PlatformRole;
  /** The country a COUNTRY_ADMIN is scoped to; null for everyone else. */
  platformCountry: string | null;
  profile: StudentProfile | null;
};
