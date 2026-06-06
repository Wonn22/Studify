import { useEffect, useState } from 'react';
import GroupCard from '../components/GroupCard';
import Navbar from '../components/Navbar';
import { supabase } from '../database/database';
import { useNavigate } from 'react-router-dom';
import CreateGroupModal from '../components/CreateGroupModal';
import { getCurrentSessionUser, getEffectiveGroupStatus } from '../security/dataAccess';

const GroupsPage = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All Statuses");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      const user = await getCurrentSessionUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*');

      if (groupsError) {
        console.error("Error fetching groups:", groupsError);
        setLoadError('Unable to load groups. Check your Supabase connection and refresh the page.');
        setLoading(false);
        return;
      }

      let participantsData: any = [];
      const { data: pData, error: pError } = await supabase
        .from('group_participants')
        .select('*');
        
      if (!pError && pData) {
        participantsData = pData;
      }

      const fallbackImages = [
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1577412647305-991150c7d163?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000&auto=format&fit=crop"
      ];

      const formattedGroups = (groupsData || []).map((g, index) => {
        const status = getEffectiveGroupStatus(g.status, g.deadline);
        const img = g.image_url || fallbackImages[index % fallbackImages.length];
        const members = participantsData.filter((p: any) => p.group_id === g.id).length;
        
        const description = g.description || '';
        const words = g.name.split(' ');
        const fallbackCode = words.length > 1
          ? `${words[0].substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900) + 100}`
          : `${g.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900) + 100}`;
        const code = description || fallbackCode;

        return {
          id: g.id,
          code,
          title: g.name,
          members,
          status,
          img,
          groupUrl: g.group_url
        };
      });

      setGroups(formattedGroups);
      setLoadError(null);
      setLoading(false);
    };

    fetchGroups();
  }, [navigate]);

  const filteredGroups = activeFilter === "All Statuses"
    ? groups 
    : groups.filter(g => g.status === activeFilter);

  const dynamicStatuses = ["All Statuses", ...Array.from(new Set(groups.map(g => g.status)))];

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body flex flex-col">
      <Navbar />
      
      <main className="pt-32 pb-24 px-8 max-w-[1440px] mx-auto w-full flex-1">
        <div className="mb-12">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-on-primary-container mb-2 block">
            Academic Workspace
          </span>
          <h1 className="text-5xl font-extrabold text-primary tracking-tight font-headline">
            Study Groups
          </h1>
          <p className="mt-4 text-secondary max-w-2xl leading-relaxed">
            Collaborate with peers in your specific courses. Share research, coordinate laboratory work, 
            and prepare for final assessments in a focused scholarly environment.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3 space-y-8">
            <div className="bg-surface-container-low p-6 rounded-xl">
              <h3 className="font-headline font-bold text-lg mb-4 text-primary">Filters</h3>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {dynamicStatuses.map(status => (
                    <button
                      key={status as string}
                      onClick={() => setActiveFilter(status as string)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        activeFilter === status
                        ? 'bg-[#001F3F] text-white' 
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                    >
                      {status as string}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#001F3F] text-white shadow-lg shadow-blue-900/10">
              <h3 className="font-headline font-bold text-lg mb-2">Create New Group</h3>
              <p className="text-sm text-blue-100 mb-4">Can't find your specific course? Start a new academic circle.</p>
              <button onClick={() => setIsCreateModalOpen(true)} className="w-full py-3 bg-white text-[#001F3F] font-bold rounded-md hover:shadow-xl transition-all">
                Initialize Group
              </button>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9">
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                </div>
            ) : loadError ? (
                <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-xl border border-dashed border-red-200">
                    <span className="material-symbols-outlined text-5xl text-red-300 mb-4">cloud_off</span>
                    <h3 className="text-xl font-bold text-red-700">Groups unavailable</h3>
                    <p className="text-red-500 mt-2">{loadError}</p>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest rounded-xl border border-dashed border-slate-200">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">group_off</span>
                    <h3 className="text-xl font-bold text-slate-600">No groups found</h3>
                    <p className="text-slate-400 mt-2">Try adjusting your filters or create a new group.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredGroups.map(group => (
                    <GroupCard 
                    key={group.id}
                    id={group.id}
                    courseCode={group.code}
                    title={group.title}
                    memberCount={group.members}
                    imageUrl={group.img}
                    />
                ))}
                </div>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full flex flex-col items-center gap-6 px-8 py-12 bg-[#000613] text-white mt-auto">
        <div className="flex flex-col md:flex-row justify-between w-full max-w-7xl items-center gap-8">
          <div className="flex flex-col gap-2 items-center md:items-start">
            <span className="text-white font-black text-xl tracking-tighter">Studify</span>
            <p className="font-body text-[0.75rem] tracking-wide text-slate-400 max-w-xs text-center md:text-left">
              © 2024 Studify Academic Atelier. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Privacy Policy</a>
            <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Terms of Service</a>
            <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Research Ethics</a>
            <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Contact Support</a>
          </div>
        </div>
        <div className="w-full max-w-7xl border-t border-white/5 pt-8 flex justify-center">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[1rem]">language</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[1rem]">share</span>
            </div>
          </div>
        </div>
      </footer>

      <CreateGroupModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
};

export default GroupsPage;
