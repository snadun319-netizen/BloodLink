import { useEffect, useState } from 'react';
import { Check, ExternalLink, X } from 'lucide-react';
import { PageHeading, formatDate } from '../components';
import { useBank } from './context';

type Verification = { id: number; donor_id: number; donor_email: string; full_name: string | null; phone: string | null; district: string; document_url: string; claimed_blood_group: string; created_at: string };
export function DonorApprovalsPage() {
  const { api, revision, mutate, busy } = useBank();
  const [rows, setRows] = useState<Verification[]>([]), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => { let live = true; api.request<{verifications: Verification[]}>('/donors/district-admin/pending').then(r => { if (live) { setRows(r.verifications); setError(''); } }).catch(e => live && setError((e as Error).message)); return () => { live = false; }; }, [api, revision, refresh]);
  async function review(row: Verification, decision: 'approve'|'reject') {
    await mutate(`/donors/district-admin/${row.id}/${decision}`, {}, decision === 'approve' ? 'Donor document approved.' : 'Donor document rejected.', 'PATCH');
    setRefresh(n => n + 1);
  }
  async function openDocument(row: Verification) {
    try { const blob = await api.downloadDocument(row.document_url); const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener,noreferrer'); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    catch (e) { setError((e as Error).message); }
  }
  return <><PageHeading eyebrow="DISTRICT VERIFICATION" title="Donor document approvals" description="Review blood group documents submitted by donors in your district." />
    {error && <div className="error-message" role="alert">{error}</div>}
    <section className="card"><div className="card-heading"><div><span className="mini-label">LOCAL REVIEW QUEUE</span><h2>Pending documents</h2></div><span className="count-chip">{rows.length}</span></div>
      <div className="table-scroll"><table><thead><tr><th>Donor</th><th>District</th><th>Blood group</th><th>Document</th><th>Submitted</th><th>Decision</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.full_name || row.donor_email}</strong><small>{row.donor_email}</small></td><td>{row.district}</td><td><strong className="blood-group-label">{row.claimed_blood_group}</strong></td><td><button className="text-button" onClick={() => void openDocument(row)}><ExternalLink size={14}/>Open document</button></td><td>{formatDate(row.created_at, true)}</td><td><div className="inline-actions"><button className="text-button success-text" disabled={busy} onClick={() => void review(row,'approve')}><Check size={14}/>Approve</button><button className="text-button critical-text" disabled={busy} onClick={() => void review(row,'reject')}><X size={14}/>Reject</button></div></td></tr>)}</tbody></table>
      {!rows.length && <div className="workspace-empty donor-approvals-empty"><h3>No donor documents pending</h3><p>New donor submissions from your district will appear here.</p></div>}</div>
    </section></>;
}
