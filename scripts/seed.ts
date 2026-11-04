import './env';
import { query, queryOne } from '../src/lib/db';
import { id } from '../src/lib/ids';
import { hashPassword } from '../src/lib/password';
import { generateQrToken } from '../src/lib/tokens';
import { logAudit } from '../src/lib/audit';
import { createAuthorization } from '../src/lib/repos/borrow';
import { recordScan } from '../src/lib/repos/scans';
import type { ProductType, ScanResult } from '../src/lib/types';

const DEMO_PASSWORD = 'Demo#2026';

const STUDENTS = [
  { name: 'Abel Tesfaye', email: 'abel@aastu.edu.et', studentId: 'UGR/4821/15', department: 'Software Engineering', year: 3 },
  { name: 'Hana Girma', email: 'hana@aastu.edu.et', studentId: 'UGR/5190/15', department: 'Electrical Engineering', year: 2 },
  { name: 'Dawit Haile', email: 'dawit@aastu.edu.et', studentId: 'UGR/4477/15', department: 'Software Engineering', year: 3 },
  { name: 'Mekdes Alemu', email: 'mekdes@aastu.edu.et', studentId: 'UGR/6012/16', department: 'Architecture', year: 2 },
  { name: 'Yonas Bekele', email: 'yonas@aastu.edu.et', studentId: 'UGR/3904/14', department: 'Mechanical Engineering', year: 4 },
  { name: 'Sara Mohammed', email: 'sara@aastu.edu.et', studentId: 'UGR/5580/15', department: 'Chemical Engineering', year: 3 },
  { name: 'Robel Tadesse', email: 'robel@aastu.edu.et', studentId: 'UGR/4711/15', department: 'Civil Engineering', year: 3 },
  { name: 'Liya Solomon', email: 'liya@aastu.edu.et', studentId: 'UGR/6220/16', department: 'Computer Science', year: 2 },
];

const PRODUCTS: Array<{ owner: string; type: ProductType; brand: string; model: string; serial: string; color: string; marks?: string }> = [
  { owner: 'abel@aastu.edu.et', type: 'LAPTOP', brand: 'Lenovo', model: 'ThinkPad E14', serial: 'PF3K9X21', color: 'Black', marks: 'Small scratch on top-left corner' },
  { owner: 'abel@aastu.edu.et', type: 'PHONE', brand: 'Samsung', model: 'Galaxy A15', serial: 'R58T70QZ', color: 'Blue' },
  { owner: 'hana@aastu.edu.et', type: 'LAPTOP', brand: 'HP', model: 'Pavilion 14', serial: '5CD9182KLM', color: 'Silver', marks: 'Sticker of Bascilica on lid' },
  { owner: 'hana@aastu.edu.et', type: 'TABLET', brand: 'Apple', model: 'iPad 9', serial: 'DMPX4LLQJ1', color: 'Space grey' },
  { owner: 'dawit@aastu.edu.et', type: 'LAPTOP', brand: 'Dell', model: 'Latitude 5420', serial: 'JX8V2Z3', color: 'Black' },
  { owner: 'dawit@aastu.edu.et', type: 'CAMERA', brand: 'Canon', model: 'EOS M50', serial: 'CANM50-88213', color: 'Black' },
  { owner: 'mekdes@aastu.edu.et', type: 'LAPTOP', brand: 'Apple', model: 'MacBook Air M1', serial: 'C02XK1YZLVDQ', color: 'Gold' },
  { owner: 'yonas@aastu.edu.et', type: 'PHONE', brand: 'Tecno', model: 'Spark 20', serial: 'TEC20-4471', color: 'Black' },
  { owner: 'yonas@aastu.edu.et', type: 'MONITOR', brand: 'LG', model: '24MP60', serial: 'LG24-00912', color: 'Black' },
  { owner: 'sara@aastu.edu.et', type: 'LAPTOP', brand: 'Asus', model: 'VivoBook 15', serial: 'M1N2O3P4', color: 'Grey' },
  { owner: 'robel@aastu.edu.et', type: 'PHONE', brand: 'Infinix', model: 'Hot 30', serial: 'INF30-7712', color: 'Green' },
  { owner: 'robel@aastu.edu.et', type: 'WATCH', brand: 'Amazfit', model: 'Bip 5', serial: 'AMZ5-1204', color: 'Black' },
];

function daysAgo(days: number, hour = 12, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function main() {
  console.log('Seeding CampusGuard demo data…');

  const existing = await queryOne<{ id: string }>("SELECT id FROM institutions WHERE code = 'AASTU'");
  if (existing) {
    console.log('Demo institution already exists. Run `npm run db:reset` first to rebuild from scratch.');
    process.exit(0);
  }

  const institutionId = id.institution();
  await query(
    `INSERT INTO institutions (id, name, code, email_domain, city, country)
     VALUES ($1,'Addis Ababa Science and Technology University','AASTU','aastu.edu.et','Addis Ababa','Ethiopia')`,
    [institutionId],
  );

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // --- Staff ---------------------------------------------------------------
  const adminId = id.user();
  await query(
    `INSERT INTO users (id, institution_id, email, password_hash, full_name, role, status, last_login_at)
     VALUES ($1,$2,'admin@aastu.edu.et',$3,'Ato Getachew Wolde','ADMIN','ACTIVE', now())`,
    [adminId, institutionId, passwordHash],
  );

  const officerId = id.user();
  await query(
    `INSERT INTO users (id, institution_id, email, password_hash, full_name, role, status, last_login_at)
     VALUES ($1,$2,'officer@aastu.edu.et',$3,'W/ro Tigist Assefa','SECURITY','ACTIVE', now())`,
    [officerId, institutionId, passwordHash],
  );

  const officer2Id = id.user();
  await query(
    `INSERT INTO users (id, institution_id, email, password_hash, full_name, role, status)
     VALUES ($1,$2,'officer2@aastu.edu.et',$3,'Ato Berhanu Kidane','SECURITY','ACTIVE')`,
    [officer2Id, institutionId, passwordHash],
  );

  // --- Students ------------------------------------------------------------
  const userIds = new Map<string, string>();
  for (const student of STUDENTS) {
    const userId = id.user();
    await query(
      `INSERT INTO users (id, institution_id, email, password_hash, full_name, role, status, last_login_at)
       VALUES ($1,$2,$3,$4,$5,'STUDENT','ACTIVE', now())`,
      [userId, institutionId, student.email, passwordHash, student.name],
    );
    await query(
      `INSERT INTO student_profiles (id, user_id, student_id, department, year_of_study)
       VALUES ($1,$2,$3,$4,$5)`,
      [id.profile(), userId, student.studentId, student.department, student.year],
    );
    userIds.set(student.email, userId);
  }

  // --- Checkpoints ---------------------------------------------------------
  const checkpoints: Array<{ id: string; name: string; location: string }> = [
    { id: id.checkpoint(), name: 'Main Library — exit', location: 'Ground floor, north doors' },
    { id: id.checkpoint(), name: 'Main Gate', location: 'Campus entrance, Bole Road' },
    { id: id.checkpoint(), name: 'Engineering Building — lab corridor', location: 'Block C, level 2' },
  ];
  for (const checkpoint of checkpoints) {
    await query(
      `INSERT INTO checkpoints (id, institution_id, name, location) VALUES ($1,$2,$3,$4)`,
      [checkpoint.id, institutionId, checkpoint.name, checkpoint.location],
    );
  }

  // --- Products ------------------------------------------------------------
  const productIds = new Map<string, string>();
  for (const product of PRODUCTS) {
    const productId = id.product();
    const ownerId = userIds.get(product.owner)!;
    const token = generateQrToken();

    await query(
      `INSERT INTO products (id, institution_id, owner_id, type, brand, model, serial_number, color, distinguishing_marks, registered_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        productId,
        institutionId,
        ownerId,
        product.type,
        product.brand,
        product.model,
        product.serial,
        product.color,
        product.marks ?? null,
        daysAgo(10 + Math.floor(Math.random() * 40)),
      ],
    );
    await query(
      `INSERT INTO product_identifiers (id, product_id, kind, value, is_primary, created_at)
       VALUES ($1,$2,'QR_TOKEN',$3,true,$4)`,
      [id.identifier(), productId, token, daysAgo(10)],
    );
    await query(
      `INSERT INTO product_identifiers (id, product_id, kind, value, is_primary) VALUES ($1,$2,'SERIAL',$3,false)`,
      [id.identifier(), productId, product.serial],
    );
    await query(`INSERT INTO ownerships (id, product_id, owner_id) VALUES ($1,$2,$3)`, [
      id.ownership(),
      productId,
      ownerId,
    ]);
    productIds.set(`${product.owner}:${product.brand} ${product.model}`, productId);
  }

  // --- Borrowing authorisation (Dawit carries Abel's laptop for an evening) --
  await createAuthorization({
    productId: productIds.get('abel@aastu.edu.et:Lenovo ThinkPad E14')!,
    ownerId: userIds.get('abel@aastu.edu.et')!,
    borrowerId: userIds.get('dawit@aastu.edu.et')!,
    borrowerIdentifier: 'UGR/4477/15',
    endsAt: new Date(Date.now() + 48 * 3_600_000),
    reason: 'Group project presentation',
  });

  // --- Reports -------------------------------------------------------------
  // 1. Abel's laptop is currently reported missing (the flagship scenario).
  const abelLaptopId = productIds.get('abel@aastu.edu.et:Lenovo ThinkPad E14')!;
  const abelId = userIds.get('abel@aastu.edu.et')!;

  const missingRows = await query<{ id: string }>(
    `INSERT INTO missing_reports (id, institution_id, product_id, reporter_id, category, description, last_known_location, occurred_at, reported_at, status, channel)
     VALUES ($1,$2,$3,$4,'STOLEN','Left on the desk for three minutes while I went to the washroom. Nobody nearby saw anything.','Main Library, second floor, desk 14',$5,$6,'OPEN','CAMPUSGUARD')
     RETURNING id`,
    [id.missingReport(), institutionId, abelLaptopId, abelId, daysAgo(2, 15, 40), daysAgo(2, 16, 10)],
  );
  await query(`UPDATE products SET status = 'REPORTED_MISSING' WHERE id = $1`, [abelLaptopId]);
  const missingReportId = missingRows[0]!.id;

  // 2. A resolved case from last month (feeds the recovery-rate metric).
  const hanaTabletId = productIds.get('hana@aastu.edu.et:Apple iPad 9')!;
  const hanaId = userIds.get('hana@aastu.edu.et')!;
  await query(
    `INSERT INTO missing_reports (id, institution_id, product_id, reporter_id, category, description, last_known_location, occurred_at, reported_at, resolved_at, status, resolution_notes, channel)
     VALUES ($1,$2,$3,$4,'LOST','Fell out of my bag somewhere between the cafeteria and Block C.','Cafeteria to Engineering Building path',$5,$6,$7,'RESOLVED_RECOVERED','Handed in to the library front desk by a student who scanned the label.','CAMPUSGUARD')`,
    [
      id.missingReport(),
      institutionId,
      hanaTabletId,
      hanaId,
      daysAgo(28, 10, 0),
      daysAgo(28, 11, 30),
      daysAgo(27, 9, 15),
    ],
  );
  await query(`UPDATE products SET status = 'RECOVERED' WHERE id = $1`, [hanaTabletId]);

  // 3. Reports that were never recovered (the honest half of the scoreboard).
  const lostCases: Array<[string, string, string, number, number]> = [
    ['yonas@aastu.edu.et:Tecno Spark 20', 'STOLEN', 'Sports field', 21, 18],
    ['robel@aastu.edu.et:Infinix Hot 30', 'LOST', 'Dormitory B common room', 45, 30],
    ['sara@aastu.edu.et:Asus VivoBook 15', 'MISPLACED', 'Chemistry lab 3', 12, 5],
  ];
  for (const [key, category, location, reportedDays, resolutionDays] of lostCases) {
    const productId = productIds.get(key)!;
    const ownerId = userIds.get(key.split(':')[0])!;
    await query(
      `INSERT INTO missing_reports (id, institution_id, product_id, reporter_id, category, description, last_known_location, occurred_at, reported_at, resolved_at, status, resolution_notes, channel)
       VALUES ($1,$2,$3,$4,$5,'Reported through CampusGuard.',$6,$7,$8,$9,'CLOSED_UNFOUND','Not recovered. No scans recorded at any checkpoint after the report.',$10)`,
      [
        id.missingReport(),
        institutionId,
        productId,
        ownerId,
        category,
        location,
        daysAgo(reportedDays + 1, 9, 0),
        daysAgo(reportedDays, 8, 30),
        daysAgo(reportedDays - resolutionDays, 17, 0),
        'CAMPUSGUARD',
      ],
    );
    await query(`UPDATE products SET status = 'ACTIVE' WHERE id = $1`, [productId]);
  }

  // 4. A found device waiting at the desk, already matched to Abel's report.
  await query(
    `INSERT INTO found_reports (id, institution_id, product_id, token_scanned, finder_name, finder_contact, location, found_at, description, status, matched_missing_report_id, matched_at, custody_location)
     VALUES ($1,$2,$3,$4,'W/ro Tigist Assefa','officer@aastu.edu.et','Main Library, second floor, near the lifts',$5,'Left on a study desk overnight. Handed in by a cleaner.','MATCHED',$6,now(),'Library front desk, locked cabinet')`,
    [
      id.foundReport(),
      institutionId,
      abelLaptopId,
      (
        await queryOne<{ value: string }>(
          `SELECT value FROM product_identifiers WHERE product_id = $1 AND kind = 'QR_TOKEN' LIMIT 1`,
          [abelLaptopId],
        )
      )!.value,
      daysAgo(1, 8, 20),
      missingReportId,
    ],
  );

  // 5. An unregistered item handed in (shows the system handles them too).
  await query(
    `INSERT INTO found_reports (id, institution_id, finder_name, finder_contact, location, found_at, description, status, custody_location)
     VALUES ($1,$2,'A security guard','—','Cafeteria, table 6',$3,'Black power bank, no label.','PENDING','Main gate security office')`,
    [id.foundReport(), institutionId, daysAgo(4, 13, 0)],
  );

  // --- Scan history --------------------------------------------------------
  const tokens = (
    await query<{ value: string; product_id: string }>(
      `SELECT pi.value, pi.product_id FROM product_identifiers pi
         JOIN products p ON p.id = pi.product_id
        WHERE p.institution_id = $1 AND pi.kind = 'QR_TOKEN'`,
      [institutionId],
    )
  ).map((row) => ({ token: row.value, productId: row.product_id }));

  const distribution: Array<[ScanResult, number]> = [
    ['REGISTERED_OK', 0.72],
    ['NOT_REGISTERED', 0.12],
    ['AUTHORIZED_BORROWER', 0.06],
    ['MISMATCH', 0.07],
    ['ACTIVE_MISSING_REPORT', 0.03],
  ];

  let scanCount = 0;
  for (let day = 21; day >= 0; day--) {
    // Fewer scans at weekends; a busy corridor is busiest late afternoon.
    const date = daysAgo(day);
    if (date.getDay() === 0) continue;
    const perDay = 4 + Math.floor(Math.random() * 9);

    for (let i = 0; i < perDay; i++) {
      const roll = Math.random();
      let cumulative = 0;
      let result: ScanResult = 'REGISTERED_OK';
      for (const [candidate, weight] of distribution) {
        cumulative += weight;
        if (roll <= cumulative) {
          result = candidate;
          break;
        }
      }

      const entry = result === 'NOT_REGISTERED' ? null : tokens[Math.floor(Math.random() * tokens.length)]!;
      const checkpoint = checkpoints[Math.floor(Math.random() * checkpoints.length)]!;
      const officer = Math.random() > 0.4 ? officerId : officer2Id;
      const offline = Math.random() < 0.14;

      const scannedAt = new Date(date);
      scannedAt.setHours(8 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60), 0, 0);

      await recordScan({
        institutionId,
        checkpointId: checkpoint.id,
        productId: entry?.productId ?? null,
        token: entry?.token ?? `CG-UNKNOWN${Math.floor(Math.random() * 9000 + 1000)}`,
        scannedById: officer,
        result,
        source: offline ? 'OFFLINE_CACHE' : 'LIVE',
        carrierId: result === 'MISMATCH' || result === 'REGISTERED_OK' ? entry?.productId ? undefined : undefined : undefined,
        carrierIdShown: Math.random() < 0.45,
        durationMs: 7000 + Math.floor(Math.random() * 16000),
        scannedAt,
      });
      scanCount += 1;
    }
  }

  // --- Baseline (pre-pilot, from the university's own logbooks) ------------
  await query(
    `INSERT INTO baseline_metrics (id, institution_id, period_start, period_end, incidents_reported, incidents_recovered, median_recovery_hours, source, notes)
     VALUES ($1,$2,$3,$4,64,17,96.0,'AASTU Security Directorate incident logbook (Semester 1)','Baseline measured from paper logbooks before the pilot. Recovery = device returned to a verified owner.')`,
    [id.baseline(), institutionId, daysAgo(210), daysAgo(120)],
  );

  // --- Notifications -------------------------------------------------------
  await query(
    `INSERT INTO notifications (id, user_id, channel, type, title, body, link, sent_at, created_at)
     VALUES
       ($1,$2,'IN_APP','welcome','Welcome to CampusGuard','Your account is active. Register a device to print its QR label.','/student/products', now(), now()),
       ($3,$4,'IN_APP','report.missing.acknowledged','Your report is filed','We marked your Lenovo ThinkPad E14 as reported missing and notified campus security.','/student/reports', now(), now()),
       ($5,$6,'IN_APP','report.found.created','A device was handed in','A Lenovo ThinkPad E14 was handed in near the Main Library, second floor.','/admin/found', now(), now())`,
    [id.notification(), abelId, id.notification(), abelId, id.notification(), adminId],
  );

  // --- Audit trail ---------------------------------------------------------
  await logAudit({
    institutionId,
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'institution.created',
    entityType: 'institution',
    entityId: institutionId,
    metadata: { seed: true },
  });
  for (const student of STUDENTS) {
    await logAudit({
      institutionId,
      actorId: userIds.get(student.email)!,
      actorRole: 'STUDENT',
      action: 'auth.register',
      entityType: 'user',
      entityId: userIds.get(student.email)!,
      metadata: { seed: true },
    });
  }

  console.log(`
Seed complete.

  Institution : Addis Ababa Science and Technology University (AASTU)
  Students    : ${STUDENTS.length}
  Devices     : ${PRODUCTS.length}
  Checkpoints : ${checkpoints.length}
  Scan events : ${scanCount}

  Sign in with password: ${DEMO_PASSWORD}
    student  abel@aastu.edu.et     (has a device reported missing)
    officer  officer@aastu.edu.et  (checkpoint scanning)
    admin    admin@aastu.edu.et    (dashboard, reports, audit log)
`);

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
