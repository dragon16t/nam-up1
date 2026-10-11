import React, { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, XCircle, Clock, MapPin, Star, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api, { formatApiError } from '@/utils/api';
import { formatDate, getStatusColor, getStatusLabel } from '@/utils/format';
import { SkeletonList } from '@/components/shared/SkeletonCard';
import EmptyState from '@/components/shared/EmptyState';
import { ADMIN } from '@/constants/testIds';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'submitted', label: 'Pending' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export default function AdminStores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/admin/merchants', { params });
      setStores(data);
    } catch { setStores([]); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchStores, 300);
    return () => clearTimeout(t);
  }, [fetchStores]);

  const handleAction = async (storeId, status) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/merchants/${storeId}/status`, { status, reason });
      toast.success(`Store ${status} successfully`);
      setSelected(null); setReason('');
      fetchStores();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setActionLoading(false); }
  };

  return (
    <div data-testid={ADMIN.storesTable} className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Store Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Approve, review and manage store registrations</p>
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

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search stores..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-xl border-slate-200 bg-white" />
      </div>

      {loading ? <SkeletonList count={5} /> :
        stores.length === 0 ? (
          <EmptyState type="stores" title="No stores found"
            description={statusFilter ? `No ${statusFilter} stores` : 'No stores registered yet'} />
        ) : (
          <div className="grid gap-3">
            {stores.map(store => (
              <div key={store.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-[#0F4C3A]/8 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-[#0F4C3A]">{store.business_name?.[0] || 'S'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{store.business_name}</h3>
                      <p className="text-xs text-slate-500">{store.business_type}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${getStatusColor(store.status)}`}>
                      {getStatusLabel(store.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />{store.locality}, {store.city}
                    </span>
                    <span className="text-xs text-slate-500">Owner: {store.owner_name}</span>
                    <span className="text-xs text-slate-500">{formatDate(store.created_at)}</span>
                    {store.rating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />{store.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setSelected(store)}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  {store.status === 'submitted' && (
                    <>
                      <button onClick={() => { setSelected(store); }} data-action="approve"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors"
                        onClick={() => handleAction(store.id, 'published')}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => setSelected({ ...store, _rejectMode: true })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {store.status === 'published' && (
                    <button onClick={() => handleAction(store.id, 'suspended')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-medium transition-colors">
                      <Clock className="w-3.5 h-3.5" /> Suspend
                    </button>
                  )}
                  {store.status === 'suspended' && (
                    <button onClick={() => handleAction(store.id, 'published')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors">
                      Reinstate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Detail/Reject Modal */}
      {selected?._rejectMode && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5">
            <h3 className="font-semibold text-slate-800 mb-2">Reject Store: {selected.business_name}</h3>
            <textarea placeholder="Reason for rejection (optional)" value={reason}
              onChange={e => setReason(e.target.value)} rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 mb-4 resize-none" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setSelected(null); setReason(''); }}>Cancel</Button>
              <Button onClick={() => handleAction(selected.id, 'rejected')} disabled={actionLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
