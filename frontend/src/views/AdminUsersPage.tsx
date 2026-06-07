import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import { getAllUsers, updateUserStatus } from '../security/dataAccess';
import type { Profile } from '../types';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warned: 'bg-amber-100 text-amber-800 border-amber-200',
  suspended: 'bg-orange-100 text-orange-800 border-orange-200',
  banned: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcon: Record<string, string> = {
  active: 'check_circle',
  warned: 'warning',
  suspended: 'pause_circle',
  banned: 'block',
};

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'active' | 'warned' | 'suspended' | 'banned'>('All');
  const [confirmAction, setConfirmAction] = useState<{ userId: string; newStatus: string; userName: string } | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await getAllUsers();
    if (data) setUsers(data as Profile[]);
    setLoading(false);
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    if (filter !== 'All') {
      result = result.filter((u) => u.account_status === filter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.major?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, filter, searchQuery]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.account_status === 'active').length;
    const warned = users.filter((u) => u.account_status === 'warned').length;
    const suspended = users.filter((u) => u.account_status === 'suspended').length;
    const banned = users.filter((u) => u.account_status === 'banned').length;
    return { total, active, warned, suspended, banned };
  }, [users]);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setActionBusy(userId);
    const { error } = await updateUserStatus(userId, newStatus);
    setActionBusy(null);
    setConfirmAction(null);
    if (error) {
      setToast('Failed to update user: ' + error.message);
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, account_status: newStatus as Profile['account_status'] } : u))
    );
    setToast(`User marked as ${newStatus}`);
    setTimeout(() => setToast(null), 2000);
  };

  const getAvatar = (url?: string | null, name?: string) =>
    url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Unknown')}`;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const availableActions = (status: string) => {
    const actions: { label: string; status: string; variant: 'warning' | 'danger' | 'neutral' | 'success' }[] = [];
    if (status !== 'warned') actions.push({ label: 'Warn', status: 'warned', variant: 'warning' });
    if (status !== 'suspended') actions.push({ label: 'Suspend', status: 'suspended', variant: 'danger' });
    if (status !== 'banned') actions.push({ label: 'Ban', status: 'banned', variant: 'danger' });
    if (status !== 'active') actions.push({ label: 'Activate', status: 'active', variant: 'success' });
    return actions;
  };

  const variantClasses: Record<string, string> = {
    warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
    neutral: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  };

  return (
    <div className="min-h-screen bg-surface">
      <AdminNavbar />

      <main className="pt-24 pb-16 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="mb-10">
          <span className="font-label text-[0.75rem] uppercase tracking-[0.2em] text-on-primary-container font-bold block mb-2">
            User Management
          </span>
          <h1 className="text-3xl lg:text-4xl font-headline font-extrabold text-primary tracking-[-0.02em]">
            Manage Users
          </h1>
          <p className="text-secondary mt-2 font-light">View all platform users and manage their account status.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
          {[
            { label: 'Total', value: stats.total, icon: 'group', color: 'text-blue-700 bg-blue-50 border-blue-100' },
            { label: 'Active', value: stats.active, icon: 'check_circle', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
            { label: 'Warned', value: stats.warned, icon: 'warning', color: 'text-amber-700 bg-amber-50 border-amber-100' },
            { label: 'Suspended', value: stats.suspended, icon: 'pause_circle', color: 'text-orange-700 bg-orange-50 border-orange-100' },
            { label: 'Banned', value: stats.banned, icon: 'block', color: 'text-red-700 bg-red-50 border-red-100' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-lg">{s.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">{s.label}</span>
              </div>
              <p className="text-2xl font-headline font-extrabold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter + Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {(['All', 'active', 'warned', 'suspended', 'banned'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === f
                    ? 'bg-primary-container text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f === 'All' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'All' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({users.filter((u) => u.account_status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative md:ml-auto md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Search by name or major..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">group_off</span>
              <p className="text-slate-500 font-medium">No users found</p>
              <p className="text-slate-400 text-sm mt-1">
                {searchQuery ? 'Try a different search term.' : 'Users will appear here when they register.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Major</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatar(user.avatar_url, user.full_name)}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover bg-slate-200"
                          />
                          <div>
                            <button
                              onClick={() => navigate(`/profile/${user.id}`)}
                              className="text-sm font-bold text-slate-800 hover:text-primary-container hover:underline"
                            >
                              {user.full_name || 'Unnamed User'}
                            </button>
                            <p className="text-[0.7rem] text-slate-400 font-mono">{user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {user.major || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            statusColors[user.account_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[0.875rem]">{statusIcon[user.account_status]}</span>
                          {user.account_status.charAt(0).toUpperCase() + user.account_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {availableActions(user.account_status).map((action) => (
                            <button
                              key={action.status}
                              onClick={() =>
                                setConfirmAction({
                                  userId: user.id,
                                  newStatus: action.status,
                                  userName: user.full_name || 'this user',
                                })
                              }
                              disabled={actionBusy === user.id}
                              className={`px-2.5 py-1.5 text-[0.7rem] font-bold rounded transition-colors disabled:opacity-50 ${variantClasses[action.variant]}`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500">warning</span>
              </div>
              <div>
                <h3 className="font-headline text-lg font-bold text-slate-900">Confirm Action</h3>
                <p className="text-sm text-slate-500">
                  Are you sure you want to mark <strong>{confirmAction.userName}</strong> as{' '}
                  <strong>{confirmAction.newStatus}</strong>?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange(confirmAction.userId, confirmAction.newStatus)}
                disabled={actionBusy === confirmAction.userId}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-slate-900 text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
