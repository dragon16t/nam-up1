import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserCheck, UserX, Shield, Phone, Mail, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api, { formatApiError } from '@/utils/api';
import { formatDate, getStatusColor } from '@/utils/format';
import { SkeletonList } from '@/components/shared/SkeletonCard';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import { ADMIN } from '@/constants/testIds';

const ROLE_COLORS = {
  customer: 'bg-blue-50 text-blue-700 border-blue-200',
  merchant: 'bg-green-50 text-green-700 border-green-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  super_admin: 'bg-red-50 text-red-700 border-red-200',
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { skip: (page - 1) * 20, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get('/admin/users', { params });
      const list = Array.isArray(data) ? data : data.items || [];
      setUsers(list);
      setTotal(data.total || list.length);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [search, roleFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const toggleRole = async (userId, role, hasRole) => {
    try {
      const user = users.find(u => u.id === userId);
      const newRoles = hasRole
        ? user.roles.filter(r => r !== role)
        : [...user.roles, role];
      await api.put(`/admin/users/${userId}`, { roles: newRoles });
      toast.success('Role updated');
      fetchUsers();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid={ADMIN.usersTable} className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} registered users</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search name, phone, email..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-slate-200 bg-white" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="h-10 border border-slate-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:border-[#0F4C3A] text-slate-600">
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="merchant">Merchant</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {loading ? <SkeletonList count={6} /> :
        users.length === 0 ? (
          <EmptyState type="search" title="No users found" description="Try adjusting your search" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['User', 'Contact', 'Roles', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0F4C3A]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#0F4C3A]">
                            {(user.name || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800">{user.name || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      <div className="space-y-0.5">
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        {user.email && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[150px]">{user.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(user.roles || []).map(r => (
                          <span key={r} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[r] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => setSelected(user)}
                        className="text-xs text-[#0F4C3A] hover:underline font-medium">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100">
              <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} loading={loading} />
            </div>
          </div>
        )}

      {/* User Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Manage User: {selected.name}</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500 text-xs">Phone</span><p className="font-medium">{selected.phone || '—'}</p></div>
                <div><span className="text-slate-500 text-xs">Email</span><p className="font-medium truncate">{selected.email || '—'}</p></div>
                <div><span className="text-slate-500 text-xs">User ID</span><p className="font-mono text-xs">{selected.id?.slice(-8)}</p></div>
                <div><span className="text-slate-500 text-xs">Joined</span><p className="font-medium">{formatDate(selected.created_at)}</p></div>
              </div>
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-2 font-medium">Roles</p>
                <div className="flex gap-2 flex-wrap">
                  {['customer', 'merchant', 'admin'].map(r => (
                    <button key={r} onClick={() => toggleRole(selected.id, r, selected.roles?.includes(r))}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        selected.roles?.includes(r)
                          ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#0F4C3A]'
                      }`}>
                      {selected.roles?.includes(r) ? '✓ ' : '+ '}{r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
