import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api, { formatApiError } from '@/utils/api';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/utils/format';
import { SkeletonList } from '@/components/shared/SkeletonCard';
import EmptyState from '@/components/shared/EmptyState';
import { ADMIN } from '@/constants/testIds';

const STATUS_TABS = [
  { value: 'requested', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('requested');
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    api.get('/admin/withdrawals', { params })
      .then(r => setWithdrawals(r.data))
      .catch(() => setWithdrawals([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleAction = async (id, status) => {
    if (status === 'paid' && !referenceId.trim()) {
      toast.error('Reference ID is required to mark as paid');
      return;
    }
    setActionLoading(true);
    try {
      if (status === 'paid') {
        await api.put(`/admin/withdrawals/${id}/reference`, { reference_id: referenceId.trim(), notes });
      } else {
        await api.put(`/admin/withdrawals/${id}/status`, { status, notes });
      }
      toast.success(`Withdrawal ${status} successfully`);
      setSelected(null); setNotes(''); setReferenceId('');
      setWithdrawals(prev => prev.filter(w => w.id !== id));
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setActionLoading(false); }
  };

  return (
    <div data-testid={ADMIN.withdrawalsTable} className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Withdrawals</h1>
        <p className="text-sm text-slate-500 mt-0.5">Process merchant withdrawal requests</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit">
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => setStatusFilter(t.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === t.value ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <SkeletonList count={5} /> :
        withdrawals.length === 0 ? (
          <EmptyState type="orders" title="No withdrawal requests"
            description={statusFilter ? `No ${statusFilter} requests` : 'All withdrawal requests will appear here'} />
        ) : (
          <div className="grid gap-3">
            {withdrawals.map(w => (
              <div key={w.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">{w.merchant_name || 'Merchant'}</h3>
                    <span className="text-xl font-bold text-[#0F4C3A]">{formatCurrency(w.amount)}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                    {w.upi_id && <span>UPI: {w.upi_id}</span>}
                    {w.bank_account && <span>A/C: {w.bank_account} · IFSC: {w.ifsc}</span>}
                    <span>{formatDate(w.created_at)}</span>
                  </div>
                  {w.admin_notes && (
                    <p className="text-xs text-slate-400 mt-1">Note: {w.admin_notes}</p>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${getStatusColor(w.status)}`}>
                  {getStatusLabel(w.status)}
                </span>
                {(w.status === 'requested' || w.status === 'under_review') && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setSelected({ ...w, _action: 'paid' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Pay
                    </button>
                    <button onClick={() => setSelected({ ...w, _action: 'approved' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => setSelected({ ...w, _action: 'rejected' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      {/* Action Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5">
            <h3 className="font-semibold text-slate-800 mb-1">
              {selected._action === 'paid' ? 'Mark as Paid' :
               selected._action === 'approved' ? 'Approve Request' : 'Reject Request'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {formatCurrency(selected.amount)} — {selected.merchant_name}
            </p>
            {selected._action === 'paid' && (
              <div className="mb-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Reference ID *</label>
                <input value={referenceId} onChange={e => setReferenceId(e.target.value)}
                  data-testid="withdrawal-reference-id"
                  placeholder="UPI txn / bank ref"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0F4C3A]" />
              </div>
            )}
            <textarea placeholder="Admin notes (optional)" value={notes}
              onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0F4C3A] mb-4 resize-none" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setSelected(null); setNotes(''); setReferenceId(''); }}>Cancel</Button>
              <Button onClick={() => handleAction(selected.id, selected._action)} disabled={actionLoading}
                className={`flex-1 text-white ${selected._action === 'rejected' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#0F4C3A] hover:bg-[#0a3829]'}`}>
                Confirm {selected._action}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
