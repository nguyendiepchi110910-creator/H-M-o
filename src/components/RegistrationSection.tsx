import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle2, Clock, FileCheck2, Search, Upload } from 'lucide-react';
import {
  COURSES,
  calculateSavings,
  formatVnd,
  getCourseById,
  getEffectiveCoursePrice,
  type BankTransferInfo,
  type EarlyBirdPricingStatus,
} from '../utils/courses';
import {
  getPublicStatusMessage,
  normalizeVietnamesePhone,
  validateRegistrationInput,
  type PublicRegistrationStatusSummary,
} from '../utils/registration';

interface RegistrationSectionProps {
  selectedCourseId: string;
  pricingStatus: EarlyBirdPricingStatus;
  bankInfo: BankTransferInfo;
  onSelectedCourseChange: (courseId: string) => void;
  onPricingStatusChange: (status: EarlyBirdPricingStatus) => void;
}

const LAST_OWN_LOOKUP_KEY = 'tic_labs_own_registration';

export function RegistrationSection({
  selectedCourseId,
  pricingStatus,
  bankInfo,
  onSelectedCourseChange,
  onPricingStatusChange,
}: RegistrationSectionProps) {
  const [panelMode, setPanelMode] = useState<'register' | 'lookup'>('register');

  // Registration form fields
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState('');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Active own registration (for payment instructions, proof upload & live status sync)
  const [activeRecord, setActiveRecord] = useState<PublicRegistrationStatusSummary | null>(null);
  const [activePhoneForProof, setActivePhoneForProof] = useState('');

  // Private status lookup fields
  const [lookupCode, setLookupCode] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  // Payment proof submission fields
  const [paymentInfo, setPaymentInfo] = useState('');
  const [proofBase64, setProofBase64] = useState('');
  const [proofMime, setProofMime] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [proofError, setProofError] = useState('');
  const [proofSuccessMsg, setProofSuccessMsg] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  const activeCourse = getCourseById(selectedCourseId);
  const earlyBirdActive = pricingStatus.earlyBirdActive;

  // Restore user's own registration lookup from current browser session (never exposes anyone else's data)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(LAST_OWN_LOOKUP_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { code?: string; phone?: string };
      if (!parsed.code || !parsed.phone) return;
      fetch('/api/registrations/status-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: parsed.code, phone: parsed.phone }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          if (data.registration) {
            setActiveRecord(data.registration);
            setActivePhoneForProof(parsed.phone || '');
          }
          if (data.pricingStatus) onPricingStatusChange(data.pricingStatus);
        })
        .catch(() => undefined);
    } catch {
      // Ignore invalid session storage
    }
  }, [onPricingStatusChange]);

  // Real-time sync polling while viewing own pending/unpaid registration
  useEffect(() => {
    if (!activeRecord || !activePhoneForProof) return;
    if (activeRecord.status === 'Đã thanh toán' || activeRecord.status === 'Đã hủy') return;

    const timer = window.setInterval(() => {
      fetch('/api/registrations/status-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeRecord.code,
          phone: activePhoneForProof,
        }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          if (data.registration) setActiveRecord(data.registration);
          if (data.pricingStatus) onPricingStatusChange(data.pricingStatus);
        })
        .catch(() => undefined);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [activeRecord, activePhoneForProof, onPricingStatusChange]);

  const handleSubmitRegistration = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    const validation = validateRegistrationInput({
      fullname,
      phone,
      email,
      grade,
      courseId: selectedCourseId,
      note,
      consent,
    });

    if (!validation.valid) {
      setErrors(validation.errors as Record<string, string>);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: fullname.trim(),
          phone: validation.normalizedPhone,
          email: email.trim(),
          grade,
          courseId: selectedCourseId,
          note: note.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Không thể gửi đăng ký. Vui lòng thử lại.');
        return;
      }

      if (data.pricingStatus) {
        onPricingStatusChange(data.pricingStatus);
      }

      const created: PublicRegistrationStatusSummary = data.registration;
      setActiveRecord(created);
      setActivePhoneForProof(validation.normalizedPhone);
      sessionStorage.setItem(
        LAST_OWN_LOOKUP_KEY,
        JSON.stringify({ code: created.code, phone: validation.normalizedPhone }),
      );
      setProofSuccessMsg('');
      setProofError('');
      setPaymentInfo('');
      setProofBase64('');
      setProofMime('');
      setProofFileName('');

      setFullname('');
      setPhone('');
      setEmail('');
      setGrade('');
      setNote('');
      setConsent(false);
    } catch {
      setSubmitError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupStatus = async (event: FormEvent) => {
    event.preventDefault();
    setLookupError('');
    const code = lookupCode.trim().toUpperCase();
    const normalizedPhone = normalizeVietnamesePhone(lookupPhone.trim());

    if (!code || !normalizedPhone) {
      setLookupError('Vui lòng nhập đầy đủ mã đăng ký và số điện thoại đã đăng ký.');
      return;
    }

    setLookingUp(true);
    try {
      const res = await fetch('/api/registrations/status-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, phone: normalizedPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || 'Không tìm thấy hồ sơ phù hợp.');
        return;
      }
      setActiveRecord(data.registration);
      setActivePhoneForProof(normalizedPhone);
      sessionStorage.setItem(
        LAST_OWN_LOOKUP_KEY,
        JSON.stringify({ code: data.registration.code, phone: normalizedPhone }),
      );
      if (data.pricingStatus) {
        onPricingStatusChange(data.pricingStatus);
      }
      setProofSuccessMsg('');
      setProofError('');
    } catch {
      setLookupError('Không thể kết nối máy chủ để tra cứu.');
    } finally {
      setLookingUp(false);
    }
  };

  const handleProofFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProofError('');
    const file = event.target.files?.[0];
    if (!file) {
      setProofBase64('');
      setProofMime('');
      setProofFileName('');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setProofError('Chỉ hỗ trợ ảnh định dạng PNG, JPG hoặc WEBP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProofError('Dung lượng ảnh tối đa 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofBase64(String(reader.result || ''));
      setProofMime(file.type);
      setProofFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeRecord) return;
    setProofError('');
    setProofSuccessMsg('');

    if (!paymentInfo.trim() && !proofBase64) {
      setProofError('Vui lòng nhập nội dung/mã giao dịch hoặc chọn ảnh minh chứng chuyển khoản.');
      return;
    }

    setSubmittingProof(true);
    try {
      const res = await fetch(`/api/registrations/${encodeURIComponent(activeRecord.code)}/payment-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activePhoneForProof,
          paymentInfo: paymentInfo.trim(),
          proofImageBase64: proofBase64,
          proofMime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProofError(data.error || 'Không thể gửi minh chứng thanh toán.');
        return;
      }
      setActiveRecord(data.registration);
      if (data.pricingStatus) {
        onPricingStatusChange(data.pricingStatus);
      }
      setProofSuccessMsg('Đang chờ xác nhận thanh toán');
      setProofBase64('');
      setProofMime('');
      setProofFileName('');
    } catch {
      setProofError('Lỗi kết nối khi gửi minh chứng.');
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleResetToNewRegistration = () => {
    sessionStorage.removeItem(LAST_OWN_LOOKUP_KEY);
    setActiveRecord(null);
    setActivePhoneForProof('');
    setPanelMode('register');
    setProofSuccessMsg('');
    setProofError('');
  };

  const statusText = activeRecord ? getPublicStatusMessage(activeRecord) : null;
  const canSubmitProof =
    activeRecord &&
    activeRecord.priceQuoted > 0 &&
    (activeRecord.status === 'Chờ thanh toán' || activeRecord.status === 'Thanh toán không hợp lệ') &&
    !(activeRecord.pricingTier === 'early-bird' && !earlyBirdActive);

  return (
    <section id="register" className="scroll-mt-[72px] bg-[#f7faff] py-10 md:py-12">
      <div className="mx-auto max-w-[1120px] px-5">
        <div className="grid items-start gap-7 lg:grid-cols-[0.84fr_1.16fr]">
          {/* Left Copy & Live Early Bird + Package Summary */}
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#2162c5]">
                Registration
              </p>
              <h2 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.01em] text-[#123b75] md:text-[32px]">
                Đăng ký nhận tư vấn khóa học
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#526277]">
                Để lại thông tin. TIC Labs sẽ liên hệ để xác nhận khóa học, lịch học và các thông tin cần thiết.
              </p>
            </div>

            {/* Early Bird 50-slot status block */}
            <div className="rounded-lg border border-[#dbe5f2] bg-white p-4">
              <div className="text-[12px] font-bold text-[#2162c5]">
                EARLY BIRD – GIỚI HẠN {pricingStatus.limit} SUẤT ĐẦU TIÊN
              </div>
              {earlyBirdActive ? (
                <>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#334155]">
                    Chỉ áp dụng cho {pricingStatus.limit} lượt đăng ký đầu tiên được Admin xác nhận thanh toán thành công.
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-[#e5edf8] pt-2.5 text-[13px]">
                    <span className="font-bold text-[#123b75]">Số suất ưu đãi còn lại:</span>
                    <span className="font-mono-num text-[15px] font-bold text-[#2162c5]">
                      {pricingStatus.remainingSlots}/{pricingStatus.limit} suất
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-1.5 text-[13px] font-bold text-[#dc2626]">
                  Early Bird đã hết suất ({pricingStatus.limit}/{pricingStatus.limit} suất đã được xác nhận thanh toán). Hệ thống đã tự động chuyển sang Giá gốc.
                </p>
              )}
            </div>

            {/* Live Selected Course Card */}
            <div className="rounded-lg border border-[#dbe5f2] bg-white p-4">
              <div className="text-[12px] font-bold uppercase tracking-wide text-[#2162c5]">
                Khóa học bạn đang chọn
              </div>

              {activeCourse ? (
                <div className="mt-2">
                  <div className="text-[16px] font-bold text-[#123b75]">
                    {activeCourse.shortName}
                  </div>
                  <div className="text-[12px] text-[#526277]">{activeCourse.title}</div>

                  {earlyBirdActive ? (
                    <>
                      <div className="mt-3 flex items-baseline justify-between border-t border-[#e5edf8] pt-3">
                        <div>
                          <div className="text-[12px] text-[#526277]">Học phí Early Bird</div>
                          <div className="font-mono-num text-[22px] font-bold text-[#2162c5]">
                            {formatVnd(activeCourse.earlyBirdPrice)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[12px] text-[#526277]">Giá gốc</div>
                          <div className="font-mono-num text-[14px] text-[#64748b] line-through">
                            {formatVnd(activeCourse.originalPrice)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-1.5 text-[12px] font-bold text-[#123b75]">
                        Tiết kiệm {formatVnd(calculateSavings(activeCourse))} · Còn{' '}
                        {pricingStatus.remainingSlots}/{pricingStatus.limit} suất
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mt-3 border-t border-[#e5edf8] pt-3">
                        <div className="text-[12px] text-[#526277]">Học phí áp dụng (Giá gốc)</div>
                        <div className="font-mono-num text-[22px] font-bold text-[#2162c5]">
                          {formatVnd(activeCourse.originalPrice)}
                        </div>
                      </div>
                      <div className="mt-1.5 text-[12px] font-bold text-[#526277]">
                        Early Bird đã hết suất ({pricingStatus.limit}/{pricingStatus.limit} suất).
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-[13px] text-[#526277]">
                  {selectedCourseId === 'consult'
                    ? 'Đội ngũ TIC Labs sẽ liên hệ tư vấn lộ trình học phù hợp nhất với trình độ của bạn.'
                    : 'Hãy chọn một khóa học trong biểu mẫu bên cạnh hoặc từ bảng giá ở trên.'}
                </div>
              )}
            </div>

            {/* Direct Contact Info */}
            <div className="rounded-lg border border-[#dbe5f2] bg-white p-4 text-[13px]">
              <div className="text-[12px] font-bold uppercase tracking-wide text-[#2162c5]">
                Thông tin liên hệ
              </div>
              <div className="mt-2 space-y-1 text-[#123b75]">
                <div>
                  <span className="text-[#526277]">SĐT:</span>{' '}
                  <a href="tel:0852734555" className="font-bold hover:text-[#2162c5]">
                    0852734555
                  </a>
                </div>
                <div>
                  <span className="text-[#526277]">Email:</span>{' '}
                  <a href="mailto:TICLabs1811@gmail.com" className="font-bold hover:text-[#2162c5]">
                    TICLabs1811@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form / Own Payment & Status Panel (Never shows other registrants) */}
          <div className="rounded-lg border border-[#dbe5f2] bg-white p-5 md:p-6">
            {activeRecord ? (
              <div className="space-y-4" role="status" aria-live="polite">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e5edf8] pb-4">
                  <div className="flex items-start gap-3">
                    {activeRecord.status === 'Đã thanh toán' ? (
                      <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#176b42]" aria-hidden="true" />
                    ) : activeRecord.status === 'Chờ xác nhận' ? (
                      <Clock className="mt-0.5 h-6 w-6 shrink-0 text-[#2162c5]" aria-hidden="true" />
                    ) : (
                      <FileCheck2 className="mt-0.5 h-6 w-6 shrink-0 text-[#2162c5]" aria-hidden="true" />
                    )}
                    <div>
                      <div className="font-mono-num text-[12px] font-bold text-[#2162c5]">
                        Mã đăng ký: {activeRecord.code}
                      </div>
                      <h3 className="mt-0.5 text-[19px] font-bold text-[#123b75]">
                        {statusText?.headline}
                      </h3>
                      <p className="mt-1 text-[13px] text-[#475569]">{statusText?.detail}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetToNewRegistration}
                    className="cursor-pointer rounded-md border border-[#dbe5f2] px-3 py-1.5 text-[12px] font-bold text-[#123b75] hover:bg-[#f8fbff]"
                  >
                    Đăng ký khóa khác
                  </button>
                </div>

                {/* Own summary */}
                <div className="grid grid-cols-1 gap-2 rounded-md border border-[#e5edf8] bg-[#f8fbff] p-3.5 text-[13px] sm:grid-cols-2">
                  <div>
                    <span className="text-[#526277]">Học viên:</span>{' '}
                    <strong className="text-[#123b75]">{activeRecord.fullname}</strong>
                  </div>
                  <div>
                    <span className="text-[#526277]">Khóa học:</span>{' '}
                    <strong className="text-[#123b75]">{activeRecord.courseLabel}</strong>
                  </div>
                  <div>
                    <span className="text-[#526277]">Học phí:</span>{' '}
                    <strong className="font-mono-num text-[#2162c5]">
                      {activeRecord.priceQuoted > 0 ? formatVnd(activeRecord.priceQuoted) : 'Tư vấn'}
                    </strong>{' '}
                    {activeRecord.priceQuoted > 0 && (
                      <span className="text-[12px] text-[#526277]">
                        ({activeRecord.pricingTier === 'early-bird' ? 'Early Bird' : 'Giá gốc'})
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[#526277]">Trạng thái:</span>{' '}
                    <strong className="text-[#123b75]">{activeRecord.status}</strong>
                  </div>
                  {activeRecord.confirmedAt && (
                    <div className="sm:col-span-2">
                      <span className="text-[#526277]">Thời gian Admin xác nhận:</span>{' '}
                      <strong className="font-mono-num text-[#176b42]">{activeRecord.confirmedAt}</strong>
                    </div>
                  )}
                  {activeRecord.adminNote && (
                    <div className="sm:col-span-2 text-[#b45309]">
                      <strong>Ghi chú từ Admin:</strong> {activeRecord.adminNote}
                    </div>
                  )}
                </div>

                {activeRecord.pricingTier === 'early-bird' &&
                  activeRecord.status !== 'Đã thanh toán' &&
                  !earlyBirdActive && (
                    <div className="rounded-md border border-[#fecaca] bg-[#fef2f2] p-3 text-[13px] font-bold text-[#991b1b]">
                      Early Bird đã hết suất (50/50 suất đã được xác nhận thanh toán). Vui lòng bấm &ldquo;Đăng ký khóa khác&rdquo; để đăng ký theo Giá gốc nếu bạn muốn tiếp tục.
                    </div>
                  )}

                {/* Payment instructions when payment is pending or rejected */}
                {canSubmitProof && (
                  <>
                    <div className="rounded-md border border-[#cfe0fa] bg-[#f8fbff] p-4">
                      <div className="text-[13px] font-bold text-[#123b75]">
                        Hướng dẫn thanh toán chuyển khoản
                      </div>
                      <p className="mt-1 text-[12px] text-[#526277]">
                        Suất Early Bird chỉ được ghi nhận sau khi Admin xác nhận thanh toán thành công.
                      </p>
                      <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-2">
                        <div>
                          <span className="text-[#526277]">Ngân hàng:</span>{' '}
                          <strong className="text-[#123b75]">{bankInfo.bankName}</strong>
                        </div>
                        <div>
                          <span className="text-[#526277]">Số tài khoản:</span>{' '}
                          <strong className="font-mono-num text-[#2162c5]">{bankInfo.accountNumber}</strong>
                        </div>
                        <div>
                          <span className="text-[#526277]">Chủ tài khoản:</span>{' '}
                          <strong className="text-[#123b75]">{bankInfo.accountHolder}</strong>
                        </div>
                        <div>
                          <span className="text-[#526277]">Số tiền:</span>{' '}
                          <strong className="font-mono-num text-[#2162c5]">
                            {formatVnd(activeRecord.priceQuoted)}
                          </strong>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[#526277]">Nội dung chuyển khoản:</span>{' '}
                          <strong className="font-mono-num text-[#123b75]">
                            {activeRecord.code} {activePhoneForProof}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitProof} className="space-y-3 border-t border-[#e5edf8] pt-4">
                      <div className="text-[14px] font-bold text-[#123b75]">
                        Gửi minh chứng thanh toán
                      </div>
                      <div>
                        <label htmlFor="payment-info" className="block text-[12px] font-bold text-[#123b75]">
                          Thông tin giao dịch / Mã tham chiếu
                        </label>
                        <input
                          id="payment-info"
                          type="text"
                          value={paymentInfo}
                          onChange={(e) => setPaymentInfo(e.target.value)}
                          placeholder="Ví dụ: Đã CK Vietcombank lúc 14:20, nội dung TIC-2601"
                          className="mt-1 w-full rounded-md border border-[#dbe5f2] bg-white px-3 py-2 text-[13px] text-[#202b3c] outline-none focus:border-[#2162c5]"
                        />
                      </div>

                      <div>
                        <label htmlFor="proof-file" className="block text-[12px] font-bold text-[#123b75]">
                          Ảnh minh chứng chuyển khoản (PNG, JPG, WEBP · tối đa 2MB)
                        </label>
                        <label
                          htmlFor="proof-file"
                          className="mt-1 flex cursor-pointer items-center justify-between rounded-md border border-dashed border-[#9ebef0] bg-[#f8fbff] px-3.5 py-2.5 text-[13px] text-[#123b75] hover:bg-[#eaf2ff]"
                        >
                          <span className="flex items-center gap-2 font-bold">
                            <Upload className="h-4 w-4 text-[#2162c5]" aria-hidden="true" />
                            <span>{proofFileName || 'Chọn ảnh chụp màn hình chuyển khoản'}</span>
                          </span>
                          <span className="text-[12px] text-[#2162c5]">Tải ảnh</span>
                        </label>
                        <input
                          id="proof-file"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleProofFileChange}
                          className="sr-only"
                        />
                      </div>

                      {proofError && (
                        <div className="rounded-md bg-[#fef2f2] px-3 py-2 text-[12px] font-bold text-[#991b1b]">
                          {proofError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submittingProof}
                        className="inline-flex min-h-[40px] w-full cursor-pointer items-center justify-center rounded-md bg-[#2162c5] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#123b75] disabled:opacity-60"
                      >
                        {submittingProof ? 'Đang gửi minh chứng...' : 'Gửi xác nhận đã chuyển khoản'}
                      </button>
                    </form>
                  </>
                )}

                {activeRecord.status === 'Chờ xác nhận' && (
                  <div className="rounded-md border border-[#cfe0fa] bg-[#eaf2ff] px-4 py-3 text-[13px] font-bold text-[#123b75]">
                    {proofSuccessMsg || 'Đang chờ xác nhận thanh toán'} — Hồ sơ đang được Admin kiểm tra và tự động cập nhật ngay khi xác nhận.
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Toggle between New Registration & Own Status Check */}
                <div className="mb-4 flex items-center gap-2 border-b border-[#e5edf8] pb-3">
                  <button
                    type="button"
                    onClick={() => setPanelMode('register')}
                    className={`cursor-pointer rounded-md px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
                      panelMode === 'register'
                        ? 'bg-[#2162c5] text-white'
                        : 'bg-[#f8fbff] text-[#123b75] hover:bg-[#eaf2ff]'
                    }`}
                  >
                    {earlyBirdActive ? 'ĐĂNG KÝ EARLY BIRD' : 'Đăng ký khóa học'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelMode('lookup')}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
                      panelMode === 'lookup'
                        ? 'bg-[#2162c5] text-white'
                        : 'bg-[#f8fbff] text-[#123b75] hover:bg-[#eaf2ff]'
                    }`}
                  >
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tra cứu & gửi minh chứng</span>
                  </button>
                </div>

                {panelMode === 'lookup' ? (
                  <form onSubmit={handleLookupStatus} className="space-y-3.5">
                    <p className="text-[13px] text-[#526277]">
                      Nhập <strong>Mã đăng ký</strong> và <strong>Số điện thoại</strong> của bạn để xem hướng dẫn thanh toán, gửi minh chứng hoặc kiểm tra kết quả xác nhận.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="lookup-code" className="block text-[12px] font-bold text-[#123b75]">
                          Mã đăng ký *
                        </label>
                        <input
                          id="lookup-code"
                          type="text"
                          value={lookupCode}
                          onChange={(e) => setLookupCode(e.target.value)}
                          placeholder="Ví dụ: TIC-2601"
                          className="mt-1 w-full rounded-md border border-[#dbe5f2] px-3 py-2 text-[13px] outline-none focus:border-[#2162c5]"
                        />
                      </div>
                      <div>
                        <label htmlFor="lookup-phone" className="block text-[12px] font-bold text-[#123b75]">
                          Số điện thoại *
                        </label>
                        <input
                          id="lookup-phone"
                          type="tel"
                          value={lookupPhone}
                          onChange={(e) => setLookupPhone(e.target.value)}
                          placeholder="0912345678"
                          className="mt-1 w-full rounded-md border border-[#dbe5f2] px-3 py-2 text-[13px] outline-none focus:border-[#2162c5]"
                        />
                      </div>
                    </div>
                    {lookupError && (
                      <div className="rounded-md bg-[#fef2f2] px-3 py-2 text-[12px] font-bold text-[#991b1b]">
                        {lookupError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={lookingUp}
                      className="inline-flex min-h-[42px] w-full cursor-pointer items-center justify-center rounded-md bg-[#2162c5] px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-[#123b75] disabled:opacity-60"
                    >
                      {lookingUp ? 'Đang tra cứu...' : 'Kiểm tra hồ sơ của tôi'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmitRegistration} noValidate>
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="fullname" className="text-[12px] font-bold text-[#123b75]">
                          Họ và tên *
                        </label>
                        <input
                          id="fullname"
                          name="fullname"
                          value={fullname}
                          onChange={(e) => setFullname(e.target.value)}
                          maxLength={80}
                          placeholder="Nguyễn Văn A"
                          aria-invalid={Boolean(errors.fullname)}
                          className="w-full rounded-md border border-[#dbe5f2] bg-white px-3 py-2 text-[13px] text-[#202b3c] outline-none focus:border-[#2162c5]"
                        />
                        {errors.fullname && (
                          <span className="text-[12px] font-bold text-[#dc2626]">{errors.fullname}</span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label htmlFor="phone" className="text-[12px] font-bold text-[#123b75]">
                          Số điện thoại *
                        </label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          maxLength={20}
                          placeholder="09xx xxx xxx"
                          aria-invalid={Boolean(errors.phone)}
                          className="w-full rounded-md border border-[#dbe5f2] bg-white px-3 py-2 text-[13px] text-[#202b3c] outline-none focus:border-[#2162c5]"
                        />
                        {errors.phone && (
                          <span className="text-[12px] font-bold text-[#dc2626]">{errors.phone}</span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label htmlFor="email" className="text-[12px] font-bold text-[#123b75]">
                          Email (không bắt buộc)
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          maxLength={120}
                          placeholder="email@example.com"
                          aria-invalid={Boolean(errors.email)}
                          className="w-full rounded-md border border-[#dbe5f2] bg-white px-3 py-2 text-[13px] text-[#202b3c] outline-none focus:border-[#2162c5]"
                        />
                        {errors.email && (
                          <span className="text-[12px] font-bold text-[#dc2626]">{errors.email}</span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label htmlFor="grade" className="text-[12px] font-bold text-[#123b75]">
                          Khối lớp
                        </label>
                        <select
                          id="grade"
                          name="grade"
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          className="w-full rounded-md border border-[#dbe5f2] bg-white px-3 py-2 text-[13px] text-[#202b3c] outline-none focus:border-[#2162c5]"
                        >
                          <option value="">Chọn khối lớp</option>
                          <option value="Lớp 9">Lớp 9</option>
                          <option value="Lớp 12">Lớp 12</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label htmlFor="course" className="text-[12px] font-bold text-[#123b75]">
                          Khóa học quan tâm *
                        </label>
                        <select
                          id="course"
                          name="course"
                          value={selectedCourseId}
                          onChange={(e) => onSelectedCourseChange(e.target.value)}
                          aria-invalid={Boolean(errors.courseId)}
                          className="w-full rounded-md border border-[#dbe5f2] bg-white px-3 py-2 text-[13px] text-[#202b3c] outline-none focus:border-[#2162c5]"
                        >
                          <option value="">Chọn khóa học</option>
                          {COURSES.map((c) => {
                            const effectivePrice = getEffectiveCoursePrice(c, earlyBirdActive);
                            return (
                              <option key={c.id} value={c.id}>
                                {earlyBirdActive
                                  ? `${c.shortName} (${c.englishName}) — Early Bird ${formatVnd(effectivePrice)} (Giá gốc ${formatVnd(c.originalPrice)})`
                                  : `${c.shortName} (${c.englishName}) — Giá gốc ${formatVnd(effectivePrice)}`}
                              </option>
                            );
                          })}
                          <option value="consult">Muốn được tư vấn thêm</option>
                        </select>
                        {errors.courseId && (
                          <span className="text-[12px] font-bold text-[#dc2626]">{errors.courseId}</span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label htmlFor="note" className="text-[12px] font-bold text-[#123b75]">
                          Câu hỏi thêm (không bắt buộc)
                        </label>
                        <textarea
                          id="note"
                          name="note"
                          rows={2}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          maxLength={500}
                          placeholder="Bạn muốn tìm hiểu thêm điều gì?"
                          className="w-full rounded-md border border-[#dbe5f2] bg-white px-3 py-2 text-[13px] text-[#202b3c] outline-none focus:border-[#2162c5]"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="flex cursor-pointer items-start gap-2 text-[12px] text-[#526277]">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded accent-[#2162c5]"
                        />
                        <span>
                          Tôi đồng ý để TIC Labs sử dụng thông tin trên nhằm liên hệ tư vấn và xác nhận thanh toán khóa học. *
                        </span>
                      </label>
                      {errors.consent && (
                        <div className="mt-1 text-[12px] font-bold text-[#dc2626]">{errors.consent}</div>
                      )}
                    </div>

                    {submitError && (
                      <div
                        role="alert"
                        className="mt-3 rounded-md bg-[#fef2f2] px-3 py-2 text-[12px] font-bold text-[#991b1b]"
                      >
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="mt-4 inline-flex min-h-[42px] w-full cursor-pointer items-center justify-center rounded-md bg-[#2162c5] px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#123b75] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting
                        ? 'Đang gửi thông tin...'
                        : earlyBirdActive
                          ? 'ĐĂNG KÝ EARLY BIRD'
                          : 'Gửi thông tin đăng ký'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
