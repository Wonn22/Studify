import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '../database/database';
import { useNavigate } from 'react-router-dom';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  type FriendshipStatus,
} from '../security/dataAccess';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  major: string | null;
}

interface FriendshipRow {
  id: string;
  status: FriendshipStatus['status'];
  requester_id: string;
  addressee_id: string;
}

interface ConnectionItem {
  friendshipId: string;
  status: FriendshipStatus['status'];
  profile: Profile;
  direction: 'incoming' | 'outgoing' | 'friend';
}

const getAvatar = (url?: string | null, name?: string) =>
  url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Unknown')}`;

const ConnectionsPage = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<ConnectionItem[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<ConnectionItem[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUserId(user.id);

      const { data: rows } = await supabase
        .from('friendships')
        .select('id, status, requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .in('status', ['Accepted', 'Pending']);

      if (!rows || rows.length === 0) {
        setFriends([]);
        setPendingIncoming([]);
        setPendingOutgoing([]);
        setLoading(false);
        return;
      }

      const profileIds = new Set<string>();
      rows.forEach((r: FriendshipRow) => {
        profileIds.add(r.requester_id);
        profileIds.add(r.addressee_id);
      });
      profileIds.delete(user.id);

      let profileMap = new Map<string, Profile>();
      if (profileIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, major')
          .in('id', Array.from(profileIds));

        profilesData?.forEach((p: Profile) => profileMap.set(p.id, p));
      }

      const accepted: ConnectionItem[] = [];
      const incoming: ConnectionItem[] = [];
      const outgoing: ConnectionItem[] = [];

      rows.forEach((row: FriendshipRow) => {
        const otherId = row.requester_id === user.id ? row.addressee_id : row.requester_id;
        const profile = profileMap.get(otherId);
        if (!profile) return;

        const item: ConnectionItem = {
          friendshipId: row.id,
          status: row.status,
          profile,
          direction:
            row.status === 'Accepted'
              ? 'friend'
              : row.requester_id === user.id
                ? 'outgoing'
                : 'incoming',
        };

        if (item.direction === 'friend') accepted.push(item);
        else if (item.direction === 'incoming') incoming.push(item);
        else outgoing.push(item);
      });

      setFriends(accepted);
      setPendingIncoming(incoming);
      setPendingOutgoing(outgoing);
    } catch {
      setFriends([]);
      setPendingIncoming([]);
      setPendingOutgoing([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [navigate]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('friendships-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          fetchConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleAccept = async (item: ConnectionItem) => {
    if (!currentUserId) return;
    setPendingIncoming(prev => prev.filter(p => p.friendshipId !== item.friendshipId));
    setFriends(prev => [...prev, { ...item, status: 'Accepted', direction: 'friend' }]);

    const { error } = await acceptFriendRequest(currentUserId, item.profile.id);
    if (error) {
      setFriends(prev => prev.filter(p => p.friendshipId !== item.friendshipId));
      setPendingIncoming(prev => [...prev, item]);
    }
  };

  const handleCancel = async (item: ConnectionItem) => {
    if (!currentUserId) return;
    setPendingOutgoing(prev => prev.filter(p => p.friendshipId !== item.friendshipId));

    const { error } = await cancelFriendRequest(currentUserId, item.profile.id);
    if (error) {
      setPendingOutgoing(prev => [...prev, item]);
    }
  };

  const handleDecline = async (item: ConnectionItem) => {
    if (!currentUserId) return;
    setPendingIncoming(prev => prev.filter(p => p.friendshipId !== item.friendshipId));

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', item.friendshipId);

    if (error) {
      setPendingIncoming(prev => [...prev, item]);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-container selection:text-white min-h-screen flex flex-col">
      <Navbar />

      <div className="max-w-[1440px] mx-auto flex flex-1 w-full pt-20">
        <main className="flex-1 p-8 lg:p-12 bg-surface">
          <div className="mb-12">
            <span className="font-label text-[0.75rem] uppercase tracking-[0.2em] text-on-primary-container font-bold block mb-2">
              Social Network
            </span>
            <h1 className="text-4xl lg:text-5xl font-headline font-extrabold text-primary editorial-header mb-4 tracking-[-0.02em]">
              My Connections.
            </h1>
            <p className="text-secondary text-lg font-light leading-relaxed">
              Manage your study partners, pending requests, and collaborations.
            </p>
          </div>

          {/* Pending Requests */}
          {(pendingIncoming.length > 0 || pendingOutgoing.length > 0) && (
            <section className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <span className="text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase">Pending</span>
                <div className="h-[1px] flex-grow bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {pendingIncoming.map(item => (
                  <div key={item.friendshipId} className="bg-surface-container-lowest p-6 rounded-lg relative overflow-visible group transition-all duration-300 hover:translate-y-[-4px] border border-amber-200/50">
                    <div className="absolute -top-4 -left-4 w-16 h-16 rounded-lg overflow-hidden shadow-lg z-10 border-4 border-white bg-slate-200">
                      <img
                        alt={item.profile.full_name}
                        className="w-full h-full object-cover"
                        src={getAvatar(item.profile.avatar_url, item.profile.full_name)}
                      />
                    </div>
                    <div className="pl-14 pt-2">
                      <h3
                        className="text-xl font-headline font-bold text-primary-container cursor-pointer hover:underline"
                        onClick={() => navigate(`/profile/${item.profile.id}`)}
                      >
                        {item.profile.full_name}
                      </h3>
                      <p className="font-label text-xs uppercase tracking-wider text-slate-400 mt-1">{item.profile.major || 'Undeclared'}</p>
                    </div>
                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => handleAccept(item)}
                        className="flex-1 bg-emerald-600 text-white py-2.5 rounded-md text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span> Accept
                      </button>
                      <button
                        onClick={() => handleDecline(item)}
                        className="flex-1 bg-slate-200 text-slate-600 py-2.5 rounded-md text-sm font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">close</span> Decline
                      </button>
                    </div>
                  </div>
                ))}

                {pendingOutgoing.map(item => (
                  <div key={item.friendshipId} className="bg-surface-container-lowest p-6 rounded-lg relative overflow-visible group transition-all duration-300 hover:translate-y-[-4px] border border-slate-200">
                    <div className="absolute -top-4 -left-4 w-16 h-16 rounded-lg overflow-hidden shadow-lg z-10 border-4 border-white bg-slate-200">
                      <img
                        alt={item.profile.full_name}
                        className="w-full h-full object-cover"
                        src={getAvatar(item.profile.avatar_url, item.profile.full_name)}
                      />
                    </div>
                    <div className="pl-14 pt-2">
                      <h3
                        className="text-xl font-headline font-bold text-primary-container cursor-pointer hover:underline"
                        onClick={() => navigate(`/profile/${item.profile.id}`)}
                      >
                        {item.profile.full_name}
                      </h3>
                      <p className="font-label text-xs uppercase tracking-wider text-slate-400 mt-1">{item.profile.major || 'Undeclared'}</p>
                    </div>
                    <div className="mt-6">
                      <button
                        onClick={() => handleCancel(item)}
                        className="w-full bg-slate-200 text-slate-500 py-2.5 rounded-md text-sm font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">close</span> Cancel Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Friends */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <span className="text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase">Friends</span>
              <div className="h-[1px] flex-grow bg-slate-200" />
            </div>

            {friends.length === 0 ? (
              <div className="text-center py-20 bg-surface-container-lowest rounded-xl border border-dashed border-slate-300">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">group</span>
                <h3 className="text-xl font-bold text-slate-700 mb-2">No connections yet</h3>
                <p className="text-slate-500 mb-6">Start building your academic network by finding study partners.</p>
                <button
                  onClick={() => navigate('/match')}
                  className="px-6 py-3 bg-primary-container text-white rounded-lg font-semibold hover:bg-primary transition-colors"
                >
                  Find Matches
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {friends.map(item => (
                  <div key={item.friendshipId} className="bg-surface-container-lowest p-6 rounded-lg relative overflow-visible group transition-all duration-300 hover:translate-y-[-4px]">
                    <div className="absolute -top-4 -left-4 w-16 h-16 rounded-lg overflow-hidden shadow-lg z-10 border-4 border-white bg-slate-200">
                      <img
                        alt={item.profile.full_name}
                        className="w-full h-full object-cover"
                        src={getAvatar(item.profile.avatar_url, item.profile.full_name)}
                      />
                    </div>
                    <div className="pl-14 pt-2">
                      <h3
                        className="text-xl font-headline font-bold text-primary-container cursor-pointer hover:underline"
                        onClick={() => navigate(`/profile/${item.profile.id}`)}
                      >
                        {item.profile.full_name}
                      </h3>
                      <p className="font-label text-xs uppercase tracking-wider text-slate-400 mt-1">{item.profile.major || 'Undeclared'}</p>
                    </div>
                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => navigate('/messages')}
                        className="flex-1 bg-blue-600 text-white py-2.5 rounded-md text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span> Message
                      </button>
                      <button
                        onClick={() => navigate(`/profile/${item.profile.id}`)}
                        className="flex-1 border-2 border-primary-container text-primary-container py-2.5 rounded-md text-sm font-bold hover:bg-primary-container hover:text-white transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">person</span> Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="w-full flex flex-col items-center gap-6 px-8 py-12 bg-[#000613] text-white">
        <div className="flex flex-col md:flex-row justify-between w-full max-w-7xl items-center gap-8">
          <div className="flex flex-col gap-2 items-center md:items-start">
            <span className="text-white font-black text-xl tracking-tighter">Studify</span>
            <p className="font-body text-[0.75rem] tracking-wide text-slate-400 max-w-xs text-center md:text-left">
              &copy; 2024 Studify Academic Atelier. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Privacy Policy</a>
            <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Terms of Service</a>
            <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Research Ethics</a>
            <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ConnectionsPage;
