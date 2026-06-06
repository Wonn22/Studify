import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '../database/database';
import { useNavigate } from 'react-router-dom';
import { isValidUuid, sendFriendRequest, acceptFriendRequest, cancelFriendRequest, createNotification } from '../security/dataAccess';

interface Profile {
  id: string;
  full_name: string;
  major: string;
  interests: string[];
  bio: string;
  avatar_url: string;
  friendship_status?: 'Pending' | 'Accepted' | 'Declined' | 'Blocked' | null;
  is_requester?: boolean;
}

const FindPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProfiles = profiles.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchName = p.full_name?.toLowerCase().includes(query);
    const matchMajor = p.major?.toLowerCase().includes(query);
    const matchInterests = p.interests?.some(interest => interest.toLowerCase().includes(query));
    
    return matchName || matchMajor || matchInterests;
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate('/login');
        return;
      }
      setCurrentUser(user);
      setCurrentUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'A user');

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (allProfiles) {
        const mappedProfiles = allProfiles.map((p: any) => {
          const friendship = friendships?.find(
            (f: any) => f.requester_id === p.id || f.addressee_id === p.id
          );
          return {
            ...p,
            friendship_status: friendship?.status || null,
            is_requester: friendship?.requester_id === user.id
          };
        });
        setProfiles(mappedProfiles as Profile[]);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, [navigate]);

  const handleRequestMatch = async (profileId: string) => {
    if (!currentUser) return;
    if (!isValidUuid(profileId) || profileId === currentUser.id) return;

    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, friendship_status: 'Pending', is_requester: true } : p));

    const { error } = await sendFriendRequest(currentUser.id, profileId);

    if (error) {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, friendship_status: null } : p));
    } else {
      await createNotification({
        recipient_id: profileId,
        sender_id: currentUser.id,
        type: 'friend_request',
        message: `${currentUserName} sent you a friend request`,
      });
    }
  };

  const handleAcceptMatch = async (profileId: string) => {
    if (!currentUser) return;
    if (!isValidUuid(profileId) || profileId === currentUser.id) return;

    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, friendship_status: 'Accepted' } : p));

    const { error } = await acceptFriendRequest(currentUser.id, profileId);

    if (error) {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, friendship_status: 'Pending' } : p));
    }
  };

  const handleCancelMatch = async (profileId: string) => {
    if (!currentUser) return;
    if (!isValidUuid(profileId) || profileId === currentUser.id) return;

    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, friendship_status: null, is_requester: false } : p));

    const { error } = await cancelFriendRequest(currentUser.id, profileId);

    if (error) {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, friendship_status: 'Pending', is_requester: true } : p));
    }
  };

  const getAvatar = (url?: string, name?: string) => 
    url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Unknown')}`;

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
    );
  }

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-container selection:text-white min-h-screen flex flex-col">
      <Navbar />

      <div className="max-w-[1440px] mx-auto flex flex-1 w-full pt-20">
        <main className="flex-1 p-8 lg:p-12 bg-surface">
          
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-4xl">
              <span className="font-label text-[0.75rem] uppercase tracking-[0.2em] text-on-primary-container font-bold block mb-2">
                Discovery Portal
              </span>
              <h1 className="text-4xl lg:text-5xl font-headline font-extrabold text-primary editorial-header mb-4 tracking-[-0.02em]">
                Find Your Academic Match.
              </h1>
              <p className="text-secondary text-lg font-light leading-relaxed">
                Connecting scholars across disciplines for collaborative research and peer-led study sessions.
              </p>
            </div>

            <div className="relative w-full md:w-80 flex-shrink-0">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                type="text"
                placeholder="Search by name, major, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001F3F] focus:border-transparent text-sm font-medium shadow-sm transition-all"
              />
            </div>
          </div>

          {filteredProfiles.length === 0 && !loading && (
            <div className="text-center py-20 bg-surface-container-lowest rounded-xl border border-dashed border-slate-300">
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">search_off</span>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No matches found</h3>
              <p className="text-slate-500">We couldn't find anyone matching "{searchQuery}". Try a different name.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            
            {filteredProfiles.map((profile) => (
              <div 
                key={profile.id} 
                className="bg-surface-container-lowest p-6 rounded-lg relative overflow-visible group transition-all duration-300 hover:translate-y-[-4px]"
              >
                <div className="absolute -top-4 -left-4 w-16 h-16 rounded-lg overflow-hidden shadow-lg z-10 border-4 border-white bg-slate-200">
                  <img 
                    alt={profile.full_name} 
                    className="w-full h-full object-cover" 
                    src={getAvatar(profile.avatar_url, profile.full_name)} 
                  />
                </div>
                <div className="pl-14 pt-2">
                  <h3 className="text-xl font-headline font-bold text-primary-container cursor-pointer hover:underline" onClick={() => navigate(`/profile/${profile.id}`)}>{profile.full_name}</h3>
                  <p className="font-label text-xs uppercase tracking-wider text-slate-400 mt-1">{profile.major || 'Undeclared'}</p>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(profile.interests || []).map((tag, index) => (
                      <span 
                        key={index} 
                        className="px-2 py-1 bg-surface-container-low text-[0.65rem] font-bold rounded uppercase tracking-tighter"
                      >
                        {tag}
                      </span>
                    ))}
                    {(!profile.interests || profile.interests.length === 0) && (
                      <span className="text-xs text-slate-400 italic">No specific interests listed.</span>
                    )}
                  </div>
                  <p className="text-sm text-secondary line-clamp-2 min-h-[40px]">
                    {profile.bio || 'This student has not written a bio yet.'}
                  </p>
                  
                  {profile.friendship_status === 'Pending' ? (
                    profile.is_requester ? (
                      <button onClick={() => handleCancelMatch(profile.id)} className="w-full bg-slate-200 text-slate-500 py-2.5 rounded-md text-sm font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-2">
                        Cancel Request
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    ) : (
                      <button onClick={() => handleAcceptMatch(profile.id)} className="w-full bg-emerald-100 text-emerald-800 border border-emerald-300 py-2.5 rounded-md text-sm font-bold hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2">
                        Accept Request
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                      </button>
                    )
                  ) : profile.friendship_status === 'Accepted' ? (
                    <button onClick={() => navigate('/messages')} className="w-full bg-blue-50 text-blue-800 border border-blue-200 py-2.5 rounded-md text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                      Message
                      <span className="material-symbols-outlined text-sm">chat</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleRequestMatch(profile.id)}
                      className="w-full bg-primary-container text-white py-2.5 rounded-md text-sm font-bold hover:bg-primary transition-colors flex items-center justify-center gap-2"
                    >
                      Request Match
                      <span className="material-symbols-outlined text-sm">bolt</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <footer className="w-full flex flex-col items-center gap-6 px-8 py-12 bg-[#000613] text-white">
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
    </div>
  );
};

export default FindPage;
