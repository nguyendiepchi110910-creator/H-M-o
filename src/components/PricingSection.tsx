import { useState } from 'react';
import { Eye } from 'lucide-react';
import {
  COURSES,
  calculateDiscountPercent,
  calculateSavings,
  formatVnd,
  getEffectiveCoursePrice,
  type CourseId,
  type EarlyBirdPricingStatus,
} from '../utils/courses';

interface PricingSectionProps {
  selectedCourseId: string;
  pricingStatus: EarlyBirdPricingStatus;
  onInspectCourse: (courseId: CourseId) => void;
  onChooseCourse: (courseId: CourseId) => void;
}

export function PricingSection({
  selectedCourseId,
  pricingStatus,
  onInspectCourse,
  onChooseCourse,
}: PricingSectionProps) {
  const [priceMode, setPriceMode] = useState<'early-bird' | 'original'>('early-bird');
  const earlyBirdActive = pricingStatus.earlyBirdActive;

  return (
    <section id="courses" className="scroll-mt-[72px] border-b border-[#dbe5f2] bg-white py-10 md:py-12">
      <div className="mx-auto max-w-[1120px] px-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#2162c5]">
              Our courses
            </p>
            <h2 className="mt-1 text-[26px] font-bold tracking-[-0.01em] text-[#123b75] md:text-[32px]">
              Chọn lộ trình học phù hợp
            </h2>
            <p className="mt-1 text-[14px] text-[#526277]">
              Khám phá nội dung từng khóa học và để lại thông tin để TIC Labs tư vấn chi tiết.
            </p>
          </div>

          {earlyBirdActive ? (
            <div className="flex flex-col items-start gap-1.5 md:items-end">
              <div
                className="inline-flex items-center rounded-md border border-[#dbe5f2] bg-[#f8fbff] p-1"
                role="group"
                aria-label="Chế độ xem học phí"
              >
                <button
                  type="button"
                  onClick={() => setPriceMode('early-bird')}
                  className={`cursor-pointer whitespace-nowrap rounded px-3 py-1.5 text-[13px] font-bold transition-colors ${
                    priceMode === 'early-bird'
                      ? 'bg-[#2162c5] text-white'
                      : 'text-[#123b75] hover:text-[#2162c5]'
                  }`}
                >
                  Ưu đãi Early Bird
                </button>
                <button
                  type="button"
                  onClick={() => setPriceMode('original')}
                  className={`cursor-pointer whitespace-nowrap rounded px-3 py-1.5 text-[13px] font-bold transition-colors ${
                    priceMode === 'original'
                      ? 'bg-[#2162c5] text-white'
                      : 'text-[#123b75] hover:text-[#2162c5]'
                  }`}
                >
                  Xem giá gốc
                </button>
              </div>
              <div className="text-[12px] font-bold text-[#2162c5]">
                EARLY BIRD – GIỚI HẠN {pricingStatus.limit} SUẤT ĐẦU TIÊN · Còn{' '}
                <span className="font-mono-num">
                  {pricingStatus.remainingSlots}/{pricingStatus.limit}
                </span>{' '}
                suất
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-[#dbe5f2] bg-[#f8fbff] px-3.5 py-2 text-[13px] font-bold text-[#123b75]">
              Early Bird đã hết suất ({pricingStatus.limit}/{pricingStatus.limit} suất đã thanh toán) · Hiện áp dụng giá gốc.
            </div>
          )}
        </div>

        {/* 3 Pricing Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COURSES.map((course) => {
            const isSelected = selectedCourseId === course.id;
            const savings = calculateSavings(course);
            const discountPct = calculateDiscountPercent(course);
            const showEarlyBirdDiscount = earlyBirdActive && priceMode === 'early-bird';
            const displayedPrice = earlyBirdActive
              ? priceMode === 'early-bird'
                ? course.earlyBirdPrice
                : course.originalPrice
              : getEffectiveCoursePrice(course, false);

            return (
              <article
                key={course.id}
                id={course.id === 'simulation' ? 'simulation' : undefined}
                className={`flex flex-col justify-between rounded-lg bg-white p-5 transition-colors ${
                  course.featured || isSelected
                    ? 'border-2 border-[#2162c5]'
                    : 'border border-[#dbe5f2]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[12px] font-bold">
                    <span className="text-[#2162c5]">{course.kicker}</span>
                    {earlyBirdActive ? (
                      <span className="font-mono-num text-[#526277]">
                        -{discountPct}% Early Bird
                      </span>
                    ) : (
                      <span className="text-[#526277]">Giá chính thức</span>
                    )}
                  </div>

                  <h3 className="mt-2 text-[18px] font-bold leading-snug text-[#123b75]">
                    {course.title}
                  </h3>
                  <div className="mt-0.5 text-[13px] font-bold text-[#2162c5]">
                    Sản phẩm: {course.shortName}
                  </div>

                  <p className="mt-3 text-[14px] leading-relaxed text-[#334155]">
                    {course.description}
                  </p>

                  <ul className="mt-3 space-y-1.5 border-t border-[#e5edf8] pt-3 text-[13px] text-[#123b75]">
                    {course.features.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2162c5]" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 border-t border-[#e5edf8] pt-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono-num text-[24px] font-bold text-[#2162c5]">
                      {formatVnd(displayedPrice)}
                    </span>
                    {showEarlyBirdDiscount && (
                      <span className="font-mono-num text-[13px] text-[#64748b] line-through">
                        {formatVnd(course.originalPrice)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-[#526277]">
                    {!earlyBirdActive
                      ? 'Giá gốc niêm yết (Early Bird đã hết suất)'
                      : priceMode === 'early-bird'
                        ? `Early bird · Tiết kiệm ${formatVnd(savings)} so với giá gốc`
                        : `Giá gốc · Ưu đãi Early bird chỉ ${formatVnd(course.earlyBirdPrice)}`}
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onChooseCourse(course.id)}
                      className={`inline-flex min-h-[40px] w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-[13px] font-bold transition-colors ${
                        course.featured
                          ? 'bg-[#2162c5] text-white hover:bg-[#123b75]'
                          : 'border border-[#2162c5] bg-white text-[#2162c5] hover:bg-[#2162c5] hover:text-white'
                      }`}
                    >
                      {earlyBirdActive ? 'ĐĂNG KÝ EARLY BIRD' : 'Đăng ký khóa này'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onInspectCourse(course.id)}
                      className="inline-flex min-h-[36px] w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-bold text-[#123b75] transition-colors hover:bg-[#f8fbff] hover:text-[#2162c5]"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Xem chi tiết mục {course.code}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Pricing Table */}
        <div className="mt-8 rounded-lg border border-[#dbe5f2] bg-[#f8fbff] p-4 md:p-5">
          <div className="pb-3">
            <h3 className="text-[18px] font-bold text-[#123b75]">
              Bảng giá các khóa học tại TIC Labs
            </h3>
            <p className="mt-0.5 text-[13px] text-[#526277]">
              {earlyBirdActive
                ? `EARLY BIRD – GIỚI HẠN ${pricingStatus.limit} SUẤT ĐẦU TIÊN (còn ${pricingStatus.remainingSlots}/${pricingStatus.limit} suất). Chỉ tính các hồ sơ đã được xác nhận thanh toán.`
                : `Early Bird đã hết suất (${pricingStatus.limit}/${pricingStatus.limit} suất đã thanh toán); toàn bộ khóa học hiện áp dụng mức giá gốc.`}
            </p>
          </div>

          <div className="overflow-x-auto rounded-md border border-[#dbe5f2] bg-white">
            <table className="w-full min-w-[540px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#dbe5f2] bg-[#f8fbff] text-[#123b75]">
                  <th className="px-4 py-2.5 font-bold">Sản phẩm</th>
                  {earlyBirdActive ? (
                    <>
                      <th className="px-4 py-2.5 font-bold">Early bird</th>
                      <th className="px-4 py-2.5 font-bold">Giá gốc</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-2.5 font-bold">Học phí áp dụng (Giá gốc)</th>
                      <th className="px-4 py-2.5 font-bold">Early bird</th>
                    </>
                  )}
                  <th className="px-4 py-2.5 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5edf8]">
                {COURSES.map((course) => (
                  <tr key={course.id} className="hover:bg-[#f8fbff]">
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-[#123b75]">{course.shortName}</div>
                      <div className="text-[12px] text-[#526277]">{course.title}</div>
                    </td>
                    {earlyBirdActive ? (
                      <>
                        <td className="font-mono-num whitespace-nowrap px-4 py-2.5 font-bold text-[#2162c5]">
                          {formatVnd(course.earlyBirdPrice)}
                        </td>
                        <td className="font-mono-num whitespace-nowrap px-4 py-2.5 text-[#64748b] line-through">
                          {formatVnd(course.originalPrice)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="font-mono-num whitespace-nowrap px-4 py-2.5 font-bold text-[#2162c5]">
                          {formatVnd(course.originalPrice)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[12px] font-bold text-[#64748b]">
                          Early Bird đã hết suất
                        </td>
                      </>
                    )}
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onChooseCourse(course.id)}
                        className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#2162c5] bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#2162c5] transition-colors hover:bg-[#2162c5] hover:text-white"
                      >
                        {earlyBirdActive ? 'ĐĂNG KÝ EARLY BIRD' : 'Đăng ký'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
