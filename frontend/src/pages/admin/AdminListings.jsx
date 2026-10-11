import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Leaf, Wrench, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api, { formatApiError } from '@/utils/api';
import { formatDate, getStatusColor, getStatusLabel, formatCurrency } from '@/utils/format';
import { SkeletonList } from '@/components/shared/SkeletonCard';
import EmptyState from '@/components/shared/EmptyState';
import { ADMIN } from '@/constants/testIds';

const LISTING_TYPES = [
  { value: 'agriculture', label: 'Agriculture', icon: Leaf, color: '#16A34A' },
  { value: 'services', label: 'Services', icon: Wrench, color: '#2563EB' },
  { value: 'classifieds', label: 'Classifieds', icon: Tag, color: '#7C3AED' },
];

const STATUS_TABS = [
  { value: 'submitted', label: 'Pending Review' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminListings() {
  const [type, setType] = useState('agriculture');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    api.get(`/admin/listings/${type}`, { params })
      .then(r => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, statusFilter]);

  const handleAction = async (id, status) => {
    setActionLoading(id);
    try {
      await api.put(`/admin/listings/${type}/${id}/status`, { status });
      toast.success(`Listing ${status}`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setActionLoading(''); }
  };

  const getTitle = (item) => item.product_name || item.service_name || item.title || '—';
  const getSub = (item) => item.seller_name || item.provider_name || item.category || '';

  return (
    <div data-testid={ADMIN.listingsTable} className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Listings Moderation</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review and approve agriculture, services & classifieds</p>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 mb-4">
        {LISTING_TYPES.map(t => (
          <button key={t.value} onClick={() => setType(t.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              type === t.value
                ? 'border-[#0F4C3A] bg-[#0F4C3A] text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Status Filter */}
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

      {loading ? <SkeletonList count={4} /> :
        items.length === 0 ? (
          <EmptyState type={type === 'agriculture' ? 'agriculture' : type === 'services' ? 'services' : 'classifieds'}
            title="No listings found" description={`No ${statusFilter} ${type} listings`} />
        ) : (
          <div className="grid gap-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${LISTING_TYPES.find(t => t.value === type)?.color}15` }}>
                  {React.createElement(LISTING_TYPES.find(t => t.value === type)?.icon || Leaf,
                    { className: 'w-5 h-5', style: { color: LISTING_TYPES.find(t => t.value === type)?.color } }
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800 truncate">{getTitle(item)}</h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                    <span>{getSub(item)}</span>
                    <span>{item.locality || item.city || ''}</span>
                    {item.price && <span className="font-semibold text-[#0F4C3A]">{formatCurrency(item.price)}/{item.unit || 'unit'}</span>}
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  {item.description && <p className="text-xs text-slate-400 mt-1 truncate">{item.description}</p>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${getStatusColor(item.status)}`}>
                  {getStatusLabel(item.status)}
                </span>
                {statusFilter === 'submitted' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleAction(item.id, 'published')}
                      disabled={actionLoading === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => handleAction(item.id, 'rejected')}
                      disabled={actionLoading === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
