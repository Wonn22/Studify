import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../database/database';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string>('Admin');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin';
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
    } catch {
      navigate('/login');
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-slate-900 shadow-xl shadow-slate-900/20">
      <div className="flex justify-between items-center w-full px-8 h-20 max-w-none">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tighter text-white font-headline cursor-pointer" onClick={() => navigate('/admin')}>
              Studify
            </span>
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[0.65rem] font-bold uppercase tracking-wider rounded border border-red-500/30">
              Admin
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
            <button
              onClick={() => navigate('/admin')}
              className={`pb-1 border-b-2 transition-colors ${location.pathname === '/admin' ? 'text-white border-white' : 'text-slate-400 border-transparent hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-sm align-middle mr-1">flag</span>
              Reports
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className={`pb-1 border-b-2 transition-colors ${location.pathname === '/admin/users' ? 'text-white border-white' : 'text-slate-400 border-transparent hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-sm align-middle mr-1">group</span>
              Users
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5"
            title="Back to User View"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            User View
          </button>

          <div className="h-6 w-[1px] bg-slate-700" />

          <button
            onClick={handleSignOut}
            className="text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-all p-2 flex items-center justify-center"
            title="Sign Out"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>

          <img
            alt="Admin Profile"
            className="w-10 h-10 rounded-full border-2 border-white/20 hover:border-white transition-all cursor-pointer bg-slate-800 object-cover"
            src={avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`}
            onClick={() => navigate('/profile')}
          />
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
