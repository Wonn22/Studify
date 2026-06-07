import { useEffect, useRef, useState } from 'react';
import { supabase } from '../database/database';
import AdminNavbar from '../components/AdminNavbar';
import { useNavigate } from 'react-router-dom';
import { getCurrentSessionUser } from '../security/dataAccess';
import type { Profile, Message } from '../types';

interface ChatUser {
  profile: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

const AdminSupportPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentSessionUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profile) {
        navigate('/login');
        return;
      }

      setCurrentUser(profile);
      await fetchChatUsers(user.id);
      setLoading(false);
    };

    init();
  }, [navigate]);

  const fetchChatUsers = async (adminId: string) => {
    // Get all messages where admin is sender or receiver
    const { data: allMessages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${adminId},receiver_id.eq.${adminId}`)
      .order('created_at', { ascending: false });

    if (!allMessages) return;

    // Get unique user IDs (excluding admin)
    const userIds = new Set<string>();
    allMessages.forEach((m: Message) => {
      if (m.sender_id !== adminId) userIds.add(m.sender_id);
      if (m.receiver_id && m.receiver_id !== adminId) userIds.add(m.receiver_id);
    });

    if (userIds.size === 0) {
      setChatUsers([]);
      return;
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(userIds));

    const profileMap = new Map<string, Profile>();
    profilesData?.forEach((p: Profile) => profileMap.set(p.id, p));

    // Build chat user list
    const userLastMsg = new Map<string, Message>();
    const userUnread = new Map<string, number>();

    allMessages.forEach((m: Message) => {
      const otherId = m.sender_id === adminId ? m.receiver_id! : m.sender_id;
      if (!userLastMsg.has(otherId)) {
        userLastMsg.set(otherId, m);
      }
      if (m.sender_id !== adminId && !m.is_read) {
        userUnread.set(otherId, (userUnread.get(otherId) || 0) + 1);
      }
    });

    const users: ChatUser[] = Array.from(userIds)
      .map((id) => ({
        profile: profileMap.get(id)!,
        lastMessage: userLastMsg.get(id) || null,
        unreadCount: userUnread.get(id) || 0,
      }))
      .filter((u) => u.profile)
      .sort((a, b) => {
        const aTime = a.lastMessage?.created_at || '';
        const bTime = b.lastMessage?.created_at || '';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

    setChatUsers(users);
  };

  const fetchMessages = async (adminId: string, userId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${adminId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${adminId})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as Message[]);
  };

  const markAsRead = async (adminId: string, userId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', userId)
      .eq('receiver_id', adminId)
      .eq('is_read', false);

    setChatUsers((prev) =>
      prev.map((u) => (u.profile.id === userId ? { ...u, unreadCount: 0 } : u))
    );
  };

  const handleSelectUser = async (user: Profile) => {
    if (!currentUser) return;
    setSelectedUser(user);
    await fetchMessages(currentUser.id, user.id);
    await markAsRead(currentUser.id, user.id);
  };

  // Realtime subscription
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('admin_support_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id})`,
        },
        (payload) => {
          const msg = payload.new as Message;
          // If currently chatting with this user, append message
          const otherId = msg.sender_id === currentUser!.id ? msg.receiver_id : msg.sender_id;
          if (selectedUser?.id === otherId) {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id !== currentUser!.id) {
              markAsRead(currentUser!.id, msg.sender_id);
            }
          }
          // Refresh user list
          fetchChatUsers(currentUser!.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          if (currentUser) fetchChatUsers(currentUser.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !selectedUser || sending) return;
    setSending(true);

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: newMessage.trim(),
    });

    setSending(false);
    if (!error) {
      setNewMessage('');
      if (currentUser) fetchChatUsers(currentUser.id);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return formatTime(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getAvatar = (url?: string | null, name?: string) =>
    url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Unknown')}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <AdminNavbar />
        <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <AdminNavbar />

      <main className="flex-1 flex max-w-6xl mx-auto w-full px-4 pt-20 pb-4 gap-4">
        {/* Sidebar - User List */}
        <div className="w-80 flex-shrink-0 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-headline font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">support_agent</span>
              Support Chats
            </h2>
            <p className="text-xs text-slate-400 mt-1">{chatUsers.length} user{chatUsers.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chatUsers.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">inbox</span>
                <p className="text-sm text-slate-500">No support chats yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {chatUsers.map((chatUser) => (
                  <button
                    key={chatUser.profile.id}
                    onClick={() => handleSelectUser(chatUser.profile)}
                    className={`w-full text-left p-3 flex items-center gap-3 transition-colors hover:bg-slate-50 ${
                      selectedUser?.id === chatUser.profile.id ? 'bg-blue-50 border-l-4 border-primary-container' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={getAvatar(chatUser.profile.avatar_url, chatUser.profile.full_name)}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover bg-slate-200"
                      />
                      {chatUser.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {chatUser.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-800 truncate">{chatUser.profile.full_name}</p>
                        {chatUser.lastMessage && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {formatDateShort(chatUser.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {chatUser.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">chat</span>
                <p className="text-slate-500 font-medium">Select a user to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={getAvatar(selectedUser.avatar_url, selectedUser.full_name)}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover bg-slate-200"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{selectedUser.full_name}</h3>
                    <button
                      onClick={() => navigate(`/profile/${selectedUser.id}`)}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      View profile
                    </button>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    statusColors[selectedUser.account_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {selectedUser.account_status}
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <img
                          src={getAvatar(selectedUser.avatar_url, selectedUser.full_name)}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover bg-slate-200 mr-2 self-end"
                        />
                      )}
                      <div className="max-w-[70%]">
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm ${
                            isMe
                              ? 'bg-primary-container text-white rounded-br-md'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                          {isMe && (
                            <span className="text-[10px] text-slate-400">
                              {msg.is_read ? 'Read' : 'Sent'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your reply..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary-container transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="p-2.5 bg-primary-container text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warned: 'bg-amber-100 text-amber-800 border-amber-200',
  suspended: 'bg-orange-100 text-orange-800 border-orange-200',
  banned: 'bg-red-100 text-red-800 border-red-200',
};

export default AdminSupportPage;
