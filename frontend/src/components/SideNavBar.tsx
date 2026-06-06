import { useEffect, useState } from 'react';
import { supabase } from '../database/database';

const SideNavBar = ({ groupId, activeTab, setActiveTab }: { groupId?: string; activeTab?: string; setActiveTab?: (tab: string) => void }) => {
  const [members, setMembers] = useState<Array<{ id: string; name: string; avatar: string }>>([]);

  useEffect(() => {
    const fetchMembers = async () => {
        if (!groupId) return;
        const { data } = await supabase
            .from('group_participants')
            .select('profile_id, profiles(full_name, avatar_url)')
            .eq('group_id', groupId);
            
        if (data) {
            setMembers(data.map(d => ({
                id: d.profile_id,
                name: Array.isArray(d.profiles) ? d.profiles[0]?.full_name || 'Unknown' : (d.profiles as any)?.full_name || 'Unknown',
                avatar: Array.isArray(d.profiles) ? d.profiles[0]?.avatar_url : (d.profiles as any)?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.profile_id}`
            })));
        }
    };
    fetchMembers();
  }, [groupId]);

  return (
    <nav className="w-64 h-[calc(100vh-4rem)] fixed left-0 top-16 bg-surface border-r border-slate-100 flex flex-col p-6 font-body z-10 overflow-y-auto">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Workspace</h3>
      <ul className="space-y-2 mb-8">
        <NavItem icon="dashboard" label="Board" active={activeTab === 'Board'} onClick={() => setActiveTab?.('Board')} />
        <NavItem icon="chat" label="Discussion" active={activeTab === 'Discussion'} onClick={() => setActiveTab?.('Discussion')} />
        <NavItem icon="folder" label="Files" active={activeTab === 'Files'} onClick={() => setActiveTab?.('Files')} />
      </ul>

      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Members ({members.length})</h3>
      <ul className="space-y-4">
        {members.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No members yet.</p>
        ) : (
            members.map(member => (
                <li key={member.id} className="flex items-center gap-3 group cursor-pointer">
                    <div className="relative">
                        <img className="w-8 h-8 rounded-full bg-slate-200 object-cover" src={member.avatar} alt={member.name} />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-[#001F3F] transition-colors truncate">
                        {member.name.split(' ')[0]}
                    </span>
                </li>
            ))
        )}
      </ul>
    </nav>
  );
};

const NavItem = ({ icon, label, active = false, onClick }: { icon: string, label: string, active?: boolean, onClick?: () => void }) => (
  <li>
    <button onClick={(e) => { e.preventDefault(); onClick?.(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-[#001F3F] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#001F3F]'}`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
      {label}
    </button>
  </li>
);

export default SideNavBar;
