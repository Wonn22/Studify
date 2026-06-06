import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../database/database';
import SideNavBar from '../components/SideNavBar';
import KanbanBoard from '../components/KanbanBoard';
import ResourceSidebar from '../components/ResourceSidebar';
import DiscussionView from '../components/DiscussionView';
import FilesView from '../components/FilesView';
import { getCurrentSessionUser, getEffectiveGroupStatus, isValidUuid, isGroupAdmin } from '../security/dataAccess';

interface JoinRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_avatar: string | null;
  created_at: string;
}

const ProjectWorkspace = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('Board');
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const effectiveStatus = getEffectiveGroupStatus(group?.status, group?.deadline);
  const isReadOnly = effectiveStatus === 'Completed';
  const canPauseGroup = isAdmin && effectiveStatus !== 'Completed';

  const fetchGroupDetails = async () => {
    if (!isValidUuid(groupId)) {
      setIsMember(false);
      setLoadError('Invalid group link.');
      return;
    }

    const { data, error } = await supabase
      .from('groups')
      .select('*, created_by')
      .eq('id', groupId)
      .maybeSingle();

    if (error) {
      setLoadError('Unable to load this group. Check your Supabase connection and try again.');
      setIsMember(false);
      return;
    }

    if (!data) {
      setLoadError('This group no longer exists or is not available.');
      setIsMember(false);
      return;
    }

    const effectiveStatus = getEffectiveGroupStatus(data.status, data.deadline);
    setGroup({ ...data, status: effectiveStatus });

    if (effectiveStatus === 'Completed' && data.status !== 'Completed') {
      await supabase
        .from('groups')
        .update({ status: 'Completed' })
        .eq('id', groupId);
    }

    const user = await getCurrentSessionUser();
    if (!user) {
      navigate('/login');
      return;
    }

    setCurrentUser(user);

    const { data: membership } = await supabase
      .from('group_participants')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('profile_id', user.id)
      .maybeSingle();

    const member = !!membership;
    setIsMember(member);

    const admin = await isGroupAdmin(groupId, user.id);
    setIsAdmin(admin);

    const { count } = await supabase
      .from('group_participants')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (count !== null) setParticipantsCount(count);

    if (admin) {
      const { data: reqData } = await supabase
        .from('group_join_requests')
        .select('id, requester_id, created_at, requester:profiles!group_join_requests_requester_id_fkey(full_name, avatar_url)')
        .eq('group_id', groupId)
        .eq('status', 'Pending');

      if (reqData) {
        setPendingRequests(reqData.map((r: any) => ({
          id: r.id,
          requester_id: r.requester_id,
          requester_name: Array.isArray(r.requester) ? r.requester[0]?.full_name : r.requester?.full_name || 'Scholar',
          requester_avatar: Array.isArray(r.requester) ? r.requester[0]?.avatar_url : r.requester?.avatar_url || null,
          created_at: r.created_at,
        })));
      }
    } else if (!member && data.is_private) {
      const { data: myReq } = await supabase
        .from('group_join_requests')
        .select('id')
        .eq('group_id', groupId)
        .eq('requester_id', user.id)
        .eq('status', 'Pending')
        .maybeSingle();
      setHasPendingRequest(!!myReq);
    }
  };

  useEffect(() => {
    if (groupId) fetchGroupDetails();
  }, [groupId, navigate]);

  useEffect(() => {
    if (!groupId || !currentUser) return;

    const channel = supabase
      .channel('group-join-requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_join_requests' },
        () => {
          fetchGroupDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, currentUser]);

  const handleJoinGroup = async () => {
    if (!currentUser || !groupId) return;

    if (group?.is_private) {
      setBusyAction('request');
      const { error } = await supabase
        .from('group_join_requests')
        .upsert({
          group_id: groupId,
          requester_id: currentUser.id,
          host_id: group.created_by,
          status: 'Pending',
        }, { onConflict: 'group_id,requester_id' });

      if (!error) {
        setHasPendingRequest(true);
        setLoadError(null);
      } else {
        setLoadError(error.message || 'Unable to request to join this group.');
      }
      setBusyAction(null);
      return;
    }

    const { error } = await supabase
      .from('group_participants')
      .upsert({
        group_id: groupId,
        profile_id: currentUser.id,
        role: 'Member',
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'group_id,profile_id',
        ignoreDuplicates: true
      });

    if (!error) {
      setIsMember(true);
      setLoadError(null);
      setParticipantsCount(prev => prev + 1);
    } else {
      setLoadError(error.message || 'Unable to join this group.');
    }
  };

  const handleAcceptRequest = async (request: JoinRequest) => {
    if (!currentUser || !groupId) return;
    setBusyAction(`accept:${request.id}`);

    const { error: partError } = await supabase
      .from('group_participants')
      .upsert({
        group_id: groupId,
        profile_id: request.requester_id,
        role: 'Member',
        joined_at: new Date().toISOString(),
      }, { onConflict: 'group_id,profile_id', ignoreDuplicates: true });

    if (partError) {
      setLoadError(partError.message || 'Failed to add member.');
      setBusyAction(null);
      return;
    }

    const { error: updateError } = await supabase
      .from('group_join_requests')
      .update({ status: 'Accepted', decided_at: new Date().toISOString() })
      .eq('id', request.id);

    if (!updateError) {
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      setParticipantsCount(prev => prev + 1);
    }

    setBusyAction(null);
  };

  const handleRejectRequest = async (request: JoinRequest) => {
    if (!currentUser || !groupId) return;
    setBusyAction(`reject:${request.id}`);

    const { error } = await supabase
      .from('group_join_requests')
      .update({ status: 'Rejected', decided_at: new Date().toISOString() })
      .eq('id', request.id);

    if (!error) {
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    }

    setBusyAction(null);
  };

  const handleTogglePause = async () => {
    if (!group || !canPauseGroup) return;

    const nextStatus = effectiveStatus === 'Paused' ? 'Active Research' : 'Paused';
    const { error } = await supabase
      .from('groups')
      .update({ status: nextStatus })
      .eq('id', group.id);

    if (error) {
      setLoadError(error.message || 'Unable to update group status.');
      return;
    }

    setGroup((prev: any) => prev ? { ...prev, status: nextStatus } : prev);
    setLoadError(null);
  };

  const getAvatar = (url?: string | null, name?: string) =>
    url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Unknown')}`;

  if (isMember === null) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001F3F]"></div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body">
      <nav className="flex items-center gap-4 w-full px-6 h-16 border-b border-slate-100 bg-white/80 backdrop-blur-xl fixed top-0 z-50">
        <button
          onClick={() => navigate('/groups')}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-900">arrow_back</span>
        </button>
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold font-headline text-slate-900 leading-tight">Back to Group List</h2>
          <p className="text-xs text-slate-500 font-medium font-body">
            {group?.name || 'Loading...'} • Academic Workspace
          </p>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto flex min-h-[calc(100vh-4rem)] pt-16">
        {!isMember ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 mt-20">
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center max-w-lg w-full">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">group</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                {group?.description || effectiveStatus || 'Academic Research'}
                {group?.is_private && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                    <span className="material-symbols-outlined text-xs">lock</span> Private
                  </span>
                )}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#001F3F] mb-4">
                {group?.name || 'Loading Project...'}
              </h1>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                {loadError || (group?.is_private
                  ? 'This is a private group. Request to join and wait for admin approval.'
                  : 'You need to join this group to access its Kanban board, discussions, and shared academic files.')}
              </p>
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                <span className="text-sm font-bold text-slate-600">{participantsCount} Members</span>
              </div>
              <button
                onClick={handleJoinGroup}
                disabled={!!busyAction || (!!loadError && !group)}
                className="w-full py-4 bg-[#001F3F] text-white font-bold rounded-xl hover:bg-blue-950 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busyAction === 'request' ? (
                  <><span className="material-symbols-outlined animate-spin">sync</span> Sending Request...</>
                ) : hasPendingRequest ? (
                  <><span className="material-symbols-outlined">schedule</span> Request Pending</>
                ) : group?.is_private ? (
                  <><span className="material-symbols-outlined">send</span> Request to Join</>
                ) : (
                  <><span className="material-symbols-outlined">login</span> Join Group Workspace</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            <SideNavBar groupId={groupId} activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="ml-64 flex-1 p-10 bg-surface xl:mr-80 flex flex-col min-h-[calc(100vh-4rem)] h-[calc(100vh-4rem)]">
              <header className="mb-8 shrink-0">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                  {group?.description || group?.status || 'Academic Research'}
                  {group?.is_private && (
                    <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                      <span className="material-symbols-outlined text-xs">lock</span> Private
                    </span>
                  )}
                </p>
                {isReadOnly && (
                  <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    This project is completed. View-only mode.
                  </div>
                )}
                {effectiveStatus === 'Paused' && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2 text-amber-700 text-sm font-semibold">
                    <span className="material-symbols-outlined text-base">pause_circle</span>
                    This project is paused.
                  </div>
                )}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <h1 className="text-5xl font-extrabold tracking-tighter text-[#001F3F]">
                    {group?.name || 'Project Alpha'}
                  </h1>
                  {canPauseGroup && (
                    <button
                      onClick={handleTogglePause}
                      className="shrink-0 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-[#001F3F] hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {effectiveStatus === 'Paused' ? 'play_arrow' : 'pause'}
                      </span>
                      {effectiveStatus === 'Paused' ? 'Resume Group' : 'Pause Group'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-8 py-6 border-t border-b border-slate-200">
                  <div className="flex -space-x-3">
                    <AvatarStack count={participantsCount} />
                  </div>
                  <div className="h-6 w-[1px] bg-slate-200"></div>
                  <div className="flex items-center gap-6">
                    <MetaData label="Deadline" value={group?.deadline || 'No Deadline'} />
                    <MetaData label="Status" value={effectiveStatus} />
                  </div>
                </div>
              </header>

              {isAdmin && pendingRequests.length > 0 && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 shrink-0">
                  <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">person_add</span>
                    Pending Join Requests ({pendingRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatar(req.requester_avatar, req.requester_name)}
                            alt={req.requester_name}
                            className="w-8 h-8 rounded-full object-cover bg-slate-200"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{req.requester_name}</p>
                            <p className="text-xs text-slate-400">Requested to join</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req)}
                            disabled={busyAction === `accept:${req.id}`}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">check</span> Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req)}
                            disabled={busyAction === `reject:${req.id}`}
                            className="px-3 py-1.5 bg-slate-200 text-slate-600 text-xs font-bold rounded hover:bg-slate-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">close</span> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Board' && (
                <div className="flex-1 overflow-y-auto min-h-0 pr-4 pb-10">
                  <KanbanBoard groupId={groupId} readOnly={isReadOnly} />
                </div>
              )}
              {activeTab === 'Discussion' && <DiscussionView groupId={groupId} readOnly={isReadOnly} />}
              {activeTab === 'Files' && <FilesView groupId={groupId} readOnly={isReadOnly} />}
            </main>

            <ResourceSidebar groupId={groupId} />
          </>
        )}
      </div>
    </div>
  );
};

const MetaData = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    <p className="text-sm font-semibold text-[#001F3F]">{value}</p>
  </div>
);

const AvatarStack = ({ count }: { count: number }) => {
  const displayCount = Math.min(count, 3);
  const remainder = count - displayCount;
  return (
    <>
      {[...Array(displayCount)].map((_, i) => (
        <img
          key={i}
          className="w-10 h-10 rounded-full border-2 border-white object-cover bg-slate-200"
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 20}`}
          alt="member"
        />
      ))}
      {remainder > 0 && (
        <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600">
          +{remainder}
        </div>
      )}
    </>
  );
};

export default ProjectWorkspace;
