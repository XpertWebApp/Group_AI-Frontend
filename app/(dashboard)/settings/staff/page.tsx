'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Search, MoreVertical, Info, X, Copy, Check,
  Eye, EyeOff, AlertTriangle, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { staffApi, type StaffMember } from '@/lib/api/staff';
import { AddStaffModal } from '@/components/forms/AddStaffModal';
import toast from 'react-hot-toast';

const PAGE_LIMIT = 20;

/** Get current user ID from localStorage JWT (simple decode) */
function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.id || null;
  } catch {
    return null;
  }
}

export default function StaffManagementPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const currentUserId = useRef(getCurrentUserId());

  // ── List state ──
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Modals ──
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<StaffMember | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // ── Credentials modal (shared by Add Staff + Reset Password) ──
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [showCredPassword, setShowCredPassword] = useState(false);
  const [credCopied, setCredCopied] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  // ── Debounce search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch staff list ──
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        limit: PAGE_LIMIT,
      });
      setStaff(res.data);
      setTotal(res.total);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ── Close dropdown on outside click or scroll ──
  useEffect(() => {
    if (!menuOpenId) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
        setMenuPos(null);
      }
    };
    const closeOnScroll = () => { setMenuOpenId(null); setMenuPos(null); };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [menuOpenId]);

  // ── Helpers ──
  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // ── Actions menu visibility rules ──
  const canBlockUnblock = (m: StaffMember) => m.role !== 'Admin' && m.id !== currentUserId.current;
  const canDelete = (m: StaffMember) => m.role !== 'Admin' && m.id !== currentUserId.current;

  // ── Add Staff ──
  const handleAddStaff = async (payload: { fullName: string; email: string }) => {
    setAddLoading(true);
    try {
      const result = await staffApi.create(payload);
      setAddModalOpen(false);
      toast.success(t.toasts.staffAdded);
      setCredentials({ email: result.email, password: result.oneTimePassword });
      setShowCredPassword(false);
      setCredCopied(false);
      fetchStaff(); // refresh list
    } catch {
      // handled by api client
    } finally {
      setAddLoading(false);
    }
  };

  // ── Block / Unblock ──
  const handleBlockToggle = async () => {
    if (!blockTarget) return;
    setBlockLoading(true);
    const action = blockTarget.status === 'active' ? 'block' : 'unblock';
    try {
      const updated = await staffApi.blockUnblock(blockTarget.id, action);
      setStaff((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      toast.success(action === 'block' ? t.toasts.staffBlocked : t.toasts.staffUnblocked);
      setBlockTarget(null);
    } catch {
      // handled by api client
    } finally {
      setBlockLoading(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await staffApi.remove(deleteTarget.id);
      setStaff((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setTotal((prev) => prev - 1);
      toast.success(t.toasts.staffDeleted);
      setDeleteTarget(null);
    } catch {
      // handled by api client
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Reset Password ──
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      const result = await staffApi.resetPassword(resetTarget.id);
      setResetTarget(null);
      setCredentials({ email: result.email, password: result.oneTimePassword });
      setShowCredPassword(false);
      setCredCopied(false);
    } catch {
      // handled by api client
    } finally {
      setResetLoading(false);
    }
  };

  // ── Credentials modal helpers ──
  const closeCredentials = () => {
    setCredentials(null);
    fetchStaff(); // refresh on close
  };

  const handleCopyCredentials = async () => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nPassword: ${credentials.password}`;
    await navigator.clipboard.writeText(text);
    setCredCopied(true);
    toast.success(t.staffManagement.credentialsCopied);
    setTimeout(() => setCredCopied(false), 2000);
  };

  const handleDownloadCredentials = () => {
    if (!credentials) return;
    const text = `SETT Staff Credentials\n\nEmail: ${credentials.email}\nOne-Time Password: ${credentials.password}\n\nPlease change your password after first login.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credentials-${credentials.email.split('@')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Button animation classes (reusable) ──
  const btnAnim = 'transition-transform duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-[3px] active:scale-[0.92] active:duration-[80ms]';
  const grayBtnCls = `flex-1 h-[44px] rounded-[14px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[16px] font-semibold text-sett-text-primary disabled:opacity-50 ${btnAnim}`;
  const redBtnCls = `flex-1 h-[44px] rounded-[14px] bg-[#FB2C36] shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)] font-montserrat text-[16px] font-semibold text-white disabled:opacity-50 ${btnAnim}`;

  return (
    <>
      <Header title={t.settings.title} />
      <div className="p-4 md:p-6">
        {/* Back + Title */}
        <div className="flex items-center gap-3.5 mb-6">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="flex items-center gap-1.5 font-montserrat text-[14px] font-medium text-sett-text-secondary hover:text-sett-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.staffManagement.back}
          </button>
          <h2 className="font-montserrat text-[22px] font-semibold leading-none text-sett-text-primary">
            {t.staffManagement.title}
          </h2>
        </div>

        {/* Table Card */}
        <div className="rounded-[14px] border border-sett-border-light bg-white">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="relative w-full max-w-[600px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sett-text-accent" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.staffManagement.searchPlaceholder}
                className="w-full h-[41px] pl-10 pr-3 rounded-[14px] border border-sett-border-light font-montserrat text-[14px] text-sett-text-primary placeholder:text-sett-text-accent focus:outline-none focus:border-sett-primary focus:ring-1 focus:ring-sett-primary"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Select
                variant="filter"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                placeholder={t.staffManagement.allStatus}
                options={[
                  { value: 'active', label: t.staffManagement.active },
                  { value: 'blocked', label: t.staffManagement.blocked },
                ]}
                className="w-[148px]"
              />
              <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
                {t.staffManagement.addStaff}
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y border-sett-border-light">
                  {[t.staffManagement.name, t.staffManagement.email, t.staffManagement.role, t.staffManagement.status, t.staffManagement.lastLogin, t.staffManagement.createdDate, t.staffManagement.actions].map((h) => (
                    <th key={h} className="text-left px-5 py-4 font-montserrat text-[12px] font-semibold tracking-wider text-sett-text-accent uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><span className="inline-block w-5 h-5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" /></td></tr>
                ) : staff.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 font-montserrat text-[14px] text-sett-text-secondary">{t.staffManagement.noStaff}</td></tr>
                ) : (
                  staff.map((member) => {
                    const showBlock = canBlockUnblock(member);
                    const showDelete = canDelete(member);
                    return (
                      <tr key={member.id} className="border-b border-sett-border-light bg-white hover:bg-[#F7F7F7] transition-[background-color] duration-0">
                        <td className="px-5 py-5 font-montserrat text-[14px] font-medium text-[#1D1D1D]">{member.fullName || member.email}</td>
                        <td className="px-5 py-5 font-montserrat text-[14px] font-medium text-[#1D1D1D]">{member.email}</td>
                        <td className="px-5 py-5 font-montserrat text-[14px] font-medium text-[#1D1D1D]">{member.role}</td>
                        <td className="px-5 py-5 font-montserrat text-[14px] font-medium">
                          <span className={member.status === 'active' ? 'text-[#667F00]' : 'text-[#FB2C36]'}>
                            {member.status === 'active' ? t.staffManagement.active : t.staffManagement.blocked}
                          </span>
                        </td>
                        <td className="px-5 py-5 font-montserrat text-[14px] font-medium text-[#1D1D1D]">{formatDateTime(member.lastLoginAt)}</td>
                        <td className="px-5 py-5 font-montserrat text-[14px] font-normal text-[#1D1D1D]">{formatDate(member.createdAt)}</td>
                        <td className="px-5 py-5">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (menuOpenId === member.id) {
                                setMenuOpenId(null);
                                setMenuPos(null);
                              } else {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                setMenuOpenId(member.id);
                              }
                            }}
                            className="p-1 rounded-md hover:bg-sett-border/50 transition-colors text-sett-text-secondary"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-sett-border-light">
              <span className="font-montserrat text-[13px] text-sett-text-secondary">{total} {total === 1 ? 'result' : 'results'}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-md hover:bg-sett-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-montserrat text-[13px] text-sett-text-primary font-medium">{page} / {totalPages}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-md hover:bg-sett-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed Actions Dropdown ── */}
      {menuOpenId && menuPos && (() => {
        const member = staff.find((s) => s.id === menuOpenId);
        if (!member) return null;
        const showBlock = canBlockUnblock(member);
        const showDel = canDelete(member);
        return (
          <div
            ref={menuRef}
            className="fixed z-50 w-[160px] rounded-[10px] border border-sett-border-light bg-white shadow-[0_4px_12px_0_rgba(0,0,0,0.12)] py-1"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <button type="button" onClick={() => { setMenuOpenId(null); setMenuPos(null); setResetTarget(member); }} className="w-full text-left px-4 py-2.5 font-montserrat text-[14px] font-medium text-sett-text-primary hover:bg-[#F7F7F7] transition-colors">
              {t.staffManagement.resetPasswordAction}
            </button>
            {showBlock && (
              <button type="button" onClick={() => { setMenuOpenId(null); setMenuPos(null); setBlockTarget(member); }} className="w-full text-left px-4 py-2.5 font-montserrat text-[14px] font-medium text-[#FB2C36] hover:bg-[#FFF5F5] transition-colors">
                {member.status === 'active' ? t.staffManagement.blockAction : t.staffManagement.unblockAction}
              </button>
            )}
            {showDel && (
              <button type="button" onClick={() => { setMenuOpenId(null); setMenuPos(null); setDeleteTarget(member); }} className="w-full text-left px-4 py-2.5 font-montserrat text-[14px] font-medium text-[#FB2C36] hover:bg-[#FFF5F5] transition-colors">
                {t.staffManagement.deleteAction}
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Add Staff Modal ── */}
      <AddStaffModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAddStaff} isLoading={addLoading} />

      {/* ── Block/Unblock Modal ── */}
      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
          <div className="w-[525px] rounded-[14px] border-2 border-sett-border-light bg-white shadow-[0_4px_10px_720px_rgba(0,0,0,0.60)]">
            <div className="p-5 pb-4">
              <h2 className="font-montserrat text-[18px] font-semibold leading-none text-[#1D1D1D] mb-2">
                {blockTarget.status === 'active' ? t.staffManagement.blockTitle : t.staffManagement.unblockTitle}
              </h2>
              <p className="font-montserrat text-[14px] font-normal text-[#4A4A4A]">
                {(blockTarget.status === 'active' ? t.staffManagement.blockMessage : t.staffManagement.unblockMessage).replace('{name}', blockTarget.fullName)}
              </p>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button type="button" onClick={() => setBlockTarget(null)} disabled={blockLoading} className={grayBtnCls}>{t.common.cancel}</button>
              <button type="button" onClick={handleBlockToggle} disabled={blockLoading} className={blockTarget.status === 'active' ? redBtnCls : `flex-1 h-[44px] rounded-[14px] bg-sett-primary shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)] font-montserrat text-[16px] font-semibold text-white disabled:opacity-50 ${btnAnim}`}>
                {blockLoading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : blockTarget.status === 'active' ? t.staffManagement.blockAction : t.staffManagement.unblockAction}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
          <div className="w-[525px] rounded-[14px] border-2 border-sett-border-light bg-white shadow-[0_4px_10px_720px_rgba(0,0,0,0.60)]">
            <div className="p-5 pb-4">
              <h2 className="font-montserrat text-[18px] font-semibold leading-none text-[#1D1D1D] mb-2">
                {t.staffManagement.deleteTitle}
              </h2>
              <p className="font-montserrat text-[14px] font-normal text-[#4A4A4A]">
                {t.staffManagement.deleteMessage.replace('{name}', deleteTarget.fullName)}
              </p>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className={grayBtnCls}>{t.common.cancel}</button>
              <button type="button" onClick={handleDelete} disabled={deleteLoading} className={redBtnCls}>
                {deleteLoading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t.staffManagement.deleteAction}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
          <div className="w-[525px] rounded-[14px] border-2 border-sett-border-light bg-white shadow-[0_4px_10px_720px_rgba(0,0,0,0.60)]">
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-0">
              <div>
                <h2 className="font-montserrat text-[18px] font-semibold leading-none text-[#1D1D1D] mb-1.5">
                  {t.staffManagement.resetPasswordTitle}
                </h2>
                <p className="font-montserrat text-[14px] font-normal leading-none text-[#4A4A4A]">
                  {t.staffManagement.resetPasswordDesc.replace('{name}', resetTarget.fullName)}
                </p>
              </div>
              <button type="button" onClick={() => setResetTarget(null)} className="p-1 rounded-md hover:bg-sett-border/50 text-sett-text-secondary transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="mx-5 mt-4 border-t border-sett-border-light" />

            {/* Info Box */}
            <div className="px-5 pt-5 pb-4">
              <div className="rounded-[14px] border border-[#ADBEF2] bg-[#E9EEFC] p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                  <p className="font-montserrat text-[14px] font-semibold leading-none text-[#1D4ED8]">
                    {t.staffManagement.resetPasswordInfoTitle}
                  </p>
                </div>
                <p className="font-montserrat text-[14px] font-normal leading-[1.2] text-[#867600]">
                  {t.staffManagement.resetPasswordInfoDesc}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-5 pt-4 pb-5">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                disabled={resetLoading}
                className={grayBtnCls}
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className={`flex-1 h-[44px] flex items-center justify-center rounded-[14px] bg-sett-primary shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)] font-montserrat text-[16px] font-semibold text-white disabled:opacity-50 ${btnAnim}`}
              >
                {resetLoading
                  ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : t.staffManagement.resetPasswordBtn
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Staff Credentials Generated Modal ── */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
          <div className="w-[525px] rounded-[14px] border-2 border-sett-border-light bg-white shadow-[0_4px_10px_720px_rgba(0,0,0,0.60)]">
            <div className="flex items-start justify-between p-5 pb-0">
              <div>
                <h2 className="font-montserrat text-[18px] font-semibold leading-none text-[#1D1D1D] mb-2">{t.staffManagement.credentialsTitle}</h2>
                <p className="font-montserrat text-[14px] font-normal text-[#4A4A4A]">{t.staffManagement.credentialsDesc}</p>
              </div>
              <button type="button" onClick={closeCredentials} className="p-1 rounded-md hover:bg-sett-border/50 text-sett-text-secondary transition-colors shrink-0"><X className="w-4 h-4" /></button>
            </div>
            <div className="mx-5 mt-4 border-t border-sett-border-light" />
            <div className="px-5 pt-4 pb-2 space-y-4">
              <div className="space-y-1.5">
                <label className="font-montserrat text-[12px] font-semibold uppercase tracking-wider text-sett-text-primary">{t.staffManagement.credentialsEmail}</label>
                <div className="w-full h-[41px] px-3 flex items-center rounded-[14px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] text-[#1D1D1D]">{credentials.email}</div>
              </div>
              <div className="space-y-1.5">
                <label className="font-montserrat text-[12px] font-semibold uppercase tracking-wider text-sett-text-primary">{t.staffManagement.credentialsPassword}</label>
                <div className="relative">
                  <div className="w-full h-[41px] px-3 pr-10 flex items-center rounded-[14px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] text-[#1D1D1D]">
                    {showCredPassword ? credentials.password : '••••••••••••'}
                  </div>
                  <button type="button" onClick={() => setShowCredPassword(!showCredPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sett-primary hover:text-sett-primary-hover transition-colors">
                    {showCredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 py-3">
              <div className="rounded-[10px] border border-[#E5D5A0] bg-[#FFF9E6] p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-montserrat text-[14px] font-semibold text-[#92400E] mb-1">{t.staffManagement.credentialsWarningTitle}</p>
                    <p className="font-montserrat text-[13px] font-normal text-[#B45309] leading-[1.4]">{t.staffManagement.credentialsWarningDesc}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-5 pt-7 pb-5">
              <button type="button" onClick={handleCopyCredentials} className={`flex-1 h-[44px] flex items-center justify-center gap-2 rounded-[14px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[16px] font-semibold text-sett-text-primary ${btnAnim}`}>
                {credCopied ? <Check className="w-4 h-4 text-sett-primary" /> : <Copy className="w-4 h-4" />}
                {t.staffManagement.copyCredentials}
              </button>
              <Button variant="primary" fullWidth onClick={handleDownloadCredentials} className="flex-1 h-[44px] !rounded-[14px] !text-[16px] !gap-2">
                <Download className="w-4 h-4" />
                {t.staffManagement.downloadTxt}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
