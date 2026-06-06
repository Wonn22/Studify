import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../database/database';
import {
  getCurrentSessionUser,
  getUnreadNotificationCount,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../security/dataAccess';

interface Notif {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  reference_id?: string | null;
  sender?: { full_name?: string; avatar_url?: string } | null;
}

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string>('Guest');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUserData = async () => {
      const user = await getCurrentSessionUser();
      if (user) {
        setUserId(user.id);
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

  useEffect(() => {
    if (!userId) return;

    const fetchCount = async () => {
      const count = await getUnreadNotificationCount(userId);
      setUnreadCount(count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 15000);

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notif;
          setUnreadCount(prev => prev + 1);
          setNotifications(prev => [newNotif, ...prev].slice(0, 15));
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNotifs = async () => {
    const willOpen = !notifsOpen;
    setNotifsOpen(willOpen);

    if (willOpen && userId) {
      const data = await getNotifications(userId, 15);
      setNotifications(data as Notif[]);
    }
  };

  const handleNotifClick = async (notif: Notif) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    setNotifsOpen(false);

    switch (notif.type) {
      case 'friend_request':
      case 'friend_accepted':
        navigate('/connections');
        break;
      case 'session_join_request':
      case 'session_join_accepted':
      case 'session_join_rejected':
        navigate('/browse-sessions');
        break;
      case 'task_assigned':
        if (notif.reference_id) {
          const { data } = await supabase.from('tasks').select('group_id').eq('id', notif.reference_id).single();
          if (data?.group_id) navigate(`/groups/${data.group_id}`);
        }
        break;
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await markAllNotificationsAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-blue-950 shadow-xl shadow-blue-900/20">
      <div className="flex justify-between items-center w-full px-8 h-20 max-w-none">
        <div className="flex items-center gap-12">
          <span className="text-2xl font-bold tracking-tighter text-white font-headline cursor-pointer" onClick={() => navigate('/dashboard')}>
            Studify
          </span>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
            <button 
              onClick={() => navigate('/dashboard')} 
              className={`pb-1 border-b-2 transition-colors ${location.pathname.startsWith('/dashboard') ? 'text-white border-white' : 'text-blue-200/70 border-transparent hover:text-white'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => navigate('/match')} 
              className={`pb-1 border-b-2 transition-colors ${location.pathname.startsWith('/match') ? 'text-white border-white' : 'text-blue-200/70 border-transparent hover:text-white'}`}
            >
              Find Match
            </button>
            <button 
              onClick={() => navigate('/groups')} 
              className={`pb-1 border-b-2 transition-colors ${location.pathname.startsWith('/groups') ? 'text-white border-white' : 'text-blue-200/70 border-transparent hover:text-white'}`}
            >
              Groups
            </button>
            <button 
              onClick={() => navigate('/messages')} 
              className={`pb-1 border-b-2 transition-colors ${location.pathname.startsWith('/messages') ? 'text-white border-white' : 'text-blue-200/70 border-transparent hover:text-white'}`}
            >
              Messages
            </button>
            <button 
              onClick={() => navigate('/connections')} 
              className={`pb-1 border-b-2 transition-colors ${location.pathname.startsWith('/connections') ? 'text-white border-white' : 'text-blue-200/70 border-transparent hover:text-white'}`}
            >
              Connections
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={toggleNotifs}
              className="relative text-white hover:bg-white/10 rounded-md transition-all p-2 flex items-center justify-center"
              title="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[100]" style={{ animation: 'notif-dropdown 0.15s ease-out' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-primary-container font-semibold hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex gap-3 ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                          <img
                            src={notif.sender?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(notif.sender?.full_name || 'User')}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 leading-snug">
                            {notif.message}
                          </p>
                          <span className="text-[11px] text-slate-400 font-medium">{timeAgo(notif.created_at)}</span>
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-primary-container rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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

      <style>{`
        @keyframes notif-dropdown {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
