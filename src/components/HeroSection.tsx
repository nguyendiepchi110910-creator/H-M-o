import { ArrowRight, Atom, BookOpenCheck, ClipboardCheck } from 'lucide-react';
import type { CourseId, EarlyBirdPricingStatus } from '../utils/courses';

interface HeroSectionProps {
  pricingStatus: EarlyBirdPricingStatus;
  onExplorePrograms: (courseId?: CourseId) => void;
  onJumpToPricing: () => void;
  onJumpToRegister: () => void;
}

export function HeroSection({
  pricingStatus,
  onExplorePrograms,
  onJumpToPricing,
  onJumpToRegister,
}: HeroSectionProps) {
  const { earlyBirdActive, remainingSlots, limit } = pricingStatus;

  return (
    <section id="home" className="scroll-mt-[72px] border-b border-[#dbe5f2] bg-white py-8 md:py-10">
      <div className="mx-auto max-w-[1120px] px-5">
        <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#2162c5]">
              Physics learning experience
            </p>
            <h1 className="mt-2 text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-[#2162c5] sm:text-[46px]">
              TIC Labs
            </h1>
            <p className="mt-2 text-[20px] font-bold leading-snug text-[#2162c5] sm:text-[23px]">
              See it. Test it. Understand it.
            </p>
            <p className="mt-1 text-[16px] font-normal text-[#123b75]">
              Quan sát. Thử nghiệm. Hiểu bản chất.
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-[#334155]">
              TIC Labs tập trung vào học sinh lớp 9 và lớp 12 – hai giai đoạn chuyển tiếp quan trọng, với mục tiêu hệ thống hóa và kết nối kiến thức Vật lý từ THCS đến THPT, phục vụ học tập và các kỳ thi vào 10, THPTQG, HSA, TSA, V-ACT. Thông qua hai dòng sản phẩm{' '}
              <strong className="text-[#123b75]">Tổng ôn chuyên đề</strong> và{' '}
              <strong className="text-[#123b75]">Thí nghiệm – mô phỏng</strong>, dự án giúp học sinh nắm vững kiến thức, hiểu bản chất và vận dụng Vật lý vào thực tiễn.
            </p>

            {/* Live Early Bird 50-slot notice */}
            <div className="mt-5 rounded-lg border border-[#dbe5f2] bg-[#f8fbff] px-4 py-3 text-[13px]">
              {earlyBirdActive ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#123b75]">
                      EARLY BIRD – GIỚI HẠN {limit} SUẤT ĐẦU TIÊN.
                    </span>{' '}
                    <span className="text-[#475569]">
                      Chỉ áp dụng cho {limit} lượt đăng ký đầu tiên được xác nhận thanh toán.
                    </span>
                  </div>
                  <div className="font-mono-num shrink-0 font-bold text-[#2162c5]">
                    Còn {remainingSlots}/{limit} suất
                  </div>
                </div>
              ) : (
                <div className="font-bold text-[#123b75]">
                  Early Bird đã hết suất ({limit}/{limit} suất đã được xác nhận thanh toán) · Hiện áp dụng giá gốc.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onJumpToRegister}
                className="inline-flex min-h-[42px] shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#2162c5] px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#123b75] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2162c5]"
              >
                <span>{earlyBirdActive ? 'ĐĂNG KÝ EARLY BIRD' : 'Đăng ký khóa học'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onExplorePrograms('simulation')}
                className="inline-flex min-h-[42px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-[#cfe0fa] bg-white px-5 py-2.5 text-[14px] font-bold text-[#123b75] transition-colors hover:bg-[#f8fbff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2162c5]"
              >
                Khám phá khóa học
              </button>
              <button
                type="button"
                onClick={onJumpToPricing}
                className="inline-flex min-h-[42px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-[14px] font-bold text-[#2162c5] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2162c5]"
              >
                Xem bảng giá
              </button>
            </div>
          </div>

          <div className="hidden justify-center lg:flex" aria-hidden="true">
            <svg viewBox="0 0 360 280" fill="none" className="h-auto w-full max-w-[280px]">
              <g strokeLinecap="round">
                <ellipse
                  cx="180"
                  cy="140"
                  rx="140"
                  ry="52"
                  transform="rotate(30 180 140)"
                  stroke="#2162c5"
                  strokeWidth="2.5"
                />
                <ellipse
                  cx="180"
                  cy="140"
                  rx="140"
                  ry="52"
                  transform="rotate(-30 180 140)"
                  stroke="#8db5ef"
                  strokeWidth="2.5"
                />
                <ellipse
                  cx="180"
                  cy="140"
                  rx="140"
                  ry="52"
                  transform="rotate(90 180 140)"
                  stroke="#c8dcfb"
                  strokeWidth="2.5"
                />
              </g>
              <circle cx="180" cy="140" r="28" fill="#2162c5" />
              <circle cx="180" cy="140" r="38" stroke="#eaf2ff" strokeWidth="2" />
              <circle cx="294" cy="86" r="8" fill="#2162c5" />
              <circle cx="66" cy="182" r="7" fill="#6c9de5" />
              <circle cx="212" cy="14" r="6" fill="#2162c5" />
            </svg>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 divide-y divide-[#dbe5f2] rounded-lg border border-[#dbe5f2] bg-[#f8fbff] md:grid-cols-3 md:divide-x md:divide-y-0">
          <button
            type="button"
            onClick={() => onExplorePrograms('simulation')}
            className="flex cursor-pointer items-center gap-3 px-4 py-3 text-left text-[#123b75] transition-colors hover:bg-[#eaf2ff]/50"
          >
            <Atom className="h-5 w-5 shrink-0 text-[#2162c5]" aria-hidden="true" />
            <span className="text-[14px] font-bold leading-snug">Mô phỏng thí nghiệm tương tác</span>
          </button>

          <button
            type="button"
            onClick={() => onExplorePrograms('topic-review')}
            className="flex cursor-pointer items-center gap-3 px-4 py-3 text-left text-[#123b75] transition-colors hover:bg-[#eaf2ff]/50"
          >
            <BookOpenCheck className="h-5 w-5 shrink-0 text-[#2162c5]" aria-hidden="true" />
            <span className="text-[14px] font-bold leading-snug">Khóa học Vật lý có hệ thống</span>
          </button>

          <button
            type="button"
            onClick={onJumpToRegister}
            className="flex cursor-pointer items-center gap-3 px-4 py-3 text-left text-[#123b75] transition-colors hover:bg-[#eaf2ff]/50"
          >
            <ClipboardCheck className="h-5 w-5 shrink-0 text-[#2162c5]" aria-hidden="true" />
            <span className="text-[14px] font-bold leading-snug">Đăng ký và tư vấn học tập thuận tiện</span>
          </button>
        </div>
      </div>
    </section>
  );
}
