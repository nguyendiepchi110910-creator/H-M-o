import { ArrowUpRight } from 'lucide-react';

interface HowItWorksSectionProps {
  onJumpToCourses: () => void;
  onJumpToRegister: () => void;
}

export function HowItWorksSection({
  onJumpToCourses,
  onJumpToRegister,
}: HowItWorksSectionProps) {
  const steps = [
    {
      number: '01 / CHỌN KHÓA',
      title: 'Tìm hiểu nội dung',
      description: 'Xem mô tả, quyền lợi và mức học phí Early Bird giới hạn 50 suất đầu tiên.',
      actionLabel: 'Xem các khóa học',
      onClick: onJumpToCourses,
    },
    {
      number: '02 / ĐỂ LẠI THÔNG TIN',
      title: 'Gửi đăng ký & chuyển khoản',
      description: 'Điền thông tin đăng ký, thực hiện chuyển khoản theo hướng dẫn và tải ảnh minh chứng.',
      actionLabel: 'Điền biểu mẫu ngay',
      onClick: onJumpToRegister,
    },
    {
      number: '03 / XÁC NHẬN',
      title: 'TIC Labs xác nhận thanh toán',
      description: 'Admin kiểm tra minh chứng và xác nhận suất Early Bird chính thức cho học viên.',
      actionLabel: 'Kiểm tra trạng thái',
      onClick: onJumpToRegister,
    },
  ];

  return (
    <section id="about" className="scroll-mt-[72px] border-b border-[#dbe5f2] bg-[#f8fbff] py-10 md:py-12">
      <div className="mx-auto max-w-[1120px] px-5">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#2162c5]">
              How it works
            </p>
            <h2 className="mt-1 text-[26px] font-bold tracking-[-0.01em] text-[#123b75] md:text-[32px]">
              Đăng ký học tại TIC Labs
            </h2>
          </div>
          <p className="max-w-[440px] text-[14px] text-[#526277]">
            Quy trình đơn giản, rõ ràng từ chọn khóa, gửi minh chứng thanh toán đến xác nhận suất học.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex flex-col justify-between rounded-lg border border-[#dbe5f2] bg-white p-5"
            >
              <div>
                <div className="font-mono-num text-[12px] font-bold tracking-[0.04em] text-[#2162c5]">
                  {step.number}
                </div>
                <h3 className="mt-2 text-[17px] font-bold text-[#123b75]">{step.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#526277]">{step.description}</p>
              </div>
              <button
                type="button"
                onClick={step.onClick}
                className="mt-4 inline-flex w-fit cursor-pointer items-center gap-1 text-[13px] font-bold text-[#2162c5] transition-colors hover:text-[#123b75]"
              >
                <span>{step.actionLabel}</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
