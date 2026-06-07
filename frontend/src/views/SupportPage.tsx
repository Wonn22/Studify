import { useEffect, useRef, useState } from 'react';
import { supabase } from '../database/database';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { getCurrentSessionUser } from '../security/dataAccess';
import type { Profile, Message } from '../types';

const SupportPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [admin, setAdmin] = useState<Profile | null>(null);
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
        navigate('/login');
        return;
      }

      setCurrentUser(profile);

      // Find admin
      const { data: adminData } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_admin', true)
        .limit(1)
        .single();

      if (!adminData) {
        setLoading(false);
        return;
      }

      setAdmin(adminData);
      await fetchMessages(user.id, adminData.id);
      setLoading(false);
      markAsRead(user.id, adminData.id);
    };

    init();
  }, [navigate]);

  const fetchMessages = async (userId: string, adminId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as Message[]);
  };

  const markAsRead = async (userId: string, adminId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', adminId)
      .eq('receiver_id', userId)
      .eq('is_read', false);
  };

  // Realtime subscription
  useEffect(() => {
    if (!currentUser || !admin) return;

    const channel = supabase
      .channel('support_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${admin.id}),and(sender_id.eq.${admin.id},receiver_id.eq.${currentUser.id}))`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
          if (msg.sender_id === admin.id) {
            markAsRead(currentUser.id, admin.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, admin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !admin || sending) return;
    setSending(true);

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: admin.id,
      content: newMessage.trim(),
    });

    setSending(false);
    if (!error) {
      setNewMessage('');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatar = (url?: string | null, name?: string) =>
    url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Unknown')}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">support_agent</span>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Support Unavailable</h2>
            <p className="text-slate-500 max-w-xs mx-auto">Our support team is currently unavailable. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 pt-20 pb-4">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-t-xl p-4 flex items-center gap-3">
          <div className="relative">
            <img
              src={getAvatar(admin.avatar_url, admin.full_name)}
              alt=""
              className="w-10 h-10 rounded-full object-cover bg-slate-200"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{admin.full_name || 'Studify Support'}</h2>
            <p className="text-xs text-slate-400">Typically replies within minutes</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-slate-50 border-x border-slate-200 overflow-y-auto p-4 space-y-3 min-h-[400px]">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">chat</span>
              <p className="text-slate-500 text-sm">Start a conversation with our support team.</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMe ? 'order-1' : 'order-2'}`}>
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
        <div className="bg-white border border-slate-200 rounded-b-xl p-3 flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
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
      </main>
    </div>
  );
};

export default SupportPage;
