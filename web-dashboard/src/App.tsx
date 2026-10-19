import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Activity, ArrowRight, Check, ChevronRight, CircleHelp, Clock3, LayoutDashboard, LogOut, Menu, RefreshCw, ShieldCheck, Users, X, AlertCircle, LoaderCircle, FlaskConical } from 'lucide-react';
import { Building2 } from 'lucide-react';
import { Api } from './api';
import { Dashboard } from './context';
import { Brand, Modal, formatDate } from './components';
import { OverviewPage, BanksPage, ApprovalsPage, StaffPage, ActivityPage } from './pages';
import type { Snapshot, Organization, Staff, Audit, Verification, Overview } from './types';
import './App.css';

async function snapshot(api: Api): Promise<Snapshot> {
  const [organizations, staff, logs, verifications, overview] = await Promise.all([
    api.request<{ organizations: Organization[] }>('/admin/organizations'), api.request<{ staff: Staff[] }>('/admin/staff'),
    api.request<{ logs: Audit[] }>('/admin/audit-logs?limit=100'), api.request<{ verifications: Verification[] }>('/donors/admin/pending'),
    api.request<Overview>('/admin/network-overview'),
  ]);
  return { organizations: organizations.organizations, staff: staff.staff, logs: logs.logs, verifications: verifications.verifications, overview };
}
function Login({ onSession, notice }: { onSession: (api: Api | null) => void; notice: string }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(notice);
  return <div className="login-layout"><div className="login-story"><Brand /><div className="login-story-content"><span className="eyebrow">ONE NETWORK. EVERY LIFE.</span><h1>A stronger network.<br />A shared purpose.</h1><p>Connect blood banks, support their teams, and keep the BloodLink network ready for those who need it.</p><div className="network-art" aria-hidden="true"><span className="art-center"><Building2 size={40} /></span>{[0, 1, 2, 3].map(i => <span key={i} className={`art-node art-node-${i}`}><ShieldCheck size={24} /></span>)}</div><span className="login-footnote">BloodLink · Sri Lanka</span></div></div>
    <main className="login-panel"><div className="login-card"><span className="login-shield"><ShieldCheck size={26} /></span><div className="eyebrow">PLATFORM ADMINISTRATION</div><h2>Welcome back</h2><p>Sign in to manage the BloodLink network.</p>
      {error && <div className="error-message" role="alert"><AlertCircle size={17} />{error}</div>}
      <form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { onSession(await Api.login(email.trim(), password, () => onSession(null))); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }}>
        <label>Email address<input type="email" autoComplete="username" required maxLength={255} placeholder="admin@your-organization.lk" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required maxLength={128} placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        <button className="button primary full-width" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <>Sign in securely<ArrowRight size={17} /></>}</button>
      </form><div className="login-restricted"><ShieldCheck size={15} />Authorized platform administrators only</div><div className="login-divider"><span>EXPLORE THE INTERFACE</span></div><button className="button secondary full-width" disabled={busy} onClick={() => onSession(new Api(true, 'admin@example.com', () => onSession(null)))}><FlaskConical size={17} />Open demo dashboard</button><p className="demo-description">Sample data only. No account or backend required.</p>
    </div></main></div>;
}
const navigation = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true }, { to: '/admin/blood-banks', label: 'Blood banks', icon: Building2 },
  { to: '/admin/approvals', label: 'Approvals', icon: ShieldCheck }, { to: '/admin/staff', label: 'Staff accounts', icon: Users },
  { to: '/admin/activity', label: 'Activity log', icon: Activity },
];
function Portal({ api, onLogout }: { api: Api; onLogout: () => void }) {
  const [data, setData] = useState<Snapshot | null>(null); const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [toast, setToast] = useState('');
  const [help, setHelp] = useState(false); const [mobile, setMobile] = useState(false); const [loadedAt, setLoadedAt] = useState('');
  const location = useLocation();
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await snapshot(api)); setLoadedAt(new Date().toISOString()); }
    catch (err) { setError((err as Error).message); throw err; } finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void refresh().catch(() => {}); }, [refresh]);
  useEffect(() => { setMobile(false); }, [location.pathname]);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 5000); return () => clearTimeout(id); } }, [toast]);
  async function mutate(path: string, body: unknown, message: string, method = 'PATCH') {
    setBusy(true); setError('');
    try { await api.request(path, method, body); setToast(message); await refresh().catch(() => {}); }
    catch (err) { setError((err as Error).message); throw err; } finally { setBusy(false); }
  }
  const current = navigation.find(item => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to));
  const pending = data?.organizations.filter(b => b.verification_status === 'pending').length || 0;
  return <div className="app-layout">{mobile && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`}><Link to="/admin" className="brand-link" aria-label="BloodLink overview"><Brand /></Link><div className="workspace-label"><ShieldCheck size={15} /><span>Super admin workspace</span></div><div className="nav-section-label">MANAGEMENT</div><nav aria-label="Main navigation">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}><item.icon size={19} /><span>{item.label}</span>{item.label === 'Approvals' && pending > 0 && <b className="nav-count">{pending}</b>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="network-note"><span className="pulse-dot" /><span>One connected network<small>Supporting lives across Sri Lanka</small></span></div><button className="help-button" onClick={() => setHelp(true)}><CircleHelp size={18} />Workspace guide<ChevronRight size={15} /></button><div className="profile"><span className="avatar">SA</span><div><strong>Super administrator</strong><small title={api.email}>{api.email}</small></div><button className="icon-button" aria-label={api.demo ? 'Leave demo' : 'Sign out'} disabled={busy} onClick={async () => { setBusy(true); try { await api.logout(); onLogout(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }}><LogOut size={17} /></button></div></div>
    </aside>
    <div className="main-layout"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobile(!mobile)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{current?.label || 'Overview'}</strong></div><div className="topbar-actions">{api.demo && <span className="demo-pill"><FlaskConical size={13} />Demo workspace</span>}<button className="icon-button" aria-label="Workspace guide" onClick={() => setHelp(true)}><CircleHelp size={19} /></button><Link to="/admin/approvals" className="icon-button notification-button" aria-label={`${pending} institution approvals pending`}><ShieldCheck size={20} />{pending > 0 && <i />}</Link><span className="topbar-divider" /><span className="avatar avatar-small">SA</span></div></header>
      <main className="main-content">{api.demo && <div className="demo-banner"><FlaskConical size={15} /><span>Demo workspace · Sample records. Changes stay in this session.</span><button onClick={onLogout}>Exit demo<ArrowRight size={14} /></button></div>}
        <div className="data-toolbar"><span><span className={`pulse-dot ${error ? 'dot-warning' : ''}`} />{loading ? 'Loading network data…' : error ? 'Data needs attention' : api.demo ? 'Sample network data' : 'Connected to BloodLink API'}{loadedAt && !loading && <small> · Updated {new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' }).format(new Date(loadedAt))}</small>}</span><button className="text-button" disabled={loading || busy} onClick={() => void refresh().catch(() => {})}><RefreshCw size={14} className={loading ? 'spin' : ''} />Refresh</button></div>
        {error && <div className="error-message" role="alert"><AlertCircle size={18} /><span>{error}</span><button className="text-button" onClick={() => void refresh().catch(() => {})}>Retry</button></div>}
        {data ? <Dashboard.Provider value={{ data, api, busy, mutate }}><Routes><Route path="/admin" element={<OverviewPage />} /><Route path="/admin/blood-banks" element={<BanksPage />} /><Route path="/admin/approvals" element={<ApprovalsPage />} /><Route path="/admin/staff" element={<StaffPage />} /><Route path="/admin/activity" element={<ActivityPage />} /><Route path="*" element={<Navigate to="/admin" replace />} /></Routes></Dashboard.Provider> : <div className="initial-loading">{loading ? <><LoaderCircle className="spin" size={30} /><h2>Loading your workspace</h2><p>Getting the latest network information.</p></> : <><AlertCircle size={30} /><h2>Workspace unavailable</h2><p>Check your connection and use Retry above.</p></>}</div>}
        <footer className="page-footer"><span>BloodLink <span> / </span> Network administration</span><span><Clock3 size={12} />All times in Sri Lanka (UTC+05:30)</span></footer>
      </main>
    </div>{toast && <div className="toast" role="status"><span><Check size={18} /></span>{toast}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={16} /></button></div>}
    {help && <Modal title="Your admin workspace" subtitle="Manage the network with the right level of access." onClose={() => setHelp(false)}><div className="modal-body guide"><p><strong>Blood banks:</strong> Add institutions, maintain contact details and review their stock and assigned staff.</p><p><strong>Approvals:</strong> Check evidence before approving institutions or donor blood groups. Pending institutions cannot receive active staff accounts.</p><p><strong>Access:</strong> Suspending an institution blocks its staff access immediately. Reactivation requires staff to sign in again.</p><p><strong>Activity:</strong> Track who changed institution and account records. Stock updates and health alerts belong to the institution dashboard.</p><p className="muted">Live data updates when you refresh. Signing out or reloading clears this browser session. {api.demo && `Demo records use a fixed sample date: ${formatDate('2026-10-17T04:00:00Z')}.`}</p></div><div className="modal-footer"><button className="button primary" onClick={() => setHelp(false)}>Got it</button></div></Modal>}
  </div>;
}
function Workspace() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Api | null>(null); const [notice, setNotice] = useState('');
  return session ? <Portal api={session} onLogout={() => { setSession(null); setNotice(''); navigate('/admin'); }} /> : <Login notice={notice} onSession={api => { setSession(api); setNotice(api ? '' : 'Your session has expired. Please sign in again.'); if (api) navigate('/admin'); }} />;
}
export default function App() { return <BrowserRouter><Workspace /></BrowserRouter>; }
