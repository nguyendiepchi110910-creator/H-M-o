import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { InteractiveCourseShowcase } from './components/InteractiveCourseShowcase';
import { PricingSection } from './components/PricingSection';
import { RegistrationSection } from './components/RegistrationSection';
import {
  DEFAULT_PRICING_STATUS,
  type BankTransferInfo,
  type CourseId,
  type EarlyBirdPricingStatus,
} from './utils/courses';

const DEFAULT_BANK_INFO: BankTransferInfo = {
  bankName: 'Vietcombank (VCB)',
  accountNumber: '1028394850',
  accountHolder: 'TIC LABS EDUCATION',
};

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [activeShowcaseCourse, setActiveShowcaseCourse] = useState<CourseId>('simulation');
  const [selectedRegisterCourse, setSelectedRegisterCourse] = useState<string>('exam');
  const [pricingStatus, setPricingStatus] = useState<EarlyBirdPricingStatus>(DEFAULT_PRICING_STATUS);
  const [bankInfo, setBankInfo] = useState<BankTransferInfo>(DEFAULT_BANK_INFO);

  const refreshPricingStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/pricing-status');
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.earlyBirdActive === 'boolean') {
        setPricingStatus({
          earlyBirdActive: data.earlyBirdActive,
          confirmedCount: Number(data.confirmedCount ?? 0),
          pendingConfirmationCount: Number(data.pendingConfirmationCount ?? 0),
          limit: Number(data.limit ?? 50),
          remainingSlots: Number(data.remainingSlots ?? 50),
        });
      }
      if (data.bankInfo) {
        setBankInfo(data.bankInfo);
      }
    } catch {
      // Keep current pricing status if offline
    }
  }, []);

  useEffect(() => {
    refreshPricingStatus();
    if (pathname === '/admin') return;
    const interval = window.setInterval(refreshPricingStatus, 8000);
    const onFocus = () => refreshPricingStatus();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshPricingStatus, pathname]);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (pathname === '/admin') {
    return (
      <AdminDashboard
        onBackHome={() => {
          window.history.pushState({}, '', '/');
          setPathname('/');
        }}
      />
    );
  }

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleInspectCourse = (courseId: CourseId) => {
    setActiveShowcaseCourse(courseId);
    scrollToElement('programs');
  };

  const handleChooseCourseToRegister = (courseId: CourseId) => {
    setSelectedRegisterCourse(courseId);
    scrollToElement('register');
  };

  return (
    <div className="min-h-screen bg-white text-[#202b3c]">
      <Header
        earlyBirdActive={pricingStatus.earlyBirdActive}
        onSelectCourseSection={handleInspectCourse}
        onNavigateRegister={() => scrollToElement('register')}
      />

      <main>
        <HeroSection
          pricingStatus={pricingStatus}
          onExplorePrograms={(courseId) => handleInspectCourse(courseId ?? 'simulation')}
          onJumpToPricing={() => scrollToElement('courses')}
          onJumpToRegister={() => scrollToElement('register')}
        />

        <InteractiveCourseShowcase
          activeCourseId={activeShowcaseCourse}
          pricingStatus={pricingStatus}
          onChangeActiveCourse={setActiveShowcaseCourse}
          onChooseCourseToRegister={handleChooseCourseToRegister}
        />

        <PricingSection
          selectedCourseId={selectedRegisterCourse}
          pricingStatus={pricingStatus}
          onInspectCourse={handleInspectCourse}
          onChooseCourse={handleChooseCourseToRegister}
        />

        <HowItWorksSection
          onJumpToCourses={() => scrollToElement('courses')}
          onJumpToRegister={() => scrollToElement('register')}
        />

        <RegistrationSection
          selectedCourseId={selectedRegisterCourse}
          pricingStatus={pricingStatus}
          bankInfo={bankInfo}
          onSelectedCourseChange={setSelectedRegisterCourse}
          onPricingStatusChange={setPricingStatus}
        />
      </main>

      <Footer />
    </div>
  );
}
