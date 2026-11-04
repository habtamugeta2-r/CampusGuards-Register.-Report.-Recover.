import { z } from 'zod';
import { PRODUCT_TYPES } from './constants';

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: emailSchema,
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
  studentId: z.string().trim().min(3, 'Enter the ID number your organisation gave you.').max(40),
  department: z.string().trim().max(80).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  consents: z.array(z.string()).default([]),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const productSchema = z.object({
  type: z.enum(PRODUCT_TYPES as [string, ...string[]]),
  brand: z.string().trim().min(1, 'Brand is required.').max(60),
  model: z.string().trim().min(1, 'Model is required.').max(80),
  serialNumber: z.string().trim().max(80).optional().or(z.literal('')),
  color: z.string().trim().max(40).optional().or(z.literal('')),
  distinguishingMarks: z.string().trim().max(300).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export const missingReportSchema = z.object({
  productId: z.string().min(1),
  category: z.enum(['LOST', 'STOLEN', 'MISPLACED', 'CONFISCATED']),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  lastKnownLocation: z.string().trim().max(160).optional().or(z.literal('')),
  occurredAt: z.string().datetime().optional().or(z.literal('')),
  channel: z.string().max(40).optional(),
});

export const foundReportSchema = z.object({
  token: z.string().trim().max(120).optional().or(z.literal('')),
  location: z.string().trim().min(2, 'Where did you find it?').max(160),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  finderName: z.string().trim().max(120).optional().or(z.literal('')),
  finderContact: z.string().trim().max(120).optional().or(z.literal('')),
  foundAt: z.string().datetime().optional().or(z.literal('')),
});

export const borrowSchema = z.object({
  productId: z.string().min(1),
  borrowerIdentifier: z.string().trim().min(3, 'Enter the borrower’s ID or email.').max(160),
  endsAt: z.string().min(1, 'Choose an end date.'),
  reason: z.string().trim().max(240).optional().or(z.literal('')),
});

export const scanSchema = z.object({
  token: z.string().trim().min(1, 'Scan or enter a code.').max(200),
  checkpointId: z.string().trim().max(64).optional().or(z.literal('')),
  carrierIdentifier: z.string().trim().max(160).optional().or(z.literal('')),
  carrierIdShown: z.boolean().optional(),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  durationMs: z.number().int().min(0).max(600_000).optional(),
  /** When the officer's device resolved the scan from its offline cache. */
  offline: z.boolean().optional(),
  scannedAt: z.string().datetime().optional().or(z.literal('')),
});

export const offlineSyncSchema = z.object({
  batchId: z.string().trim().min(1).max(64),
  checkpointId: z.string().trim().max(64).optional().or(z.literal('')),
  scans: z
    .array(
      z.object({
        clientId: z.string().trim().max(64).optional().or(z.literal('')),
        token: z.string().trim().min(1).max(200),
        scannedAt: z.string().datetime().optional().or(z.literal('')),
        carrierIdentifier: z.string().trim().max(160).optional().or(z.literal('')),
        carrierIdShown: z.boolean().optional(),
        note: z.string().trim().max(500).optional().or(z.literal('')),
        durationMs: z.number().int().min(0).max(600_000).optional(),
        cachedResult: z.string().max(40).optional().or(z.literal('')),
      }),
    )
    .max(500),
});

export const checkpointSchema = z.object({
  name: z.string().trim().min(2).max(80),
  location: z.string().trim().max(160).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export const reportResolutionSchema = z.object({
  status: z.enum(['RESOLVED_RECOVERED', 'CLOSED_UNFOUND', 'WITHDRAWN', 'FALSE_REPORT']),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const userRoleSchema = z.object({
  role: z.enum(['STUDENT', 'SECURITY', 'ADMIN']),
});

export const userStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING']),
});

export const institutionSettingsSchema = z.object({
  scanRetentionDays: z.number().int().min(7).max(1095).optional(),
  reportRetentionDays: z.number().int().min(30).max(3650).optional(),
  auditRetentionDays: z.number().int().min(90).max(3650).optional(),
  requireScanJustification: z.boolean().optional(),
  allowAggregateAnalytics: z.boolean().optional(),
});
