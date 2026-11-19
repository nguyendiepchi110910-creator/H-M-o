export type RegistrationStatus =
  | 'Chờ thanh toán'
  | 'Chờ xác nhận'
  | 'Đã thanh toán'
  | 'Thanh toán không hợp lệ'
  | 'Đã hủy';

export const REGISTRATION_STATUSES: RegistrationStatus[] = [
  'Chờ thanh toán',
  'Chờ xác nhận',
  'Đã thanh toán',
  'Thanh toán không hợp lệ',
  'Đã hủy',
];

export type PricingTier = 'early-bird' | 'original' | 'consult';

export interface RegistrationRecord {
  id: string;
  code: string;
  fullname: string;
  phone: string;
  email: string;
  grade: string;
  courseId: string;
  courseLabel: string;
  priceQuoted: number;
  pricingTier: PricingTier;
  note: string;
  status: RegistrationStatus;
  paymentInfo: string;
  hasProof: boolean;
  proofSubmittedAt: string;
  adminNote: string;
  confirmedAt: string;
  confirmedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  registrationId: string;
  registrationCode: string;
  adminAccount: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  detail: string;
  createdAt: string;
}

export interface PublicRegistrationStatusSummary {
  code: string;
  fullname: string;
  courseId: string;
  courseLabel: string;
  priceQuoted: number;
  pricingTier: PricingTier;
  status: RegistrationStatus;
  paymentInfo: string;
  hasProof: boolean;
  proofSubmittedAt: string;
  adminNote: string;
  confirmedAt: string;
  createdAt: string;
}

export interface RegistrationInput {
  fullname: string;
  phone: string;
  email: string;
  grade: string;
  courseId: string;
  note: string;
  consent: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof RegistrationInput, string>>;
  normalizedPhone: string;
}

export function normalizeVietnamesePhone(raw: string): string {
  const cleaned = raw.replace(/[\s.\-()]/g, '');
  if (cleaned.startsWith('+84')) {
    return '0' + cleaned.slice(3);
  }
  return cleaned;
}

export function validateRegistrationInput(input: RegistrationInput): ValidationResult {
  const errors: Partial<Record<keyof RegistrationInput, string>> = {};
  const trimmedName = input.fullname.trim();
  const normalizedPhone = normalizeVietnamesePhone(input.phone.trim());
  const trimmedEmail = input.email.trim();

  if (trimmedName.length < 2) {
    errors.fullname = 'Vui lòng nhập họ và tên đầy đủ (tối thiểu 2 ký tự).';
  }

  if (!/^0\d{8,10}$/.test(normalizedPhone)) {
    errors.phone = 'Số điện thoại không hợp lệ (ví dụ: 0912345678).';
  }

  if (trimmedEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Địa chỉ email chưa đúng định dạng.';
  }

  if (!input.courseId) {
    errors.courseId = 'Vui lòng chọn khóa học bạn quan tâm.';
  }

  if (!input.consent) {
    errors.consent = 'Vui lòng xác nhận đồng ý để TIC Labs liên hệ tư vấn.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedPhone,
  };
}

export function filterRegistrations(
  rows: RegistrationRecord[],
  query: string,
  courseFilter: string,
  statusFilter: string = 'all',
): RegistrationRecord[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    if (!matchesStatus) return false;
    const matchesCourse = courseFilter === 'all' || row.courseId === courseFilter;
    if (!matchesCourse) return false;
    if (!q) return true;
    return (
      row.fullname.toLowerCase().includes(q) ||
      row.phone.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q) ||
      row.code.toLowerCase().includes(q) ||
      row.courseLabel.toLowerCase().includes(q)
    );
  });
}

export function countRegistrationsByStatus(
  rows: RegistrationRecord[],
): Record<'all' | RegistrationStatus, number> {
  const counts: Record<'all' | RegistrationStatus, number> = {
    all: rows.length,
    'Chờ thanh toán': 0,
    'Chờ xác nhận': 0,
    'Đã thanh toán': 0,
    'Thanh toán không hợp lệ': 0,
    'Đã hủy': 0,
  };
  for (const row of rows) {
    if (row.status in counts) {
      counts[row.status] += 1;
    }
  }
  return counts;
}

export function getPublicStatusMessage(record: Pick<PublicRegistrationStatusSummary, 'status' | 'pricingTier'>): {
  headline: string;
  detail: string;
} {
  switch (record.status) {
    case 'Chờ thanh toán':
      return {
        headline: 'Chờ thanh toán',
        detail: 'Vui lòng hoàn tất chuyển khoản theo hướng dẫn và gửi minh chứng thanh toán để được xác nhận suất.',
      };
    case 'Chờ xác nhận':
      return {
        headline: 'Đang chờ xác nhận thanh toán',
        detail: 'TIC Labs đã nhận thông tin/minh chứng chuyển khoản của bạn và đang tiến hành kiểm tra.',
      };
    case 'Đã thanh toán':
      return {
        headline:
          record.pricingTier === 'early-bird'
            ? 'Đăng ký thành công – Early Bird'
            : 'Đăng ký thành công',
        detail:
          record.pricingTier === 'early-bird'
            ? 'Thanh toán đã được Admin xác nhận thành công. Suất ưu đãi Early Bird của bạn đã được ghi nhận.'
            : 'Thanh toán của bạn đã được Admin xác nhận thành công.',
      };
    case 'Thanh toán không hợp lệ':
      return {
        headline: 'Thanh toán không hợp lệ',
        detail: 'Thông tin hoặc minh chứng thanh toán chưa hợp lệ. Vui lòng kiểm tra ghi chú từ Admin và gửi lại.',
      };
    case 'Đã hủy':
      return {
        headline: 'Đã hủy',
        detail: 'Đơn đăng ký này đã bị hủy. Bạn có thể gửi đăng ký mới nếu có nhu cầu.',
      };
  }
}

function escapeCsvCell(value: string | number): string {
  return '"' + String(value ?? '').replace(/"/g, '""') + '"';
}

export function buildRegistrationsCsv(rows: RegistrationRecord[]): string {
  const headers = [
    'Mã đăng ký',
    'Họ và tên',
    'Số điện thoại',
    'Email',
    'Khối lớp',
    'Khóa học',
    'Loại giá',
    'Mức học phí',
    'Trạng thái',
    'Thông tin thanh toán',
    'Thời gian xác nhận',
    'Admin xác nhận',
    'Ghi chú học viên',
    'Thời gian gửi form',
  ];
  const body = rows.map((r) => [
    r.code,
    r.fullname,
    r.phone,
    r.email,
    r.grade || 'Chưa chọn',
    r.courseLabel,
    r.pricingTier === 'early-bird' ? 'Early Bird' : r.pricingTier === 'original' ? 'Giá gốc' : 'Tư vấn',
    `${r.priceQuoted.toLocaleString('vi-VN')} đồng`,
    r.status,
    r.paymentInfo,
    r.confirmedAt || '—',
    r.confirmedBy || '—',
    r.note,
    r.createdAt,
  ]);
  const csvLines = [headers, ...body].map((row) => row.map(escapeCsvCell).join(','));
  return '\uFEFF' + csvLines.join('\r\n');
}
