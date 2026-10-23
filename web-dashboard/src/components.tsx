import { useEffect, useRef, useId } from 'react';
import type { ReactNode } from 'react';
import { X, Search, Building2, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Organization } from './types';
import { bankCode, bankStatus } from './types';

export function Brand() { return <div className="brand"><img className="brand-icon" src="/logo.png" alt="BloodLink logo" width={36} height={45} /><div><strong>Blood<span>Link</span></strong><small>NETWORK ADMINISTRATION</small></div></div>; }
export function Badge({ status, children }: { status: string; children?: ReactNode }) { return <span className={`badge badge-${status.toLowerCase()}`}><i />{children || status.charAt(0).toUpperCase() + status.slice(1)}</span>; }
export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{children}</div></div>; }
export function SearchBox({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="search-box"><Search size={16} /><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />{value && <button type="button" aria-label="Clear search" onClick={() => onChange('')}><X size={14} /></button>}</label>; }
export function Empty({ title, children }: { title: string; children?: ReactNode }) { return <div className="empty"><Building2 size={30} /><h3>{title}</h3><p>{children || 'Records will appear here when they are available.'}</p></div>; }
export function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby={titleId}>
    <div className="modal-heading"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}
  </dialog>;
}
export function Pagination({ page, total, size, onChange }: { page: number; total: number; size: number; onChange: (page: number) => void }) {
  const max = Math.max(1, Math.ceil(total / size));
  return <div className="table-footer"><span>{total ? `Showing ${(page - 1) * size + 1}–${Math.min(page * size, total)} of ${total}` : '0 records'}</span><div><button className="icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /></button><span className="page-number">{page} / {max}</span><button className="icon-button" aria-label="Next page" disabled={page >= max} onClick={() => onChange(page + 1)}><ChevronRight size={16} /></button></div></div>;
}
export function BankIdentity({ bank }: { bank: Organization }) { return <div className="bank-identity"><span className="institution-icon"><Building2 size={18} /></span><div><strong>{bank.name}</strong><small>{bankCode(bank)} · {bank.branch_name || (bank.type === 'bloodbank' ? 'Main blood bank' : 'Hospital')}{bank.parent_name && ` · ${bank.parent_name}`}</small></div></div>; }
export function BankTable({ banks, onSelect, compact = false }: { banks: Organization[]; onSelect: (bank: Organization) => void; compact?: boolean }) {
  if (!banks.length) return <Empty title="No blood banks found">Try another search or add a blood bank to the network.</Empty>;
  return <div className="table-scroll"><table><thead><tr><th>Blood bank</th><th>District</th><th>Status</th>{!compact && <><th>Stock</th><th>Staff</th></>}<th><span className="sr-only">Action</span></th></tr></thead><tbody>{banks.map(bank => <tr key={bank.id}>
    <td><button className="identity-button" onClick={() => onSelect(bank)}><BankIdentity bank={bank} /></button></td><td>{bank.district || 'Not provided'}</td><td><Badge status={bankStatus(bank)} /></td>{!compact && <><td><strong className="numeric">{bank.total_units.toLocaleString()}</strong> <span className="muted">units</span>{bank.critical_groups > 0 && <small className="critical-text">{bank.critical_groups} critical {bank.critical_groups === 1 ? 'group' : 'groups'}</small>}</td><td>{bank.staff_count}</td></>}<td><button className="icon-button row-arrow" aria-label={`View ${bank.name}`} onClick={() => onSelect(bank)}><ArrowUpRight size={18} /></button></td>
  </tr>)}</tbody></table></div>;
}
export function CardHeading({ title, subtitle, link, to }: { title: string; subtitle?: string; link?: string; to?: string }) { return <div className="card-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{link && to && <Link className="text-link" to={to}>{link}<ArrowUpRight size={14} /></Link>}</div>; }
export function formatDate(value: string, withTime = false) { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } as const : {}) }).format(new Date(value)); }
export function Evidence({ url }: { url: string | null }) { return url?.startsWith('https://') ? <a className="text-link" href={url} target="_blank" rel="noopener noreferrer">View submitted evidence<ArrowUpRight size={14} /></a> : <span className="muted break-word">{url ? `Document reference: ${url}` : 'No evidence document provided'}</span>; }
