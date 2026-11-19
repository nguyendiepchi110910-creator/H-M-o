import { ArrowRight } from 'lucide-react';
import {
  COURSES,
  calculateDiscountPercent,
  calculateSavings,
  formatVnd,
  getEffectiveCoursePrice,
  type CourseId,
  type EarlyBirdPricingStatus,
} from '../utils/courses';

interface InteractiveCourseShowcaseProps {
  activeCourseId: CourseId;
  pricingStatus: EarlyBirdPricingStatus;
  onChangeActiveCourse: (courseId: CourseId) => void;
  onChooseCourseToRegister: (courseId: CourseId) => void;
}

export function InteractiveCourseShowcase({
  activeCourseId,
  pricingStatus,
  onChangeActiveCourse,
  onChooseCourseToRegister,
}: InteractiveCourseShowcaseProps) {
  const activeCourse = COURSES.find((c) => c.id === activeCourseId) ?? COURSES[0];
  const earlyBirdActive = pricingStatus.earlyBirdActive;
  const activePrice = getEffectiveCoursePrice(activeCourse, earlyBirdActive);
  const savings = calculateSavings(activeCourse);
  const discountPercent = calculateDiscountPercent(activeCourse);

  return (
    <section id="programs" className="scroll-mt-[72px] border-b border-[#dbe5f2] bg-[#f8fbff] py-10 md:py-12">
      <div className="mx-auto max-w-[1120px] px-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#2162c5]">
              Course overview
            </p>
            <h2 className="mt-1 text-[26px] font-bold tracking-[-0.01em] text-[#123b75] md:text-[32px]">
              Nội dung từng mục khóa học
            </h2>
          </div>
          <p className="max-w-[460px] text-[14px] text-[#526277]">
            Ấn vào từng mục bên dưới để xem nội dung và mức học phí chi tiết của khóa học tại TIC Labs.
          </p>
        </div>

        {/* Clickable 3 Course Tabs */}
        <div
          role="tablist"
          aria-label="Chọn mục khóa học TIC Labs"
          className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          {COURSES.map((course) => {
            const isSelected = course.id === activeCourse.id;
            const tabPrice = getEffectiveCoursePrice(course, earlyBirdActive);
            return (
              <button
                key={course.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onChangeActiveCourse(course.id)}
                className={`flex cursor-pointer flex-col justify-between rounded-lg border p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-[#2162c5] bg-white ring-1 ring-[#2162c5]'
                    : 'border-[#dbe5f2] bg-white hover:border-[#9ebef0]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[12px] font-bold">
                    <span className={isSelected ? 'text-[#2162c5]' : 'text-[#526277]'}>
                      {course.kicker}
                    </span>
                    <span className="font-mono-num whitespace-nowrap text-[#2162c5]">
                      {formatVnd(tabPrice)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-[16px] font-bold leading-snug text-[#123b75]">
                    {course.title}
                  </h3>
                </div>
                <div className="mt-2.5 text-[12px] font-bold text-[#2162c5]">
                  {isSelected ? 'Đang xem nội dung' : 'Xem nội dung →'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Focused Course Detail Panel */}
        <div
          role="tabpanel"
          aria-label={activeCourse.title}
          className="mt-4 rounded-lg border border-[#dbe5f2] bg-white p-5 md:p-6"
        >
          <div className="grid items-center gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            <div>
              <div className="text-[12px] font-bold text-[#2162c5]">
                TIC Labs · {activeCourse.shortName}
              </div>
              <h3 className="mt-1 text-[22px] font-bold text-[#123b75] md:text-[26px]">
                {activeCourse.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#334155]">
                {activeCourse.description}
              </p>
              <ul className="mt-3.5 grid grid-cols-1 gap-1.5 border-t border-[#e5edf8] pt-3.5 text-[13px] text-[#123b75] sm:grid-cols-2">
                {activeCourse.features.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2162c5]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-[#dbe5f2] bg-[#f8fbff] p-4">
              {earlyBirdActive ? (
                <>
                  <div className="flex items-center justify-between text-[12px] font-bold text-[#2162c5]">
                    <span>EARLY BIRD (GIỚI HẠN {pricingStatus.limit} SUẤT)</span>
                    <span className="font-mono-num">-{discountPercent}%</span>
                  </div>
                  <div className="font-mono-num mt-1.5 text-[26px] font-bold text-[#2162c5]">
                    {formatVnd(activePrice)}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[13px] text-[#526277]">
                    <span>Giá gốc:</span>
                    <span className="font-mono-num line-through">
                      {formatVnd(activeCourse.originalPrice)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[12px] font-bold text-[#123b75]">
                    Tiết kiệm {formatVnd(savings)} · Còn {pricingStatus.remainingSlots}/{pricingStatus.limit} suất ưu đãi
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[12px] font-bold text-[#123b75]">
                    HỌC PHÍ CHÍNH THỨC (GIÁ GỐC)
                  </div>
                  <div className="font-mono-num mt-1.5 text-[26px] font-bold text-[#2162c5]">
                    {formatVnd(activeCourse.originalPrice)}
                  </div>
                  <div className="mt-1.5 text-[12px] font-bold text-[#526277]">
                    Early Bird đã hết suất ({pricingStatus.limit}/{pricingStatus.limit} suất đã xác nhận thanh toán).
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => onChooseCourseToRegister(activeCourse.id)}
                className="mt-4 inline-flex min-h-[40px] w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#2162c5] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#123b75]"
              >
                <span>
                  {earlyBirdActive
                    ? `ĐĂNG KÝ EARLY BIRD`
                    : `Đăng ký ${activeCourse.shortName}`}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
