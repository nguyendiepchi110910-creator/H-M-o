import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createServer as createViteServer } from 'vite';

type RegistrationStatus =
  | 'Chờ thanh toán'
  | 'Chờ xác nhận'
  | 'Đã thanh toán'
  | 'Thanh toán không hợp lệ'
  | 'Đã hủy';

type PricingTier = 'early-bird' | 'original' | 'consult';
type AdminActionType = 'confirm_paid' | 'reject_proof' | 'request_info' | 'cancel';

interface DbRegistrationRow {
  id: string;
  code: string;
  fullname: string;
  phone: string;
  email: string;
  grade: string;
  course_id: string;
  course_label: string;
  price_quoted: number;
  pricing_tier: PricingTier;
  note: string;
  status: RegistrationStatus;
  payment_info: string;
  proof_filename: string;
  proof_mime: string;
  proof_submitted_at: string;
  admin_note: string;
  confirmed_at: string;
  confirmed_by: string;
  created_at: string;
  updated_at: string;
}

interface DbAuditLogRow {
  id: string;
  registration_id: string;
  registration_code: string;
  admin_account: string;
  action: string;
  from_status: string;
  to_status: string;
  detail: string;
  created_at: string;
}

interface PricingStatus {
  earlyBirdActive: boolean;
  confirmedCount: number;
  pendingConfirmationCount: number;
  limit: number;
  remainingSlots: number;
}

interface AdminSession {
  adminAccount: string;
  expiresAt: number;
}

const PORT = 3000;
const EARLY_BIRD_LIMIT = 50;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const PROOFS_DIR = path.join(DATA_DIR, 'proofs');
const DB_FILE = path.join(DATA_DIR, 'ticlabs.db');
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || 'ticlabs-admin-2026';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_PROOF_BYTES = 2 * 1024 * 1024;

const BANK_INFO = {
  bankName: process.env.BANK_NAME || 'Vietcombank (VCB)',
  accountNumber: process.env.BANK_ACCOUNT_NO || '1028394850',
  accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'TIC LABS EDUCATION',
};

const activeAdminTokens = new Map<string, AdminSession>();

const COURSE_PRICES: Record<string, { label: string; earlyBird: number; original: number }> = {
  simulation: {
    label: 'Khóa thí nghiệm/mô phỏng (Simulation)',
    earlyBird: 199000,
    original: 279000,
  },
  'topic-review': {
    label: 'Khóa tổng ôn chuyên đề (Topic Review)',
    earlyBird: 299000,
    original: 379000,
  },
  exam: {
    label: 'Khóa toàn diện (Exam)',
    earlyBird: 649000,
    original: 799000,
  },
  consult: {
    label: 'Muốn được tư vấn thêm',
    earlyBird: 0,
    original: 0,
  },
};

const ALLOWED_PROOF_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
};

function ensureStorageDirs(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROOFS_DIR)) {
    fs.mkdirSync(PROOFS_DIR, { recursive: true });
  }
}

function initDatabase(): DatabaseSync {
  ensureStorageDirs();
  const db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      fullname TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      grade TEXT NOT NULL DEFAULT '',
      course_id TEXT NOT NULL,
      course_label TEXT NOT NULL,
      price_quoted INTEGER NOT NULL,
      pricing_tier TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      payment_info TEXT NOT NULL DEFAULT '',
      proof_filename TEXT NOT NULL DEFAULT '',
      proof_mime TEXT NOT NULL DEFAULT '',
      proof_submitted_at TEXT NOT NULL DEFAULT '',
      admin_note TEXT NOT NULL DEFAULT '',
      confirmed_at TEXT NOT NULL DEFAULT '',
      confirmed_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL,
      registration_code TEXT NOT NULL,
      admin_account TEXT NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

const db = initDatabase();

function formatNowVi(): string {
  return new Date().toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function mapRegistrationRow(row: DbRegistrationRow) {
  return {
    id: row.id,
    code: row.code,
    fullname: row.fullname,
    phone: row.phone,
    email: row.email,
    grade: row.grade,
    courseId: row.course_id,
    courseLabel: row.course_label,
    priceQuoted: row.price_quoted,
    pricingTier: row.pricing_tier,
    note: row.note,
    status: row.status,
    paymentInfo: row.payment_info,
    hasProof: Boolean(row.proof_filename),
    proofSubmittedAt: row.proof_submitted_at,
    adminNote: row.admin_note,
    confirmedAt: row.confirmed_at,
    confirmedBy: row.confirmed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPublicRegistrationSummary(row: DbRegistrationRow) {
  return {
    code: row.code,
    fullname: row.fullname,
    courseId: row.course_id,
    courseLabel: row.course_label,
    priceQuoted: row.price_quoted,
    pricingTier: row.pricing_tier,
    status: row.status,
    paymentInfo: row.payment_info,
    hasProof: Boolean(row.proof_filename),
    proofSubmittedAt: row.proof_submitted_at,
    adminNote: row.admin_note,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
  };
}

function mapAuditRow(row: DbAuditLogRow) {
  return {
    id: row.id,
    registrationId: row.registration_id,
    registrationCode: row.registration_code,
    adminAccount: row.admin_account,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

function getPricingStatusFromDb(): PricingStatus {
  const confirmedRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM registrations WHERE status = 'Đã thanh toán' AND pricing_tier = 'early-bird'`,
    )
    .get() as { cnt: number };
  const pendingRow = db
    .prepare(`SELECT COUNT(*) AS cnt FROM registrations WHERE status = 'Chờ xác nhận'`)
    .get() as { cnt: number };

  const confirmedCount = Number(confirmedRow?.cnt ?? 0);
  const pendingConfirmationCount = Number(pendingRow?.cnt ?? 0);
  const remainingSlots = Math.max(0, EARLY_BIRD_LIMIT - confirmedCount);
  return {
    earlyBirdActive: confirmedCount < EARLY_BIRD_LIMIT,
    confirmedCount,
    pendingConfirmationCount,
    limit: EARLY_BIRD_LIMIT,
    remainingSlots,
  };
}

function getNextRegistrationCode(): string {
  const rows = db.prepare(`SELECT code FROM registrations`).all() as Array<{ code: string }>;
  let maxNum = 2600;
  for (const r of rows) {
    const match = /^TIC-(\d+)$/.exec(r.code);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  return `TIC-${maxNum + 1}`;
}

function normalizePhone(raw: string): string {
  const cleaned = String(raw || '').replace(/[\s.\-()]/g, '');
  return cleaned.startsWith('+84') ? '0' + cleaned.slice(3) : cleaned;
}

function safeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

interface AdminRequest extends Request {
  adminSession?: AdminSession;
}

function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const session = activeAdminTokens.get(token);
  if (!token || !session || session.expiresAt < Date.now()) {
    activeAdminTokens.delete(token);
    res.status(401).json({ error: 'Phiên đăng nhập quản trị đã hết hạn hoặc không hợp lệ.' });
    return;
  }
  req.adminSession = session;
  next();
}

function runInImmediateTransaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Ignore rollback error if not active
    }
    throw err;
  }
}

function removeProofFile(filename: string): void {
  if (!filename) return;
  const target = path.join(PROOFS_DIR, path.basename(filename));
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public Early Bird availability status + bank transfer coordinates (zero PII)
  app.get('/api/pricing-status', (_req, res) => {
    res.json({
      ...getPricingStatusFromDb(),
      bankInfo: BANK_INFO,
    });
  });

  // Public student registration submission (enforces server-side Early Bird 50-slot cap)
  app.post('/api/registrations', (req, res) => {
    const body = req.body ?? {};
    const fullname = String(body.fullname ?? '').trim();
    const phone = normalizePhone(String(body.phone ?? '').trim());
    const email = String(body.email ?? '').trim();
    const grade = String(body.grade ?? '').trim();
    const courseId = String(body.courseId ?? '').trim();
    const note = String(body.note ?? '').trim().slice(0, 500);

    if (fullname.length < 2) {
      res.status(400).json({ error: 'Vui lòng nhập họ và tên hợp lệ.' });
      return;
    }
    if (!/^0\d{8,10}$/.test(phone)) {
      res.status(400).json({ error: 'Số điện thoại không hợp lệ.' });
      return;
    }
    if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Email chưa đúng định dạng.' });
      return;
    }
    const courseMeta = COURSE_PRICES[courseId];
    if (!courseMeta) {
      res.status(400).json({ error: 'Khóa học được chọn không hợp lệ.' });
      return;
    }

    const result = runInImmediateTransaction(() => {
      const pricingStatus = getPricingStatusFromDb();
      let pricingTier: PricingTier = 'original';
      let priceQuoted = courseMeta.original;

      if (courseId === 'consult') {
        pricingTier = 'consult';
        priceQuoted = 0;
      } else if (pricingStatus.earlyBirdActive) {
        pricingTier = 'early-bird';
        priceQuoted = courseMeta.earlyBird;
      }

      const id = crypto.randomUUID();
      const code = getNextRegistrationCode();
      const now = formatNowVi();

      db.prepare(`
        INSERT INTO registrations (
          id, code, fullname, phone, email, grade, course_id, course_label,
          price_quoted, pricing_tier, note, status,
          payment_info, proof_filename, proof_mime, proof_submitted_at,
          admin_note, confirmed_at, confirmed_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        code,
        fullname.slice(0, 80),
        phone,
        email.slice(0, 120),
        grade.slice(0, 30),
        courseId,
        courseMeta.label,
        priceQuoted,
        pricingTier,
        note,
        'Chờ thanh toán',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        now,
        now,
      );

      const inserted = db
        .prepare(`SELECT * FROM registrations WHERE id = ?`)
        .get(id) as unknown as DbRegistrationRow;

      return {
        registration: mapPublicRegistrationSummary(inserted),
        pricingStatus: getPricingStatusFromDb(),
        bankInfo: BANK_INFO,
      };
    });

    res.status(201).json(result);
  });

  // Private status lookup for a student's own registration (requires matching code + phone)
  app.post('/api/registrations/status-check', (req, res) => {
    const code = String(req.body?.code ?? '').trim().toUpperCase();
    const phone = normalizePhone(String(req.body?.phone ?? '').trim());
    if (!code || !phone) {
      res.status(400).json({ error: 'Vui lòng nhập đầy đủ mã đăng ký và số điện thoại.' });
      return;
    }
    const row = db
      .prepare(`SELECT * FROM registrations WHERE UPPER(code) = ? AND phone = ?`)
      .get(code, phone) as unknown as DbRegistrationRow | undefined;

    if (!row) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ khớp với mã đăng ký và số điện thoại.' });
      return;
    }

    res.json({
      registration: mapPublicRegistrationSummary(row),
      pricingStatus: getPricingStatusFromDb(),
      bankInfo: BANK_INFO,
    });
  });

  // Student submits payment info / transfer proof image (NEVER allows setting status to 'Đã thanh toán')
  app.post('/api/registrations/:code/payment-proof', (req, res) => {
    const code = String(req.params.code ?? '').trim().toUpperCase();
    const phone = normalizePhone(String(req.body?.phone ?? '').trim());
    const paymentInfo = String(req.body?.paymentInfo ?? '').trim().slice(0, 300);
    const proofImageBase64 = String(req.body?.proofImageBase64 ?? '').trim();
    const proofMime = String(req.body?.proofMime ?? '').trim().toLowerCase();

    if (!code || !phone) {
      res.status(400).json({ error: 'Thiếu thông tin xác thực mã đăng ký và số điện thoại.' });
      return;
    }
    if (!paymentInfo && !proofImageBase64) {
      res.status(400).json({ error: 'Vui lòng nhập thông tin giao dịch hoặc tải lên ảnh minh chứng chuyển khoản.' });
      return;
    }

    let decodedBuffer: Buffer | null = null;
    let fileExt = '';
    if (proofImageBase64) {
      const ext = ALLOWED_PROOF_MIME[proofMime];
      if (!ext) {
        res.status(400).json({ error: 'Chỉ hỗ trợ ảnh minh chứng định dạng PNG, JPG hoặc WEBP.' });
        return;
      }
      const cleanBase64 = proofImageBase64.replace(/^data:[^;]+;base64,/, '');
      decodedBuffer = Buffer.from(cleanBase64, 'base64');
      if (decodedBuffer.length === 0 || decodedBuffer.length > MAX_PROOF_BYTES) {
        res.status(400).json({ error: 'Kích thước ảnh minh chứng không hợp lệ hoặc vượt quá 2MB.' });
        return;
      }
      fileExt = ext;
    }

    const row = db
      .prepare(`SELECT * FROM registrations WHERE UPPER(code) = ? AND phone = ?`)
      .get(code, phone) as unknown as DbRegistrationRow | undefined;

    if (!row) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ đăng ký hợp lệ.' });
      return;
    }

    if (row.status === 'Đã thanh toán') {
      res.status(409).json({ error: 'Hồ sơ này đã được Admin xác nhận thanh toán trước đó.' });
      return;
    }
    if (row.status === 'Đã hủy') {
      res.status(400).json({ error: 'Hồ sơ này đã bị hủy, không thể gửi minh chứng thanh toán.' });
      return;
    }

    const pricingStatusBefore = getPricingStatusFromDb();
    if (row.pricing_tier === 'early-bird' && !pricingStatusBefore.earlyBirdActive) {
      res.status(409).json({
        error: 'Early Bird đã hết đủ 50 suất thanh toán. Vui lòng tạo đăng ký mới theo giá gốc nếu muốn tiếp tục.',
      });
      return;
    }

    ensureStorageDirs();
    let savedFilename = row.proof_filename;
    let savedMime = row.proof_mime;
    if (decodedBuffer && fileExt) {
      if (row.proof_filename) {
        removeProofFile(row.proof_filename);
      }
      savedFilename = `${row.id}-${Date.now()}${fileExt}`;
      savedMime = proofMime;
      fs.writeFileSync(path.join(PROOFS_DIR, savedFilename), decodedBuffer);
    }

    const now = formatNowVi();
    db.prepare(`
      UPDATE registrations
      SET status = 'Chờ xác nhận',
          payment_info = ?,
          proof_filename = ?,
          proof_mime = ?,
          proof_submitted_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      paymentInfo || row.payment_info,
      savedFilename,
      savedMime,
      now,
      now,
      row.id,
    );

    const updated = db
      .prepare(`SELECT * FROM registrations WHERE id = ?`)
      .get(row.id) as unknown as DbRegistrationRow;

    res.json({
      registration: mapPublicRegistrationSummary(updated),
      pricingStatus: getPricingStatusFromDb(),
      bankInfo: BANK_INFO,
    });
  });

  // Admin authentication
  app.post('/api/admin/login', (req, res) => {
    const code = String(req.body?.accessCode ?? '').trim();
    const rawAccount = String(req.body?.adminAccount ?? '').trim().slice(0, 60);
    const adminAccount = rawAccount || 'Admin';
    if (!safeCompareStrings(code, ADMIN_ACCESS_CODE)) {
      res.status(401).json({ error: 'Mã truy cập quản trị chưa chính xác.' });
      return;
    }
    const token = crypto.randomBytes(24).toString('hex');
    activeAdminTokens.set(token, {
      adminAccount,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    res.json({ token, adminAccount });
  });

  app.post('/api/admin/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token) activeAdminTokens.delete(token);
    res.json({ ok: true });
  });

  // Admin: list registrations + audit logs + pricing status
  app.get('/api/admin/registrations', requireAdmin, (req: AdminRequest, res) => {
    const rows = db
      .prepare(`SELECT * FROM registrations ORDER BY rowid DESC`)
      .all() as unknown as DbRegistrationRow[];
    const logs = db
      .prepare(`SELECT * FROM audit_logs ORDER BY rowid DESC LIMIT 200`)
      .all() as unknown as DbAuditLogRow[];

    res.json({
      registrations: rows.map(mapRegistrationRow),
      auditLogs: logs.map(mapAuditRow),
      pricingStatus: getPricingStatusFromDb(),
      adminAccount: req.adminSession?.adminAccount ?? 'Admin',
    });
  });

  // Admin-only: view private transfer proof image
  app.get('/api/admin/registrations/:id/proof', requireAdmin, (req, res) => {
    const row = db
      .prepare(`SELECT proof_filename, proof_mime FROM registrations WHERE id = ?`)
      .get(req.params.id) as { proof_filename: string; proof_mime: string } | undefined;

    if (!row || !row.proof_filename) {
      res.status(404).json({ error: 'Hồ sơ chưa có ảnh minh chứng thanh toán.' });
      return;
    }

    const filePath = path.join(PROOFS_DIR, path.basename(row.proof_filename));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Không tìm thấy tệp ảnh minh chứng.' });
      return;
    }

    res.setHeader('Content-Type', row.proof_mime || 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(filePath);
  });

  // Admin: atomic payment verification & status actions with 50-slot lock and audit logging
  app.post('/api/admin/registrations/:id/action', requireAdmin, (req: AdminRequest, res) => {
    const id = String(req.params.id ?? '');
    const action = req.body?.action as AdminActionType;
    const adminNote = String(req.body?.adminNote ?? '').trim().slice(0, 300);
    const adminAccount = req.adminSession?.adminAccount ?? 'Admin';

    if (
      action !== 'confirm_paid' &&
      action !== 'reject_proof' &&
      action !== 'request_info' &&
      action !== 'cancel'
    ) {
      res.status(400).json({ error: 'Hành động quản trị không hợp lệ.' });
      return;
    }

    try {
      const outcome = runInImmediateTransaction(() => {
        const row = db
          .prepare(`SELECT * FROM registrations WHERE id = ?`)
          .get(id) as unknown as DbRegistrationRow | undefined;

        if (!row) {
          return { status: 404 as const, error: 'Không tìm thấy hồ sơ đăng ký.' };
        }

        const now = formatNowVi();
        let nextStatus: RegistrationStatus = row.status;
        let actionLabel = '';
        let confirmedAt = row.confirmed_at;
        let confirmedBy = row.confirmed_by;

        if (action === 'confirm_paid') {
          if (row.status === 'Đã thanh toán') {
            return {
              status: 409 as const,
              error: 'Hồ sơ này đã được xác nhận thanh toán trước đó (chống xác nhận trùng).',
            };
          }
          if (row.status === 'Đã hủy') {
            return {
              status: 400 as const,
              error: 'Không thể xác nhận thanh toán cho hồ sơ đã hủy.',
            };
          }
          if (row.pricing_tier === 'early-bird') {
            const countRow = db
              .prepare(
                `SELECT COUNT(*) AS cnt FROM registrations WHERE status = 'Đã thanh toán' AND pricing_tier = 'early-bird'`,
              )
              .get() as { cnt: number };
            if (Number(countRow?.cnt ?? 0) >= EARLY_BIRD_LIMIT) {
              return {
                status: 409 as const,
                error: `Đã đủ ${EARLY_BIRD_LIMIT}/${EARLY_BIRD_LIMIT} suất Early Bird được xác nhận thanh toán. Không thể xác nhận thêm suất Early Bird thứ 51.`,
              };
            }
          }
          nextStatus = 'Đã thanh toán';
          actionLabel = 'Xác nhận đã thanh toán';
          confirmedAt = now;
          confirmedBy = adminAccount;
        } else if (action === 'reject_proof') {
          nextStatus = 'Thanh toán không hợp lệ';
          actionLabel = 'Từ chối minh chứng thanh toán';
          confirmedAt = '';
          confirmedBy = '';
        } else if (action === 'request_info') {
          nextStatus = 'Chờ thanh toán';
          actionLabel = 'Đánh dấu chờ bổ sung thông tin';
          confirmedAt = '';
          confirmedBy = '';
        } else {
          nextStatus = 'Đã hủy';
          actionLabel = 'Hủy đăng ký';
          confirmedAt = '';
          confirmedBy = '';
        }

        db.prepare(`
          UPDATE registrations
          SET status = ?,
              admin_note = ?,
              confirmed_at = ?,
              confirmed_by = ?,
              updated_at = ?
          WHERE id = ?
        `).run(nextStatus, adminNote, confirmedAt, confirmedBy, now, row.id);

        db.prepare(`
          INSERT INTO audit_logs (
            id, registration_id, registration_code, admin_account,
            action, from_status, to_status, detail, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          row.id,
          row.code,
          adminAccount,
          actionLabel,
          row.status,
          nextStatus,
          adminNote,
          now,
        );

        const updated = db
          .prepare(`SELECT * FROM registrations WHERE id = ?`)
          .get(row.id) as unknown as DbRegistrationRow;
        const logs = db
          .prepare(`SELECT * FROM audit_logs ORDER BY rowid DESC LIMIT 200`)
          .all() as unknown as DbAuditLogRow[];

        return {
          status: 200 as const,
          registration: mapRegistrationRow(updated),
          auditLogs: logs.map(mapAuditRow),
          pricingStatus: getPricingStatusFromDb(),
        };
      });

      if (outcome.status !== 200) {
        res.status(outcome.status).json({ error: outcome.error });
        return;
      }

      res.json({
        registration: outcome.registration,
        auditLogs: outcome.auditLogs,
        pricingStatus: outcome.pricingStatus,
      });
    } catch {
      res.status(500).json({ error: 'Không thể cập nhật trạng thái hồ sơ.' });
    }
  });

  app.delete('/api/admin/registrations/:id', requireAdmin, (req: AdminRequest, res) => {
    const id = String(req.params.id ?? '');
    const adminAccount = req.adminSession?.adminAccount ?? 'Admin';

    const outcome = runInImmediateTransaction(() => {
      const row = db
        .prepare(`SELECT * FROM registrations WHERE id = ?`)
        .get(id) as unknown as DbRegistrationRow | undefined;

      if (!row) {
        return { found: false as const };
      }

      db.prepare(`DELETE FROM registrations WHERE id = ?`).run(id);
      db.prepare(`
        INSERT INTO audit_logs (
          id, registration_id, registration_code, admin_account,
          action, from_status, to_status, detail, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        row.id,
        row.code,
        adminAccount,
        'Xóa hồ sơ đăng ký',
        row.status,
        'Đã xóa',
        row.fullname,
        formatNowVi(),
      );

      removeProofFile(row.proof_filename);
      const logs = db
        .prepare(`SELECT * FROM audit_logs ORDER BY rowid DESC LIMIT 200`)
        .all() as unknown as DbAuditLogRow[];

      return {
        found: true as const,
        auditLogs: logs.map(mapAuditRow),
        pricingStatus: getPricingStatusFromDb(),
      };
    });

    if (!outcome.found) {
      res.status(404).json({ error: 'Không tìm thấy đăng ký.' });
      return;
    }

    res.json({
      ok: true,
      auditLogs: outcome.auditLogs,
      pricingStatus: outcome.pricingStatus,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TIC Labs server running at http://localhost:${PORT}`);
  });
}

startServer();
