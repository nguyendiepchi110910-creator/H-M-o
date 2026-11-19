import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { CourseId } from '../utils/courses';

interface HeaderProps {
  earlyBirdActive: boolean;
  onSelectCourseSection: (courseId: CourseId) => void;
  onNavigateRegister: () => void;
}

export function BrandLogoMark() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="h-8 w-8 shrink-0">
      <g stroke="#2162c5" strokeWidth="3">
        <ellipse cx="32" cy="32" rx="27" ry="10" transform="rotate(55 32 32)" />
        <ellipse cx="32" cy="32" rx="27" ry="10" transform="rotate(-55 32 32)" />
        <ellipse cx="32" cy="32" rx="27" ry="10" />
      </g>
      <circle cx="32" cy="32" r="4.5" fill="#2162c5" />
    </svg>
  );
}

export function Header({
  earlyBirdActive,
  onSelectCourseSection,
  onNavigateRegister,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (targetId: string, courseId?: CourseId) => {
    setMobileMenuOpen(false);
    if (courseId) {
      onSelectCourseSection(courseId);
      return;
    }
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#dbe5f2] bg-white">
      <div className="mx-auto flex h-[64px] max-w-[1120px] items-center justify-between gap-8 px-5">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('home');
          }}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[20px] font-bold tracking-[-0.02em] text-[#2162c5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2162c5]"
          aria-label="TIC Labs trang chủ"
        >
          <BrandLogoMark />
          <span>TIC Labs</span>
        </a>

        <nav
          className="hidden items-center gap-7 text-[14px] font-bold text-[#123b75] md:flex"
          aria-label="Điều hướng chính"
        >
          <a
            href="#programs"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('programs');
            }}
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-[#2162c5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2162c5]"
          >
            Khóa học
          </a>
          <a
            href="#programs"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('programs', 'simulation');
            }}
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-[#2162c5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2162c5]"
          >
            Mô phỏng
          </a>
          <a
            href="#courses"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('courses');
            }}
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-[#2162c5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2162c5]"
          >
            Bảng giá
          </a>
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('about');
            }}
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-[#2162c5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2162c5]"
          >
            Giới thiệu
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigateRegister();
            }}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-[#2162c5] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#123b75] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2162c5]"
          >
            {earlyBirdActive ? 'ĐĂNG KÝ EARLY BIRD' : 'Đăng ký'}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe5f2] text-[#123b75] transition-colors hover:bg-[#f8fbff] md:hidden"
            aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-[#dbe5f2] bg-white px-5 py-2.5 md:hidden">
          <nav
            className="flex flex-col gap-1 text-[14px] font-bold text-[#123b75]"
            aria-label="Điều hướng di động"
          >
            <button
              type="button"
              onClick={() => handleLinkClick('programs')}
              className="flex min-h-[40px] items-center rounded-md px-3 text-left transition-colors hover:bg-[#f8fbff] hover:text-[#2162c5]"
            >
              Khóa học
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('programs', 'simulation')}
              className="flex min-h-[40px] items-center rounded-md px-3 text-left transition-colors hover:bg-[#f8fbff] hover:text-[#2162c5]"
            >
              Mô phỏng
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('courses')}
              className="flex min-h-[40px] items-center rounded-md px-3 text-left transition-colors hover:bg-[#f8fbff] hover:text-[#2162c5]"
            >
              Bảng giá
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('about')}
              className="flex min-h-[40px] items-center rounded-md px-3 text-left transition-colors hover:bg-[#f8fbff] hover:text-[#2162c5]"
            >
              Giới thiệu
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
