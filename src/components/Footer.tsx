import { BrandLogoMark } from './Header';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#dbe5f2] bg-white py-6 text-[13px] text-[#526277]">
      <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-4 px-5 md:flex-row md:items-center">
        <div className="flex items-center gap-2.5">
          <BrandLogoMark />
          <div>
            <strong className="block text-[15px] font-bold text-[#2162c5]">
              TIC Labs
            </strong>
            <span className="text-[12px] text-[#526277]">
              See it. Test it. Understand it. · Quan sát. Thử nghiệm. Hiểu bản chất.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#123b75]">
          <a href="tel:0852734555" className="font-bold hover:text-[#2162c5]">
            SĐT: 0852734555
          </a>
          <a href="mailto:TICLabs1811@gmail.com" className="font-bold hover:text-[#2162c5]">
            TICLabs1811@gmail.com
          </a>
        </div>

        <nav className="flex flex-wrap items-center gap-5 font-bold text-[#123b75]" aria-label="Liên kết chân trang">
          <a href="#programs" className="hover:text-[#2162c5]">
            Khóa học
          </a>
          <a href="#courses" className="hover:text-[#2162c5]">
            Bảng giá Early Bird
          </a>
          <a href="#about" className="hover:text-[#2162c5]">
            Quy trình đăng ký
          </a>
          <a href="#register" className="hover:text-[#2162c5]">
            Đăng ký tư vấn
          </a>
        </nav>

        <span>© {year} TIC Labs. All rights reserved.</span>
      </div>
    </footer>
  );
}
