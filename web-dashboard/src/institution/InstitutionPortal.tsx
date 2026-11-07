import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Activity, AlertCircle, Bell, Building2, Check, ChevronRight, CircleHelp, ClipboardList, Droplets, LayoutDashboard, LoaderCircle, LogOut, Menu, RefreshCw, ShieldCheck, Users, X } from 'lucide-react';
import type { Api } from '../api';
import { Brand, Modal } from '../components';
import type { BloodRequest, Institution, Staff, Stock } from '../types';
import { BankContext } from './context';
import type { BankData } from './context';
import { BankOverview, StockPage, RequestsPage, HealthAlertsPage, TeamPage } from './pages';
import './institution.css';

const navigation = [
  { to: '/bank', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/bank/stock', label: 'Blood stock', icon: Droplets },
  { to: '/bank/requests', label: 'Blood requests', icon: ClipboardList },
  { to: '/bank/health-alerts', label: 'Health alerts', icon: Activity },
  { to: '/bank/team', label: 'Team', icon: Users },
];

export function InstitutionPortal({ api, onLogout }: { api: Api; onLogout: () => void }) {
  const [data, setData] = useState<BankData | null>(null), [error, setError] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  const [toast, setToast] = useState(''), [mobile, setMobile] = useState(false), [help, setHelp] = useState(false), [logout, setLogout] = useState(false);
  const [updated, setUpdated] = useState('');
  const location = useLocation(), refreshing = useRef(false), mutating = useRef(false);
  const refresh = useCallback(async (quiet = false) => {
    if (refreshing.current) return;
    refreshing.current = true; if (!quiet) setLoading(true);
    try {
      const [overview, inventory, requests, teammates] = await Promise.all([
        api.request<{ institution: Institution }>('/institution/overview'), api.request<{ stocks: Stock[] }>('/stocks'),
        api.request<{ requests: BloodRequest[] }>('/requests'), api.request<{ staff: Staff[] }>('/institution/staff'),
      ]);
      setData({ institution: overview.institution, stocks: inventory.stocks, requests: requests.requests, staff: teammates.staff });
      setUpdated(new Date().toISOString()); setRevision(n => n + 1); setError('');
    } catch (failure) { setError((failure as Error).message); }
    finally { refreshing.current = false; setLoading(false); }
  }, [api]);
  useEffect(() => { void refresh(); const interval = setInterval(() => { if (!mutating.current && !document.hidden) void refresh(true); }, 30000); return () => clearInterval(interval); }, [refresh]);
  useEffect(() => { setMobile(false); }, [location.pathname]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 6000); return () => clearTimeout(timer); } }, [toast]);
  async function mutate<T = unknown>(path: string, body: unknown, message: string, method = 'POST'): Promise<T> {
    setBusy(true); mutating.current = true;
    try { const result = await api.request<T>(path, method, body); setToast(message); await refresh(true); return result; }
    finally { setBusy(false); mutating.current = false; }
  }
  const institution = data?.institution, pending = data?.requests.filter(r => r.status === 'Active' && r.approval_status === 'Pending').length || 0;
  const initials = institution?.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'BB';
  const primary = data?.staff.some(s => s.email === api.email && s.is_bank_account);
  return <div className="app-layout bank-workspace">{mobile && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`}><Link to="/bank" className="brand-link"><Brand subtitle={institution?.name || 'INSTITUTION WORKSPACE'} /></Link><div className="bank-workspace-tag"><Building2 size={14} />{institution?.type === 'hospital' ? 'Hospital workspace' : 'Blood bank workspace'}</div><div className="nav-section-label">MAIN MENU</div><nav aria-label="Institution navigation">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}><item.icon size={18} /><span>{item.label}</span>{item.label === 'Blood requests' && pending > 0 && <b className="nav-count">{pending}</b>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="bank-isolation"><ShieldCheck size={18} /><p>Your institution. Your workspace.<small>Records are private to your team.</small></p></div><button className="help-button" onClick={() => setHelp(true)}><CircleHelp size={18} />Workspace guide<ChevronRight size={15} /></button><div className="profile"><span className="avatar">{initials}</span><div><strong>{primary ? 'Blood bank admin' : 'Institution staff'}</strong><small title={api.email}>{api.email}</small></div><button className="icon-button" aria-label="Sign out" disabled={busy} onClick={() => setLogout(true)}><LogOut size={17} /></button></div></div>
    </aside><div className="main-layout"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobile(!mobile)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{navigation.find(item => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))?.label || 'Dashboard'}</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Workspace guide" onClick={() => setHelp(true)}><CircleHelp size={18} /></button><Link to="/bank/requests?tab=Pending" className="icon-button notification-button" aria-label={`${pending} requests awaiting approval`}><Bell size={19} />{pending > 0 && <i />}</Link><span className="topbar-divider" /><span className="avatar avatar-small">{initials}</span></div></header>
      <main className="main-content"><div className="data-toolbar"><span><span className={`pulse-dot ${error ? 'dot-warning' : ''}`} />{loading ? 'Updating your workspace…' : error ? 'Connection needs attention' : 'Connected to BloodLink'}{updated && <small> · Updated {new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' }).format(new Date(updated))}</small>}</span><button className="text-button" disabled={loading || busy} onClick={() => void refresh()}><RefreshCw size={14} className={loading ? 'spin' : ''} />Refresh</button></div>
        {error && <div className="error-message" role="alert"><AlertCircle size={18} />{error}<button className="text-button" disabled={loading} onClick={() => void refresh()}>Retry</button></div>}
        {data ? <BankContext.Provider value={{ api, data, busy, mutate, revision }}><Routes><Route path="/bank" element={<BankOverview />} /><Route path="/bank/stock" element={<StockPage />} /><Route path="/bank/requests" element={<RequestsPage />} /><Route path="/bank/health-alerts" element={<HealthAlertsPage />} /><Route path="/bank/team" element={<TeamPage />} /><Route path="*" element={<Navigate to="/bank" replace />} /></Routes></BankContext.Provider> : <div className="initial-loading">{loading ? <LoaderCircle className="spin" size={30} /> : <AlertCircle size={30} />}<h2>{loading ? 'Opening your workspace' : 'Workspace unavailable'}</h2><p>{loading ? 'Loading your institution’s latest records.' : 'Use Retry to reconnect to BloodLink.'}</p></div>}
        <footer className="page-footer"><span>BloodLink / {institution?.name || 'Institution workspace'}</span><span><ShieldCheck size={12} />Institution access protected</span></footer>
      </main></div>
    {toast && <div className="toast" role="status"><span><Check size={18} /></span>{toast}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={16} /></button></div>}
    {help && <Modal title="Your institution workspace" onClose={() => setHelp(false)}><div className="modal-body guide"><p><strong>Blood stock:</strong> Update your bank’s available units. Changes are recorded immediately.</p><p><strong>Blood requests:</strong> Submit a request for super admin review. Only approved requests appear to eligible nearby donors. You can monitor responses, confirm collections and cancel requests.</p><p><strong>Health alerts:</strong> Send private messages only to donors who have donated at your institution. Recipients open them in the mobile app.</p><p><strong>Accounts:</strong> The super admin manages the primary bank login. Your primary bank account can add and suspend teammates.</p><p className="muted">The workspace refreshes every 30 seconds while visible. All times use Sri Lanka time.</p></div><div className="modal-footer"><button className="button primary" onClick={() => setHelp(false)}>Got it</button></div></Modal>}
    {logout && <Modal title="Sign out of BloodLink?" subtitle={api.email} onClose={() => { if (!busy) setLogout(false); }}><div className="modal-body"><p>You will need to sign in again to manage your institution.</p></div><div className="modal-footer"><button className="button secondary" disabled={busy} onClick={() => setLogout(false)}>Stay signed in</button><button className="button primary" disabled={busy} onClick={async () => { setBusy(true); try { await api.logout(); onLogout(); } catch (failure) { setError((failure as Error).message); setLogout(false); } finally { setBusy(false); } }}>Sign out</button></div></Modal>}
  </div>;
}
