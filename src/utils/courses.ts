export type CourseId = 'simulation' | 'topic-review' | 'exam';

export interface CourseItem {
  id: CourseId;
  code: string;
  title: string;
  shortName: string;
  englishName: string;
  kicker: string;
  description: string;
  features: string[];
  earlyBirdPrice: number;
  originalPrice: number;
  featured: boolean;
}

export interface EarlyBirdPricingStatus {
  earlyBirdActive: boolean;
  confirmedCount: number;
  pendingConfirmationCount: number;
  limit: number;
  remainingSlots: number;
}

export interface BankTransferInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export const EARLY_BIRD_CONFIRMED_LIMIT = 50;

export const COURSES: CourseItem[] = [
  {
    id: 'simulation',
    code: '01',
    title: '01. Simulation – Thí nghiệm & Mô phỏng',
    shortName: 'Khóa thí nghiệm/mô phỏng',
    englishName: 'Simulation',
    kicker: 'Trải nghiệm trực quan',
    description:
      'Khám phá các hiện tượng Vật lý thông qua 24 mô phỏng thí nghiệm 2.5D tương tác. Chủ động thay đổi thông số, quan sát kết quả và hiểu sâu hơn bản chất các quy luật Vật lý.',
    features: [
      'Video thí nghiệm và mô phỏng.',
      'Giải thích hiện tượng Vật lý.',
      'Tài liệu thực nghiệm.',
    ],
    earlyBirdPrice: 199000,
    originalPrice: 279000,
    featured: false,
  },
  {
    id: 'topic-review',
    code: '02',
    title: '02. Topic Review – Tổng ôn chuyên đề',
    shortName: 'Khóa tổng ôn chuyên đề',
    englishName: 'Topic Review',
    kicker: 'Củng cố kiến thức',
    description:
      'Hệ thống hóa kiến thức Vật lý theo từng chuyên đề. Kết hợp video bài giảng, công thức trọng tâm, phương pháp giải và hệ thống bài tập từ cơ bản đến nâng cao.',
    features: [
      'Video bài giảng.',
      'Hệ thống lý thuyết và công thức.',
      'Bộ bài tập theo từng dạng.',
      'Tài liệu ôn tập.',
    ],
    earlyBirdPrice: 299000,
    originalPrice: 379000,
    featured: false,
  },
  {
    id: 'exam',
    code: '03',
    title: '03. Exam – Khóa học toàn diện',
    shortName: 'Khóa toàn diện',
    englishName: 'Exam',
    kicker: 'Lộ trình toàn diện',
    description:
      'Lộ trình học tập kết hợp kiến thức, mô phỏng thực nghiệm và luyện tập chuyên sâu. Tích hợp hệ thống kiểm tra, luyện đề và đánh giá năng lực nhằm giúp học sinh chuẩn bị tốt cho các kỳ thi.',
    features: [
      'Toàn bộ nội dung Tổng ôn.',
      'Toàn bộ nội dung Thí nghiệm – mô phỏng.',
      'Bộ tài liệu nâng cao.',
      'Kiểm tra định kỳ với tần suất nhiều hơn.',
      'Đánh giá kết quả và theo dõi tiến độ học tập.',
    ],
    earlyBirdPrice: 649000,
    originalPrice: 799000,
    featured: true,
  },
];

export const DEFAULT_PRICING_STATUS: EarlyBirdPricingStatus = {
  earlyBirdActive: true,
  confirmedCount: 0,
  pendingConfirmationCount: 0,
  limit: EARLY_BIRD_CONFIRMED_LIMIT,
  remainingSlots: EARLY_BIRD_CONFIRMED_LIMIT,
};

export function isConfirmedPaidEarlyBird(status: string, pricingTier?: string): boolean {
  const isPaid = status === 'Đã thanh toán';
  if (!isPaid) return false;
  return !pricingTier || pricingTier === 'early-bird';
}

export function computeEarlyBirdStatus(
  records: Array<{ status: string; pricingTier?: string }>,
  limit = EARLY_BIRD_CONFIRMED_LIMIT,
): EarlyBirdPricingStatus {
  const confirmedCount = records.filter((r) => isConfirmedPaidEarlyBird(r.status, r.pricingTier)).length;
  const pendingConfirmationCount = records.filter((r) => r.status === 'Chờ xác nhận').length;
  const remainingSlots = Math.max(0, limit - confirmedCount);
  return {
    earlyBirdActive: confirmedCount < limit,
    confirmedCount,
    pendingConfirmationCount,
    limit,
    remainingSlots,
  };
}

export function getEffectiveCoursePrice(
  course: Pick<CourseItem, 'earlyBirdPrice' | 'originalPrice'>,
  earlyBirdActive: boolean,
): number {
  return earlyBirdActive ? course.earlyBirdPrice : course.originalPrice;
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đồng`;
}

export function calculateSavings(course: Pick<CourseItem, 'earlyBirdPrice' | 'originalPrice'>): number {
  return Math.max(0, course.originalPrice - course.earlyBirdPrice);
}

export function calculateDiscountPercent(course: Pick<CourseItem, 'earlyBirdPrice' | 'originalPrice'>): number {
  if (course.originalPrice <= 0) return 0;
  return Math.round(((course.originalPrice - course.earlyBirdPrice) / course.originalPrice) * 100);
}

export function getCourseById(id: string): CourseItem | undefined {
  return COURSES.find((c) => c.id === id);
}
