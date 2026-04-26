import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/database';

const Navbar = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('Guest');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Scholar';
        setUserName(name);

        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        setAvatarUrl(profile?.avatar_url || null);
      }
    };

    getUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-blue-950 shadow-xl shadow-blue-900/20">
      <div className="flex justify-between items-center w-full px-8 h-20 max-w-none">
        <div className="flex items-center gap-12">
          <span className="text-2xl font-bold tracking-tighter text-white font-headline cursor-pointer" onClick={() => navigate('/dashboard')}>
            Studify
          </span>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
            <button onClick={() => navigate('/dashboard')} className="text-white border-b-2 border-white pb-1">Dashboard</button>
            <button onClick={() => navigate('/match')} className="text-blue-200/70 hover:text-white transition-colors">Find Match</button>
            <button onClick={() => navigate('/groups')} className="text-blue-200/70 hover:text-white transition-colors">Groups</button>
            <button onClick={() => navigate('/messages')} className="text-blue-200/70 hover:text-white transition-colors">Messages</button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-white hover:bg-white/10 rounded-md transition-all p-2 flex items-center justify-center">
            <span className="material-symbols-outlined">notifications</span>
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <button
              onClick={handleSignOut}
              className="text-white hover:bg-white/10 rounded-md transition-all p-2 flex items-center justify-center"
              title="Sign Out"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>

            <img
              alt="User Profile"
              className="w-10 h-10 rounded-full border-2 border-white/20 hover:border-white transition-all cursor-pointer bg-blue-900 object-cover"
              src={avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`}
              onClick={() => navigate('/profile')}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;