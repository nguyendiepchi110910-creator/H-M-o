import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  History,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {
  COURSES,
  DEFAULT_PRICING_STATUS,
  formatVnd,
  type EarlyBirdPricingStatus,
} from '../utils/courses';
import {
  REGISTRATION_STATUSES,
  buildRegistrationsCsv,
  countRegistrationsByStatus,
  filterRegistrations,
  type AuditLogRecord,
  type RegistrationRecord,
  type RegistrationStatus,
} from '../utils/registration';
import { BrandLogoMark } from './Header';

const ADMIN_TOKEN_KEY = 'tic_labs_admin_token';
const ADMIN_ACCOUNT_KEY = 'tic_labs_admin_account';

interface AdminDashboardProps {
  onBackHome: () => void;
}

type AdminAction = 'confirm_paid' | 'reject_proof' | 'request_info' | 'cancel';

export function AdminDashboard({ onBackHome }: AdminDashboardProps) {
  const [token, setToken] = useState<string>(() => sessionStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [adminAccount, setAdminAccount] = useState<string>(
    () => sessionStorage.getItem(ADMIN_ACCOUNT_KEY) || 'Admin',
  );
  const [loginAccountInput, setLoginAccountInput] = useState('Admin');
  const [accessCode, setAccessCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [pricingStatus, setPricingStatus] = useState<EarlyBirdPricingStatus>(DEFAULT_PRICING_STATUS);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  // View & Filters
  const [mainView, setMainView] = useState<'registrations' | 'audit'>('registrations');
  const [statusFilter, setStatusFilter] = useState<'all' | RegistrationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');

  // Detail modal + proof image blob + confirm dialog
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminActionNote, setAdminActionNote] = useState('');
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');
  const [loadingProof, setLoadingProof] = useState(false);
  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false);
  const [actionInFlight, setActionInFlight] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const selectedRecord = useMemo(
    () => registrations.find((r) => r.id === selectedId) ?? null,
    [registrations, selectedId],
  );

  const fetchRegistrations = useCallback(
    async (activeToken: string, silent = false) => {
      if (!silent) {
        setLoading(true);
        setErrorNotice('');
      }
      try {
        const res = await fetch('/api/admin/registrations', {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (res.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          sessionStorage.removeItem(ADMIN_ACCOUNT_KEY);
          setToken('');
          setAuthError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return;
        }
        if (!res.ok) throw new Error('Không thể tải dữ liệu');
        const data = await res.json();
        setRegistrations(Array.isArray(data.registrations) ? data.registrations : []);
        setAuditLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
        if (data.pricingStatus) setPricingStatus(data.pricingStatus);
        if (data.adminAccount) setAdminAccount(data.adminAccount);
      } catch {
        if (!silent) setErrorNotice('Không thể tải danh sách đăng ký từ máy chủ.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!token) return;
    fetchRegistrations(token);
    const interval = window.setInterval(() => {
      fetchRegistrations(token, true);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [token, fetchRegistrations]);

  // Securely load private payment proof image for selected registration
  useEffect(() => {
    let activeUrl = '';
    setProofPreviewUrl('');

    if (!token || !selectedRecord || !selectedRecord.hasProof) {
      return;
    }

    setLoadingProof(true);
    fetch(`/api/admin/registrations/${selectedRecord.id}/proof`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const blob = await res.blob();
        activeUrl = URL.createObjectURL(blob);
        setProofPreviewUrl(activeUrl);
      })
      .catch(() => undefined)
      .finally(() => setLoadingProof(false));

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [token, selectedRecord?.id, selectedRecord?.hasProof, selectedRecord?.proofSubmittedAt]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError('');
    if (!accessCode.trim()) {
      setAuthError('Vui lòng nhập mã truy cập Admin.');
      return;
    }

    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminAccount: loginAccountInput.trim() || 'Admin',
          accessCode: accessCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Mã truy cập không đúng.');
        return;
      }
      sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      sessionStorage.setItem(ADMIN_ACCOUNT_KEY, data.adminAccount || 'Admin');
      setAdminAccount(data.adminAccount || 'Admin');
      setToken(data.token);
      setAccessCode('');
    } catch {
      setAuthError('Lỗi kết nối máy chủ.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_ACCOUNT_KEY);
    setToken('');
    setRegistrations([]);
    setAuditLogs([]);
    setSelectedId(null);
  };

  const handleAdminAction = async (id: string, action: AdminAction) => {
    setActionInFlight(true);
    setErrorNotice('');
    setNotice('');
    try {
      const res = await fetch(`/api/admin/registrations/${id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          adminNote: adminActionNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorNotice(data.error || 'Không thể thực hiện thao tác.');
        setConfirmPaidOpen(false);
        return;
      }

      setRegistrations((prev) => prev.map((r) => (r.id === id ? data.registration : r)));
      if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      if (data.pricingStatus) setPricingStatus(data.pricingStatus);
      setConfirmPaidOpen(false);
      setAdminActionNote('');

      const nextPricing: EarlyBirdPricingStatus | undefined = data.pricingStatus;
      if (action === 'confirm_paid' && nextPricing && !nextPricing.earlyBirdActive) {
        setNotice(
          `Đã xác nhận thanh toán cho ${data.registration.fullname}. Hệ thống đã đạt ${nextPricing.confirmedCount}/${nextPricing.limit} suất — Early Bird tự động chuyển sang ĐÃ HẾT SUẤT.`,
        );
      } else {
        setNotice(`Đã cập nhật hồ sơ ${data.registration.code} (${data.registration.status}).`);
      }
    } catch {
      setErrorNotice('Lỗi kết nối máy chủ khi cập nhật hồ sơ.');
      setConfirmPaidOpen(false);
    } finally {
      setActionInFlight(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
      if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      if (data.pricingStatus) setPricingStatus(data.pricingStatus);
      if (selectedId === id) setSelectedId(null);
      setPendingDeleteId(null);
      setNotice('Đã xóa bản ghi đăng ký.');
    } catch {
      setErrorNotice('Không thể xóa bản ghi.');
    }
  };

  const handleDownloadCsv = () => {
    if (registrations.length === 0) {
      setNotice('Chưa có lượt đăng ký nào để xuất CSV.');
      return;
    }
    const csv = buildRegistrationsCsv(registrations);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tic-labs-dang-ky-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`Đã xuất ${registrations.length} hồ sơ đăng ký ra tệp CSV.`);
  };

  const statusCounts = useMemo(() => countRegistrationsByStatus(registrations), [registrations]);

  const filtered = useMemo(
    () => filterRegistrations(registrations, searchQuery, courseFilter, statusFilter),
    [registrations, searchQuery, courseFilter, statusFilter],
  );

  const selectedRecordLogs = useMemo(
    () => (selectedRecord ? auditLogs.filter((l) => l.registrationId === selectedRecord.id) : []),
    [auditLogs, selectedRecord],
  );

  const progressPercent = Math.min(
    100,
    Math.round((pricingStatus.confirmedCount / pricingStatus.limit) * 100),
  );

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col justify-between bg-[#f7faff] px-5 py-10">
        <div className="mx-auto w-full max-w-[420px]">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-bold text-[#123b75] hover:text-[#2162c5]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Quay lại trang chủ TIC Labs</span>
          </button>

          <form
            onSubmit={handleLogin}
            className="mt-5 rounded-lg border border-[#dbe5f2] bg-white p-6"
          >
            <div className="flex items-center gap-2.5 text-[#2162c5]">
              <BrandLogoMark />
              <div>
                <div className="text-[19px] font-bold text-[#2162c5]">TIC Labs</div>
                <div className="text-[12px] font-bold text-[#526277]">
                  Quản lý đăng ký & xác nhận thanh toán Early Bird
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3.5">
              <div>
                <label htmlFor="admin-account" className="block text-[12px] font-bold text-[#123b75]">
                  Tài khoản Admin (ghi nhật ký thao tác)
                </label>
                <div className="relative mt-1">
                  <User
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-account"
                    type="text"
                    value={loginAccountInput}
                    onChange={(e) => setLoginAccountInput(e.target.value)}
                    placeholder="Ví dụ: admin@ticlabs.vn"
                    className="w-full rounded-md border border-[#dbe5f2] bg-white py-2 pr-3 pl-9 text-[13px] text-[#202b3c] outline-none focus:border-[#2162c5]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-code" className="block text-[12px] font-bold text-[#123b75]">
                  Mã truy cập Admin
                </label>
                <div className="relative mt-1">
                  <Lock
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-code"
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Nhập mã truy cập quản trị"
                    className="w-full rounded-md border border-[#dbe5f2] bg-white py-2 pr-3 pl-9 text-[13px] text-[#202b3c] outline-none focus:border-[#2162c5]"
                  />
                </div>
                {authError && (
                  <span role="alert" className="mt-1 block text-[12px] font-bold text-[#dc2626]">
                    {authError}
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="mt-5 inline-flex min-h-[42px] w-full cursor-pointer items-center justify-center rounded-md bg-[#2162c5] px-5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#123b75] disabled:opacity-60"
            >
              {loggingIn ? 'Đang xác thực...' : 'Đăng nhập Admin'}
            </button>
          </form>
        </div>

        <footer className="mx-auto mt-8 text-center text-[12px] text-[#526277]">
          © {new Date().getFullYear()} TIC Labs · Trang quản trị nội bộ
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faff] text-[#202b3c]">
      <header className="border-b border-[#dbe5f2] bg-white">
        <div className="mx-auto flex h-[64px] max-w-[1160px] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-2.5">
            <BrandLogoMark />
            <div>
              <div className="text-[18px] font-bold text-[#2162c5]">TIC Labs Admin</div>
              <div className="text-[12px] text-[#526277]">
                Đang đăng nhập: <strong>{adminAccount}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-md border border-[#dbe5f2] bg-white px-3.5 py-1.5 text-[13px] font-bold text-[#123b75] hover:bg-[#f8fbff]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Trang công khai</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-md border border-[#dbe5f2] bg-white px-3.5 py-1.5 text-[13px] font-bold text-[#526277] hover:border-[#dc2626] hover:text-[#dc2626]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1160px] space-y-5 px-5 py-6">
        {/* Early Bird Progress Area (Section 6D) */}
        <section className="rounded-lg border border-[#dbe5f2] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-wide text-[#2162c5]">
                Tiến trình Early Bird (Chỉ tính hồ sơ đã xác nhận thanh toán)
              </div>
              <div className="mt-1 text-[16px] font-bold text-[#123b75]">
                {pricingStatus.earlyBirdActive
                  ? `${pricingStatus.confirmedCount}/${pricingStatus.limit} suất đã xác nhận thanh toán, còn ${pricingStatus.remainingSlots} suất`
                  : `${pricingStatus.confirmedCount}/${pricingStatus.limit} suất — ĐÃ HẾT SUẤT`}
              </div>
            </div>
            <div
              className={`rounded-md px-3 py-1.5 text-[12px] font-bold ${
                pricingStatus.earlyBirdActive
                  ? 'bg-[#eaf2ff] text-[#2162c5]'
                  : 'bg-[#fef2f2] text-[#dc2626]'
              }`}
            >
              {pricingStatus.earlyBirdActive ? 'ĐANG MỞ EARLY BIRD' : 'ĐÃ HẾT SUẤT'}
            </div>
          </div>

          {/* Progress Bar */}
          <div
            className="mt-3 h-3 w-full overflow-hidden rounded-md border border-[#dbe5f2] bg-[#f8fbff]"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tiến trình sử dụng suất Early Bird"
          >
            <div
              className={`h-full transition-all duration-300 ${
                pricingStatus.earlyBirdActive ? 'bg-[#2162c5]' : 'bg-[#dc2626]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 4 Required KPI figures */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-md border border-[#e5edf8] bg-[#f8fbff] p-3">
              <div className="text-[12px] font-bold text-[#526277]">Tổng số suất</div>
              <div className="font-mono-num mt-0.5 text-[24px] font-bold text-[#123b75]">
                {pricingStatus.limit}
              </div>
            </div>
            <div className="rounded-md border border-[#e5edf8] bg-[#f8fbff] p-3">
              <div className="text-[12px] font-bold text-[#526277]">Đã xác nhận thanh toán</div>
              <div className="font-mono-num mt-0.5 text-[24px] font-bold text-[#176b42]">
                {pricingStatus.confirmedCount}
              </div>
            </div>
            <div className="rounded-md border border-[#e5edf8] bg-[#f8fbff] p-3">
              <div className="text-[12px] font-bold text-[#526277]">Số suất còn lại</div>
              <div
                className={`font-mono-num mt-0.5 text-[24px] font-bold ${
                  pricingStatus.remainingSlots > 0 ? 'text-[#2162c5]' : 'text-[#dc2626]'
                }`}
              >
                {pricingStatus.remainingSlots}
              </div>
            </div>
            <div className="rounded-md border border-[#e5edf8] bg-[#f8fbff] p-3">
              <div className="text-[12px] font-bold text-[#526277]">Đang chờ xác nhận</div>
              <div className="font-mono-num mt-0.5 text-[24px] font-bold text-[#b45309]">
                {pricingStatus.pendingConfirmationCount}
              </div>
              <div className="text-[11px] text-[#526277]">Không cộng vào {pricingStatus.limit} suất</div>
            </div>
          </div>
        </section>

        {/* Main Workspace Card */}
        <section className="rounded-lg border border-[#dbe5f2] bg-white p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMainView('registrations')}
                className={`cursor-pointer rounded-md px-3.5 py-2 text-[13px] font-bold transition-colors ${
                  mainView === 'registrations'
                    ? 'bg-[#2162c5] text-white'
                    : 'border border-[#dbe5f2] bg-[#f8fbff] text-[#123b75]'
                }`}
              >
                Quản lý đăng ký ({registrations.length})
              </button>
              <button
                type="button"
                onClick={() => setMainView('audit')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-bold transition-colors ${
                  mainView === 'audit'
                    ? 'bg-[#2162c5] text-white'
                    : 'border border-[#dbe5f2] bg-[#f8fbff] text-[#123b75]'
                }`}
              >
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Lịch sử thao tác ({auditLogs.length})</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fetchRegistrations(token)}
                className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-md border border-[#dbe5f2] bg-white px-3.5 py-1.5 text-[13px] font-bold text-[#123b75] hover:bg-[#f8fbff]"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Làm mới</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-md bg-[#2162c5] px-3.5 py-1.5 text-[13px] font-bold text-white hover:bg-[#123b75]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tải danh sách CSV</span>
              </button>
            </div>
          </div>

          {notice && (
            <div className="mt-3 rounded-md border border-[#cfe0fa] bg-[#eaf2ff] px-3.5 py-2 text-[12px] font-bold text-[#123b75]">
              {notice}
            </div>
          )}
          {errorNotice && (
            <div className="mt-3 rounded-md border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2 text-[12px] font-bold text-[#991b1b]">
              {errorNotice}
            </div>
          )}

          {mainView === 'registrations' ? (
            <>
              {/* 6 Required Status Tabs */}
              <div className="mt-4 flex flex-wrap gap-1.5 border-b border-[#e5edf8] pb-3" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-bold transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-[#123b75] text-white'
                      : 'border border-[#dbe5f2] bg-[#f8fbff] text-[#123b75] hover:bg-[#eaf2ff]'
                  }`}
                >
                  Tất cả đăng ký ({statusCounts.all})
                </button>
                {REGISTRATION_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === st}
                    onClick={() => setStatusFilter(st)}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-bold transition-colors ${
                      statusFilter === st
                        ? 'bg-[#2162c5] text-white'
                        : 'border border-[#dbe5f2] bg-[#f8fbff] text-[#123b75] hover:bg-[#eaf2ff]'
                    }`}
                  >
                    {st} ({statusCounts[st]})
                  </button>
                ))}
              </div>

              {/* Search & Course Filter */}
              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Tìm kiếm học viên"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo họ tên, SĐT, email, mã đăng ký..."
                    className="w-full rounded-md border border-[#dbe5f2] bg-[#f8fbff] py-2 pr-3 pl-9 text-[13px] text-[#202b3c] outline-none focus:border-[#2162c5] focus:bg-white"
                  />
                </div>
                <select
                  aria-label="Lọc theo khóa học"
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="rounded-md border border-[#dbe5f2] bg-[#f8fbff] px-3 py-2 text-[13px] font-bold text-[#123b75] outline-none focus:border-[#2162c5] focus:bg-white"
                >
                  <option value="all">Tất cả khóa học</option>
                  {COURSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortName}
                    </option>
                  ))}
                  <option value="consult">Muốn được tư vấn thêm</option>
                </select>
              </div>

              {/* Registrations Table */}
              <div className="mt-4 overflow-x-auto rounded-md border border-[#dbe5f2]">
                <table className="w-full min-w-[840px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#dbe5f2] bg-[#f8fbff] text-[#123b75]">
                      <th className="whitespace-nowrap px-3.5 py-2.5 font-bold">Mã</th>
                      <th className="whitespace-nowrap px-3.5 py-2.5 font-bold">Học viên</th>
                      <th className="whitespace-nowrap px-3.5 py-2.5 font-bold">Khóa học</th>
                      <th className="whitespace-nowrap px-3.5 py-2.5 font-bold">Thanh toán</th>
                      <th className="whitespace-nowrap px-3.5 py-2.5 font-bold">Thời gian</th>
                      <th className="whitespace-nowrap px-3.5 py-2.5 font-bold">Trạng thái</th>
                      <th className="whitespace-nowrap px-3.5 py-2.5 text-right font-bold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5edf8]">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-[#526277]">
                          Đang tải dữ liệu đăng ký...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-[#64748b]">
                          Không có hồ sơ nào trong mục này.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => {
                            setSelectedId(row.id);
                            setAdminActionNote(row.adminNote || '');
                            setConfirmPaidOpen(false);
                          }}
                          className="cursor-pointer hover:bg-[#f8fbff]"
                        >
                          <td className="font-mono-num whitespace-nowrap px-3.5 py-2.5 font-bold text-[#2162c5]">
                            {row.code}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="font-bold text-[#123b75]">{row.fullname}</div>
                            <div className="font-mono-num whitespace-nowrap text-[12px] text-[#526277]">
                              {row.phone}
                              {row.email ? ` · ${row.email}` : ''}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="font-bold text-[#202b3c]">{row.courseLabel}</div>
                            {row.priceQuoted > 0 && (
                              <div className="font-mono-num text-[12px] font-bold text-[#2162c5]">
                                {formatVnd(row.priceQuoted)} (
                                {row.pricingTier === 'early-bird' ? 'Early Bird' : 'Giá gốc'})
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-[12px]">
                            {row.hasProof ? (
                              <span className="font-bold text-[#2162c5]">Có ảnh minh chứng</span>
                            ) : row.paymentInfo ? (
                              <span className="text-[#123b75]">Có thông tin CK</span>
                            ) : (
                              <span className="text-[#64748b]">Chưa gửi</span>
                            )}
                          </td>
                          <td className="font-mono-num whitespace-nowrap px-3.5 py-2.5 text-[12px] text-[#526277]">
                            {row.createdAt}
                          </td>
                          <td className="whitespace-nowrap px-3.5 py-2.5">
                            <span
                              className={`text-[12px] font-bold ${
                                row.status === 'Đã thanh toán'
                                  ? 'text-[#176b42]'
                                  : row.status === 'Chờ xác nhận'
                                    ? 'text-[#b45309]'
                                    : row.status === 'Thanh toán không hợp lệ' || row.status === 'Đã hủy'
                                      ? 'text-[#dc2626]'
                                      : 'text-[#123b75]'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td
                            className="whitespace-nowrap px-3.5 py-2.5 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedId(row.id);
                                  setAdminActionNote(row.adminNote || '');
                                  setConfirmPaidOpen(false);
                                }}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#dbe5f2] bg-white px-2.5 py-1 text-[12px] font-bold text-[#123b75] hover:bg-[#eaf2ff]"
                              >
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Chi tiết</span>
                              </button>

                              {pendingDeleteId === row.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(row.id)}
                                    className="cursor-pointer rounded-md bg-[#dc2626] px-2 py-1 text-[11px] font-bold text-white"
                                  >
                                    Xóa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteId(null)}
                                    className="cursor-pointer rounded-md border border-[#dbe5f2] px-2 py-1 text-[11px] text-[#526277]"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`Xóa đăng ký của ${row.fullname}`}
                                  onClick={() => setPendingDeleteId(row.id)}
                                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-[#64748b] hover:bg-[#fef2f2] hover:text-[#dc2626]"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Global Admin Audit Log View */
            <div className="mt-4 overflow-x-auto rounded-md border border-[#dbe5f2]">
              <table className="w-full min-w-[780px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#dbe5f2] bg-[#f8fbff] text-[#123b75]">
                    <th className="px-3.5 py-2.5 font-bold">Thời gian</th>
                    <th className="px-3.5 py-2.5 font-bold">Tài khoản Admin</th>
                    <th className="px-3.5 py-2.5 font-bold">Mã hồ sơ</th>
                    <th className="px-3.5 py-2.5 font-bold">Hành động</th>
                    <th className="px-3.5 py-2.5 font-bold">Chuyển trạng thái</th>
                    <th className="px-3.5 py-2.5 font-bold">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5edf8]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#64748b]">
                        Chưa có thao tác quản trị nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f8fbff]">
                        <td className="font-mono-num whitespace-nowrap px-3.5 py-2.5 text-[12px] text-[#526277]">
                          {log.createdAt}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-[#123b75]">{log.adminAccount}</td>
                        <td className="font-mono-num whitespace-nowrap px-3.5 py-2.5 font-bold text-[#2162c5]">
                          {log.registrationCode}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-[#202b3c]">{log.action}</td>
                        <td className="px-3.5 py-2.5 text-[12px] text-[#475569]">
                          {log.fromStatus} → <strong>{log.toStatus}</strong>
                        </td>
                        <td className="px-3.5 py-2.5 text-[12px] text-[#526277]">{log.detail || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Profile Detail Modal (Section 6C) */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-lg border border-[#dbe5f2] bg-white p-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#e5edf8] pb-3">
              <div>
                <div className="font-mono-num text-[12px] font-bold text-[#2162c5]">
                  Hồ sơ {selectedRecord.code} · {selectedRecord.status}
                </div>
                <h2 id="detail-modal-title" className="mt-0.5 text-[20px] font-bold text-[#123b75]">
                  {selectedRecord.fullname}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Đóng chi tiết hồ sơ"
                onClick={() => {
                  setSelectedId(null);
                  setConfirmPaidOpen(false);
                }}
                className="cursor-pointer rounded-md border border-[#dbe5f2] p-1.5 text-[#526277] hover:bg-[#f8fbff]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Required Fields (6C) */}
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-md border border-[#e5edf8] bg-[#f8fbff] p-4 text-[13px] sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-bold text-[#526277]">Họ và tên</div>
                <div className="font-bold text-[#123b75]">{selectedRecord.fullname}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#526277]">Số điện thoại</div>
                <div className="font-mono-num font-bold text-[#123b75]">{selectedRecord.phone}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#526277]">Email</div>
                <div className="text-[#202b3c]">{selectedRecord.email || 'Chưa cung cấp'}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#526277]">Khóa học đã đăng ký</div>
                <div className="font-bold text-[#123b75]">
                  {selectedRecord.courseLabel}
                  {selectedRecord.priceQuoted > 0 && ` · ${formatVnd(selectedRecord.priceQuoted)}`}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#526277]">Thời gian gửi form</div>
                <div className="font-mono-num text-[#202b3c]">{selectedRecord.createdAt}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#526277]">Trạng thái hiện tại</div>
                <div className="font-bold text-[#2162c5]">{selectedRecord.status}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#526277]">Thông tin thanh toán</div>
                <div className="text-[#202b3c]">{selectedRecord.paymentInfo || 'Chưa có thông tin chuyển khoản'}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#526277]">Thời gian Admin xác nhận thanh toán</div>
                <div className="font-mono-num text-[#176b42]">
                  {selectedRecord.confirmedAt
                    ? `${selectedRecord.confirmedAt} (${selectedRecord.confirmedBy || 'Admin'})`
                    : 'Chưa xác nhận'}
                </div>
              </div>
            </div>

            {/* Proof Image */}
            <div className="mt-4">
              <div className="text-[12px] font-bold text-[#123b75]">
                Ảnh minh chứng chuyển khoản {selectedRecord.proofSubmittedAt ? `(gửi lúc ${selectedRecord.proofSubmittedAt})` : ''}
              </div>
              {selectedRecord.hasProof ? (
                <div className="mt-2 rounded-md border border-[#dbe5f2] bg-[#f8fbff] p-3">
                  {loadingProof ? (
                    <div className="text-[12px] text-[#526277]">Đang tải ảnh minh chứng...</div>
                  ) : proofPreviewUrl ? (
                    <img
                      src={proofPreviewUrl}
                      alt={`Ảnh minh chứng thanh toán của ${selectedRecord.fullname}`}
                      className="max-h-[300px] w-auto rounded border border-[#dbe5f2] object-contain"
                    />
                  ) : (
                    <div className="text-[12px] text-[#dc2626]">Không thể hiển thị ảnh minh chứng.</div>
                  )}
                </div>
              ) : (
                <div className="mt-1.5 rounded-md border border-[#e5edf8] bg-[#f8fbff] px-3 py-2 text-[12px] text-[#64748b]">
                  Học viên chưa tải lên ảnh minh chứng chuyển khoản.
                </div>
              )}
            </div>

            {/* Admin Note Input */}
            <div className="mt-4">
              <label htmlFor="admin-action-note" className="block text-[12px] font-bold text-[#123b75]">
                Ghi chú xử lý / Lý do phản hồi cho học viên (tùy chọn)
              </label>
              <input
                id="admin-action-note"
                type="text"
                value={adminActionNote}
                onChange={(e) => setAdminActionNote(e.target.value)}
                placeholder="Ví dụ: Đã nhận đủ học phí / Vui lòng gửi rõ ảnh biên lai..."
                className="mt-1 w-full rounded-md border border-[#dbe5f2] px-3 py-2 text-[13px] outline-none focus:border-[#2162c5]"
              />
            </div>

            {/* 4 Required Action Buttons */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e5edf8] pt-4">
              <button
                type="button"
                disabled={
                  actionInFlight ||
                  selectedRecord.status === 'Đã thanh toán' ||
                  selectedRecord.status === 'Đã hủy' ||
                  (selectedRecord.pricingTier === 'early-bird' && !pricingStatus.earlyBirdActive)
                }
                onClick={() => setConfirmPaidOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#176b42] px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#115232] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>Xác nhận đã thanh toán</span>
              </button>

              <button
                type="button"
                disabled={actionInFlight}
                onClick={() => handleAdminAction(selectedRecord.id, 'reject_proof')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#dc2626] bg-white px-3.5 py-2 text-[13px] font-bold text-[#dc2626] hover:bg-[#fef2f2] disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                <span>Từ chối minh chứng thanh toán</span>
              </button>

              <button
                type="button"
                disabled={actionInFlight}
                onClick={() => handleAdminAction(selectedRecord.id, 'request_info')}
                className="cursor-pointer rounded-md border border-[#dbe5f2] bg-[#f8fbff] px-3.5 py-2 text-[13px] font-bold text-[#123b75] hover:bg-[#eaf2ff] disabled:opacity-50"
              >
                Đánh dấu chờ bổ sung thông tin
              </button>

              <button
                type="button"
                disabled={actionInFlight}
                onClick={() => handleAdminAction(selectedRecord.id, 'cancel')}
                className="cursor-pointer rounded-md border border-[#dbe5f2] bg-white px-3.5 py-2 text-[13px] font-bold text-[#526277] hover:border-[#dc2626] hover:text-[#dc2626] disabled:opacity-50"
              >
                Hủy đăng ký
              </button>
            </div>

            {/* Confirmation Dialog for "Xác nhận đã thanh toán" (Section 6C) */}
            {confirmPaidOpen && (
              <div
                className="mt-4 rounded-md border-2 border-[#176b42] bg-[#f0fdf4] p-4"
                role="alertdialog"
                aria-labelledby="confirm-paid-heading"
              >
                <h3 id="confirm-paid-heading" className="text-[14px] font-bold text-[#14532d]">
                  Xác nhận đã thanh toán cho {selectedRecord.fullname} ({selectedRecord.code})?
                </h3>
                <p className="mt-1 text-[12px] text-[#166534]">
                  Thao tác này sẽ ghi nhận 1 suất Early Bird đã sử dụng ({pricingStatus.confirmedCount + (selectedRecord.pricingTier === 'early-bird' ? 1 : 0)}/{pricingStatus.limit}) và tự động cập nhật trạng thái học viên thành &ldquo;Đăng ký thành công&rdquo;.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionInFlight}
                    onClick={() => handleAdminAction(selectedRecord.id, 'confirm_paid')}
                    className="cursor-pointer rounded-md bg-[#176b42] px-4 py-1.5 text-[12px] font-bold text-white hover:bg-[#115232] disabled:opacity-60"
                  >
                    {actionInFlight ? 'Đang xác nhận...' : 'Đồng ý xác nhận thanh toán'}
                  </button>
                  <button
                    type="button"
                    disabled={actionInFlight}
                    onClick={() => setConfirmPaidOpen(false)}
                    className="cursor-pointer rounded-md border border-[#dbe5f2] bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#526277]"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            )}

            {/* Per-record Audit Trail */}
            {selectedRecordLogs.length > 0 && (
              <div className="mt-4 border-t border-[#e5edf8] pt-3">
                <div className="text-[12px] font-bold text-[#123b75]">Lịch sử thao tác hồ sơ này</div>
                <ul className="mt-2 space-y-1.5 text-[12px] text-[#475569]">
                  {selectedRecordLogs.map((l) => (
                    <li key={l.id} className="rounded bg-[#f8fbff] px-2.5 py-1.5">
                      <span className="font-mono-num text-[#526277]">{l.createdAt}</span> ·{' '}
                      <strong className="text-[#123b75]">{l.adminAccount}</strong>: {l.action} ({l.fromStatus} →{' '}
                      {l.toStatus})
                      {l.detail ? ` — "${l.detail}"` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
