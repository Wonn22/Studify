import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getAllReports, updateReportStatus, getCurrentSessionUser } from '../security/dataAccess';
import type { UserReport } from '../types';

const statusColors: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Reviewed: 'bg-blue-100 text-blue-800 border-blue-200',
  Resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Dismissed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusIcon: Record<string, string> = {
  Pending: 'pending',
  Reviewed: 'visibility',
  Resolved: 'check_circle',
  Dismissed: 'block',
};

const AdminPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Reviewed' | 'Resolved' | 'Dismissed'>('All');
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentSessionUser();
      if (user) setCurrentUserId(user.id);
      await fetchReports();
    };
    init();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await getAllReports();
    if (data) setReports(data as UserReport[]);
    setLoading(false);
  };

  const filteredReports = useMemo(() => {
    if (filter === 'All') return reports;
    return reports.filter((r) => r.status === filter);
  }, [reports, filter]);

  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === 'Pending').length;
    const resolvedToday = reports.filter(
      (r) =>
        r.status === 'Resolved' &&
        r.resolved_at &&
        new Date(r.resolved_at).toDateString() === new Date().toDateString()
    ).length;
    const dismissed = reports.filter((r) => r.status === 'Dismissed').length;
    return { total, pending, resolvedToday, dismissed };
  }, [reports]);

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    if (!currentUserId) return;
    setActionBusy(reportId);
    const { error } = await updateReportStatus(reportId, newStatus, currentUserId);
    setActionBusy(null);
    if (error) {
      setToast('Failed to update report: ' + error.message);
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, status: newStatus as UserReport['status'], resolved_by: currentUserId, resolved_at: new Date().toISOString() }
          : r
      )
    );
    if (selectedReport?.id === reportId) {
      setSelectedReport((prev) =>
        prev
          ? { ...prev, status: newStatus as UserReport['status'], resolved_by: currentUserId, resolved_at: new Date().toISOString() }
          : null
      );
    }
    setToast(`Report marked as ${newStatus}`);
    setTimeout(() => setToast(null), 2000);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getAvatar = (url?: string | null, name?: string) =>
    url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Unknown')}`;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="pt-24 pb-16 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="mb-10">
          <span className="font-label text-[0.75rem] uppercase tracking-[0.2em] text-on-primary-container font-bold block mb-2">
            Administration
          </span>
          <h1 className="text-3xl lg:text-4xl font-headline font-extrabold text-primary tracking-[-0.02em]">
            Admin Dashboard
          </h1>
          <p className="text-secondary mt-2 font-light">Manage user reports and monitor platform health.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Reports', value: stats.total, icon: 'flag', color: 'text-blue-700 bg-blue-50 border-blue-100' },
            { label: 'Pending', value: stats.pending, icon: 'pending', color: 'text-amber-700 bg-amber-50 border-amber-100' },
            { label: 'Resolved Today', value: stats.resolvedToday, icon: 'check_circle', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
            { label: 'Dismissed', value: stats.dismissed, icon: 'block', color: 'text-slate-700 bg-slate-50 border-slate-100' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-5 ${s.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-lg">{s.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">{s.label}</span>
              </div>
              <p className="text-2xl font-headline font-extrabold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['All', 'Pending', 'Reviewed', 'Resolved', 'Dismissed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                filter === f
                  ? 'bg-primary-container text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({reports.filter((r) => r.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reports table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">inbox</span>
              <p className="text-slate-500 font-medium">No reports found</p>
              <p className="text-slate-400 text-sm mt-1">
                {filter === 'All' ? 'User reports will appear here when submitted.' : `No ${filter.toLowerCase()} reports.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Reporter</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Reported User</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getAvatar(report.reporter?.avatar_url, report.reporter?.full_name)}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover bg-slate-200"
                          />
                          <span className="text-sm font-semibold text-slate-800">
                            {report.reporter?.full_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getAvatar(report.reported?.avatar_url, report.reported?.full_name)}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover bg-slate-200"
                          />
                          <button
                            onClick={() => navigate(`/profile/${report.reported_id}`)}
                            className="text-sm font-semibold text-slate-800 hover:text-primary-container hover:underline"
                          >
                            {report.reported?.full_name || 'Unknown'}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-700">{report.reason}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            statusColors[report.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[0.875rem]">{statusIcon[report.status]}</span>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(report.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                          >
                            View
                          </button>
                          {report.status !== 'Resolved' && (
                            <button
                              onClick={() => handleStatusChange(report.id, 'Resolved')}
                              disabled={actionBusy === report.id}
                              className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            >
                              Resolve
                            </button>
                          )}
                          {report.status !== 'Dismissed' && (
                            <button
                              onClick={() => handleStatusChange(report.id, 'Dismissed')}
                              disabled={actionBusy === report.id}
                              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          )}
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

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative">
            <div className="bg-slate-950 p-5 flex justify-between items-center text-white">
              <h3 className="font-headline text-lg font-bold">Report Details</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Users */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-2">Reporter</p>
                  <div className="flex items-center gap-2.5">
                    <img
                      src={getAvatar(selectedReport.reporter?.avatar_url, selectedReport.reporter?.full_name)}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover bg-slate-200"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{selectedReport.reporter?.full_name || 'Unknown'}</p>
                      <button
                        onClick={() => { setSelectedReport(null); navigate(`/profile/${selectedReport.reporter_id}`); }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View profile
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-2">Reported User</p>
                  <div className="flex items-center gap-2.5">
                    <img
                      src={getAvatar(selectedReport.reported?.avatar_url, selectedReport.reported?.full_name)}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover bg-slate-200"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{selectedReport.reported?.full_name || 'Unknown'}</p>
                      <button
                        onClick={() => { setSelectedReport(null); navigate(`/profile/${selectedReport.reported_id}`); }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason & Description */}
              <div>
                <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reason</p>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    statusColors[selectedReport.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {selectedReport.reason}
                </span>
              </div>

              <div>
                <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap min-h-[80px]">
                  {selectedReport.description || 'No additional details provided.'}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Submitted: {formatDate(selectedReport.created_at)}</span>
                {selectedReport.resolved_at && (
                  <span>Resolved: {formatDate(selectedReport.resolved_at)}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {selectedReport.status !== 'Resolved' && (
                  <button
                    onClick={() => handleStatusChange(selectedReport.id, 'Resolved')}
                    disabled={actionBusy === selectedReport.id}
                    className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    Mark as Resolved
                  </button>
                )}
                {selectedReport.status !== 'Dismissed' && (
                  <button
                    onClick={() => handleStatusChange(selectedReport.id, 'Dismissed')}
                    disabled={actionBusy === selectedReport.id}
                    className="flex-1 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Mark as Dismissed
                  </button>
                )}
                {selectedReport.status === 'Resolved' || selectedReport.status === 'Dismissed' ? (
                  <button
                    onClick={() => handleStatusChange(selectedReport.id, 'Pending')}
                    disabled={actionBusy === selectedReport.id}
                    className="flex-1 py-2.5 rounded-lg text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    Reopen as Pending
                  </button>
                ) : null}
              </div>
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

export default AdminPage;
