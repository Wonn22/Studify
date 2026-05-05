import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../database/database';
import SideNavBar from '../components/SideNavBar';
import KanbanBoard from '../components/KanbanBoard';
import ResourceSidebar from '../components/ResourceSidebar';
import DiscussionView from '../components/DiscussionView';
import FilesView from '../components/FilesView';

const ProjectWorkspace = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('Board');
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (data) setGroup(data);

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const { data: membership } = await supabase
          .from('group_participants')
          .select('*')
          .eq('group_id', groupId)
          .eq('profile_id', user.id)
          .single();

        setIsMember(!!membership);
      }

      const { count } = await supabase
        .from('group_participants')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      if (count !== null) setParticipantsCount(count);
    };

    if (groupId) fetchGroupDetails();
  }, [groupId]);

  const handleJoinGroup = async () => {
    if (!currentUser || !groupId) return;

    const { error } = await supabase
      .from('group_participants')
      .insert({
        group_id: groupId,
        profile_id: currentUser.id,
        role: 'Member',
        joined_at: new Date().toISOString()
      });

    if (!error) {
      setIsMember(true);
      setParticipantsCount(prev => prev + 1);
    } else {
      console.error("Error joining group:", error);
    }
  };

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
                {group?.category || group?.status || 'Academic Research'}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#001F3F] mb-4">
                {group?.name || 'Loading Project...'}
              </h1>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                You need to join this group to access its Kanban board, discussions, and shared academic files.
              </p>
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                <span className="text-sm font-bold text-slate-600">{participantsCount} Members</span>
              </div>
              <button
                onClick={handleJoinGroup}
                className="w-full py-4 bg-[#001F3F] text-white font-bold rounded-xl hover:bg-blue-950 transition-colors shadow-sm"
              >
                Join Group Workspace
              </button>
            </div>
          </div>
        ) : (
          <>
            <SideNavBar groupId={groupId} activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="ml-64 flex-1 p-10 bg-surface xl:mr-80 flex flex-col min-h-[calc(100vh-4rem)] h-[calc(100vh-4rem)]">
              <header className="mb-8 shrink-0">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                  {group?.category || group?.status || 'Academic Research'}
                </p>
                <h1 className="text-5xl font-extrabold tracking-tighter text-[#001F3F] mb-6">
                  {group?.name || 'Project Alpha'}
                </h1>

                <div className="flex items-center gap-8 py-6 border-t border-b border-slate-200">
                  <div className="flex -space-x-3">
                    <AvatarStack count={participantsCount} />
                  </div>
                  <div className="h-6 w-[1px] bg-slate-200"></div>
                  <div className="flex items-center gap-6">
                    <MetaData label="Deadline" value={group?.deadline || 'No Deadline'} />
                    <MetaData label="Status" value={group?.status || 'Active Research'} />
                  </div>
                </div>
              </header>

              {activeTab === 'Board' && (
                <div className="flex-1 overflow-y-auto min-h-0 pr-4 pb-10">
                  <KanbanBoard groupId={groupId} />
                </div>
              )}
              {activeTab === 'Discussion' && <DiscussionView groupId={groupId} />}
              {activeTab === 'Files' && <FilesView groupId={groupId} />}
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
