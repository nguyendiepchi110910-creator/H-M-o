import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COURSES,
  EARLY_BIRD_CONFIRMED_LIMIT,
  calculateDiscountPercent,
  calculateSavings,
  computeEarlyBirdStatus,
  formatVnd,
  getCourseById,
  getEffectiveCoursePrice,
} from './courses';
import {
  countRegistrationsByStatus,
  getPublicStatusMessage,
  normalizeVietnamesePhone,
  validateRegistrationInput,
  type RegistrationRecord,
} from './registration';

test('course pricing and descriptions match exact user specification', () => {
  const sim = getCourseById('simulation');
  const topic = getCourseById('topic-review');
  const exam = getCourseById('exam');

  assert.ok(sim && topic && exam);
  assert.equal(COURSES.length, 3);

  assert.equal(sim.shortName, 'Khóa thí nghiệm/mô phỏng');
  assert.equal(sim.earlyBirdPrice, 199000);
  assert.equal(sim.originalPrice, 279000);
  assert.equal(sim.features.length, 3);
  assert.equal(calculateSavings(sim), 80000);
  assert.equal(formatVnd(sim.earlyBirdPrice), '199.000 đồng');

  assert.equal(topic.shortName, 'Khóa tổng ôn chuyên đề');
  assert.equal(topic.earlyBirdPrice, 299000);
  assert.equal(topic.originalPrice, 379000);
  assert.equal(topic.features.length, 4);
  assert.equal(calculateSavings(topic), 80000);

  assert.equal(exam.shortName, 'Khóa toàn diện');
  assert.equal(exam.earlyBirdPrice, 649000);
  assert.equal(exam.originalPrice, 799000);
  assert.equal(exam.features.length, 5);
  assert.equal(calculateSavings(exam), 150000);
  assert.equal(calculateDiscountPercent(exam), 19);
});

test('Early Bird limit is 50 paid confirmations; pending and unpaid do not consume slots', () => {
  assert.equal(EARLY_BIRD_CONFIRMED_LIMIT, 50);

  // 49 paid early-bird + 12 waiting confirmation + 20 unpaid + 5 invalid + 3 canceled => 49 used, 1 remaining
  const records = [
    ...Array(49).fill({ status: 'Đã thanh toán', pricingTier: 'early-bird' }),
    ...Array(12).fill({ status: 'Chờ xác nhận', pricingTier: 'early-bird' }),
    ...Array(20).fill({ status: 'Chờ thanh toán', pricingTier: 'early-bird' }),
    ...Array(5).fill({ status: 'Thanh toán không hợp lệ', pricingTier: 'early-bird' }),
    ...Array(3).fill({ status: 'Đã hủy', pricingTier: 'early-bird' }),
  ];

  const activeStatus = computeEarlyBirdStatus(records);
  assert.equal(activeStatus.earlyBirdActive, true);
  assert.equal(activeStatus.confirmedCount, 49);
  assert.equal(activeStatus.pendingConfirmationCount, 12);
  assert.equal(activeStatus.remainingSlots, 1);

  const sim = getCourseById('simulation')!;
  const exam = getCourseById('exam')!;
  assert.equal(getEffectiveCoursePrice(sim, activeStatus.earlyBirdActive), 199000);
  assert.equal(getEffectiveCoursePrice(exam, activeStatus.earlyBirdActive), 649000);

  // 50th paid early-bird confirmation closes Early Bird even if more are pending
  const fullRecords = [
    ...records,
    { status: 'Đã thanh toán', pricingTier: 'early-bird' },
  ];
  const fullStatus = computeEarlyBirdStatus(fullRecords);
  assert.equal(fullStatus.earlyBirdActive, false);
  assert.equal(fullStatus.confirmedCount, 50);
  assert.equal(fullStatus.remainingSlots, 0);
  assert.equal(getEffectiveCoursePrice(sim, fullStatus.earlyBirdActive), 279000);
  assert.equal(getEffectiveCoursePrice(exam, fullStatus.earlyBirdActive), 799000);
});

test('status counters and public status messaging follow exact workflow', () => {
  const sample = (status: RegistrationRecord['status'], pricingTier: RegistrationRecord['pricingTier'] = 'early-bird'): RegistrationRecord => ({
    id: status,
    code: 'TIC-2601',
    fullname: 'Nguyễn An',
    phone: '0912345678',
    email: '',
    grade: 'Lớp 12',
    courseId: 'exam',
    courseLabel: 'Khóa toàn diện (Exam)',
    priceQuoted: 599000,
    pricingTier,
    note: '',
    status,
    paymentInfo: '',
    hasProof: false,
    proofSubmittedAt: '',
    adminNote: '',
    confirmedAt: '',
    confirmedBy: '',
    createdAt: '',
    updatedAt: '',
  });

  const counts = countRegistrationsByStatus([
    sample('Chờ thanh toán'),
    sample('Chờ xác nhận'),
    sample('Đã thanh toán'),
    sample('Thanh toán không hợp lệ'),
    sample('Đã hủy'),
  ]);

  assert.equal(counts.all, 5);
  assert.equal(counts['Chờ thanh toán'], 1);
  assert.equal(counts['Chờ xác nhận'], 1);
  assert.equal(counts['Đã thanh toán'], 1);
  assert.equal(counts['Thanh toán không hợp lệ'], 1);
  assert.equal(counts['Đã hủy'], 1);

  assert.equal(getPublicStatusMessage(sample('Chờ xác nhận')).headline, 'Đang chờ xác nhận thanh toán');
  assert.equal(
    getPublicStatusMessage(sample('Đã thanh toán', 'early-bird')).headline,
    'Đăng ký thành công – Early Bird',
  );
  assert.equal(
    getPublicStatusMessage(sample('Đã thanh toán', 'original')).headline,
    'Đăng ký thành công',
  );
});

test('registration validation enforces Vietnamese phone, name, course, and consent', () => {
  assert.equal(normalizeVietnamesePhone('+84 912.345-678'), '0912345678');

  const invalid = validateRegistrationInput({
    fullname: 'A',
    phone: '123',
    email: 'bad-email',
    grade: 'Lớp 12',
    courseId: '',
    note: '',
    consent: false,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.fullname);
  assert.ok(invalid.errors.phone);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.courseId);
  assert.ok(invalid.errors.consent);

  const valid = validateRegistrationInput({
    fullname: 'Nguyễn Minh Anh',
    phone: '0912 345 678',
    email: 'minhanh@example.com',
    grade: 'Lớp 12',
    courseId: 'exam',
    note: 'Tư vấn lịch học',
    consent: true,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalizedPhone, '0912345678');
});
