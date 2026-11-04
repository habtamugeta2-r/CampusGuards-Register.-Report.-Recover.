import { normalizeToken } from '../tokens';
import { findProductByToken } from '../repos/products';
import { findOpenMissingByProduct } from '../repos/reports';
import { hasActiveAuthorization, resolveBorrower } from '../repos/borrow';
import { recordScan } from '../repos/scans';
import { listAdminIds, listSecurityOfficerIds } from '../repos/users';
import { notify, notifyMany } from '../notifications';
import { logAudit } from '../audit';
import { resolveVerification, type VerificationOutcome } from '../verify';
import { maskSerial } from '../qr';
import { SCAN_RESULT_META } from '../constants';
import type { ScanEvent, ScanSource } from '../types';

export type VerifyScanInput = {
  institutionId: string;
  institutionName: string;
  officerId: string;
  officerName: string;
  rawToken: string;
  checkpointId?: string | null;
  checkpointName?: string | null;
  carrierIdentifier?: string | null;
  carrierIdShown?: boolean;
  note?: string | null;
  durationMs?: number | null;
  source?: ScanSource;
  scannedAt?: Date | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type VerifyScanResult = VerificationOutcome & {
  scanId: string;
  token: string;
  product: {
    id: string;
    label: string;
    type: string;
    brand: string;
    model: string;
    color: string | null;
    status: string;
    serialLast4: string | null;
    registeredAt: Date;
  } | null;
  owner: { name: string; studentId: string | null } | null;
  missingReport: { id: string; category: string; reportedAt: Date; lastKnownLocation: string | null } | null;
  checkpoint: string | null;
  officer: string;
  scannedAt: Date;
};

/**
 * The checkpoint verification workflow: resolve a scanned code, decide what the
 * officer sees, record the scan, and trigger notifications.
 *
 * Shared by the live scanner, the manual-entry fallback and the offline sync
 * endpoint so that all three paths behave identically.
 */
export async function verifyAndRecord(input: VerifyScanInput): Promise<VerifyScanResult> {
  const token = normalizeToken(input.rawToken);
  if (!token) {
    const error = new Error('That is not a CampusGuard code. Check the label or enter the code by hand.');
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const startedAt = Date.now();
  const product = await findProductByToken(token);

  // Carrier identity is only established when the officer actually checks an ID.
  let carrierId: string | null = null;
  let carrierName: string | null = null;
  if (input.carrierIdentifier && input.carrierIdShown) {
    const carrier = await resolveBorrower(input.institutionId, input.carrierIdentifier);
    if (carrier) {
      carrierId = carrier.id;
      carrierName = carrier.full_name;
    }
  }

  const missingReport = product
    ? await findOpenMissingByProduct(product.id)
    : null;

  const borrowerAuthorized =
    product && carrierId && carrierId !== product.owner_id
      ? await hasActiveAuthorization(product.id, carrierId)
      : false;

  const outcome = resolveVerification({
    productFound: Boolean(product),
    retired: product?.status === 'RETIRED',
    status: product?.status ?? 'ACTIVE',
    ownerId: product?.owner_id ?? null,
    ownerName: product?.owner_name ?? null,
    productLabel: product ? `${product.type} ${product.brand} ${product.model}` : null,
    hasActiveMissingReport: Boolean(missingReport),
    carrierUserId: carrierId,
    borrowerAuthorized,
  });

  const scan: ScanEvent = await recordScan({
    institutionId: input.institutionId,
    checkpointId: input.checkpointId ?? null,
    productId: product?.id ?? null,
    token,
    scannedById: input.officerId,
    result: outcome.result,
    source: input.source ?? (input.carrierIdentifier ? 'MANUAL_ENTRY' : 'LIVE'),
    carrierId,
    carrierName,
    carrierIdShown: Boolean(input.carrierIdShown),
    note: input.note ?? null,
    durationMs: input.durationMs ?? Date.now() - startedAt,
    scannedAt: input.scannedAt ?? null,
  });

  await logAudit({
    institutionId: input.institutionId,
    actorId: input.officerId,
    actorRole: 'SECURITY',
    action: 'scan.verify',
    entityType: 'product',
    entityId: product?.id ?? null,
    metadata: {
      token,
      result: outcome.result,
      checkpoint: input.checkpointName ?? null,
      carrierRecorded: Boolean(carrierId),
      source: scan.source,
    },
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
  });

  // A hit on an open missing report is the one case where an officer needs
  // immediate institutional backup — and the owner needs to know their device
  // has been seen.
  if (outcome.result === 'ACTIVE_MISSING_REPORT' && product && missingReport) {
    await notify({
      userId: product.owner_id,
      type: 'scan.missing_hit',
      title: 'Your reported device was scanned',
      body: `Your ${product.type.toLowerCase()} ${product.brand} ${product.model} was scanned at ${
        input.checkpointName ?? 'a checkpoint'
      }. Campus security has been notified and will follow up.`,
      link: '/student/reports',
    });
    await notifyMany(await listAdminIds(input.institutionId), {
      type: 'scan.missing_hit',
      title: `Missing device scanned at ${input.checkpointName ?? 'checkpoint'}`,
      body: `${product.owner_name}'s ${product.brand} ${product.model} (reported ${missingReport.category.toLowerCase()}) was scanned by ${input.officerName}.`,
      link: '/admin/reports',
    });
  }

  return {
    ...outcome,
    scanId: scan.id,
    token,
    product: product
      ? {
          id: product.id,
          label: `${product.type} ${product.brand} ${product.model}`,
          type: product.type,
          brand: product.brand,
          model: product.model,
          color: product.color,
          status: product.status,
          serialLast4: maskSerial(product.serial_number),
          registeredAt: product.registered_at,
        }
      : null,
    owner: product ? { name: product.owner_name, studentId: product.owner_student_id } : null,
    missingReport: missingReport
      ? {
          id: missingReport.id,
          category: missingReport.category,
          reportedAt: missingReport.reported_at,
          lastKnownLocation: missingReport.last_known_location,
        }
      : null,
    checkpoint: input.checkpointName ?? null,
    officer: input.officerName,
    scannedAt: scan.recorded_at,
  };
}

export { SCAN_RESULT_META };
