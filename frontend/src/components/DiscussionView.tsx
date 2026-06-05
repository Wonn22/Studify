import { useEffect, useState, useRef } from 'react';
import { supabase } from '../database/database';
import { useSocket } from '../context/SocketContext';
import { getResourceFileType, getUploadValidationError, isGroupMember } from '../security/dataAccess';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

const DiscussionView = ({ groupId }: { groupId?: string }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showEmojis, setShowEmojis] = useState(false);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojis = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '🙏', '🔥', '✨', '💯', '🤔'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const initUser = async () => {
      setCheckingAccess(true);
      const { data: { user } } = await supabase.auth.getUser();
      const member = await isGroupMember(groupId, user?.id);

      setCurrentUser(user);
      setCanAccess(member);
      setCheckingAccess(false);
    };
    initUser();
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !currentUser || !canAccess) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_sender_id_fkey(full_name, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        const { data: fallbackData } = await supabase
          .from('messages')
          .select(`
            *,
            profiles:sender_id(full_name, avatar_url)
          `)
          .eq('group_id', groupId)
          .order('created_at', { ascending: true });
        if (fallbackData) setMessages(fallbackData as unknown as Message[]);
      } else if (data) {
        setMessages(data as unknown as Message[]);
      }
      setTimeout(scrollToBottom, 100);
    };

    fetchMessages();
    socket?.emit('join_group_room', { groupId });

    const onNewGroupMessage = (msg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(scrollToBottom, 100);
    };

    const onGroupMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    };

    socket?.on('new_group_message', onNewGroupMessage);
    socket?.on('group_message_deleted', onGroupMessageDeleted);

    return () => {
      socket?.off('new_group_message', onNewGroupMessage);
      socket?.off('group_message_deleted', onGroupMessageDeleted);
    };
  }, [groupId, socket, currentUser, canAccess]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !groupId || !canAccess) return;

    const member = await isGroupMember(groupId, currentUser.id);
    if (!member) {
      setCanAccess(false);
      return;
    }

    const content = newMessage.trim();
    setNewMessage('');
    setShowEmojis(false);

    const { data } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      group_id: groupId,
      content,
    }).select().single();

    if (data) {
      const msgWithProfile = {
        ...data,
        profiles: { full_name: currentUser.user_metadata?.full_name || 'You', avatar_url: currentUser.user_metadata?.avatar_url || '' }
      } as Message;
      setMessages(prev => [...prev, msgWithProfile]);
      setTimeout(scrollToBottom, 100);
      socket?.emit('send_group_message', msgWithProfile);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!currentUser || !groupId) return;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('sender_id', currentUser.id)
      .eq('group_id', groupId);

    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== id));
      setConfirmDeleteMsgId(null);
      socket?.emit('delete_group_message', { messageId: id, groupId });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !groupId || !canAccess) return;

    const uploadValidationError = getUploadValidationError(file);
    if (uploadValidationError) {
      alert(uploadValidationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const member = await isGroupMember(groupId, currentUser.id);
    if (!member) {
      setCanAccess(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${groupId}/discussion/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, file);

    if (uploadError) {
      alert(uploadError.message);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath);

    const { error: resourceError } = await supabase.from('resources').insert({
      file_name: file.name,
      file_type: getResourceFileType(file.name),
      file_url: publicUrl,
      uploaded_by: currentUser.id,
      group_id: groupId,
    });

    if (resourceError) {
      await supabase.storage.from('project-files').remove([filePath]);
      alert(resourceError.message);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const messageData = {
      sender_id: currentUser.id,
      group_id: groupId,
      content: `📎 Sent a file: ${file.name}`,
    };

    const { data: insertedMessage } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (insertedMessage) {
      const msgWithProfile = {
        ...insertedMessage,
        profiles: {
          full_name: currentUser.user_metadata?.full_name || 'You',
          avatar_url: currentUser.user_metadata?.avatar_url || '',
        },
      } as Message;
      setMessages(prev => [...prev, msgWithProfile]);
      socket?.emit('send_group_message', msgWithProfile);
      setTimeout(scrollToBottom, 100);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!checkingAccess && !canAccess) {
    return (
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm mt-4 p-10">
        <p className="text-sm text-slate-400 font-medium">Join this group to view the discussion.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm mt-4">
      <div className="p-6 pb-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
        <h3 className="text-sm font-bold text-[#001F3F] uppercase tracking-[0.1em] flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">forum</span>
          Project Discussion
        </h3>
        <p className="text-xs font-medium text-slate-500 mt-1">Chat in real-time with your group members.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-slate-400 font-medium italic">No messages yet. Start the discussion!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            const profile = msg.profiles || { full_name: 'Unknown', avatar_url: '' };
            const avatar = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.full_name)}`;
            const isConfirming = confirmDeleteMsgId === msg.id;

            return (
              <div key={msg.id} className={`flex gap-4 max-w-2xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                {!isMe && (
                  <img src={avatar} alt={profile.full_name} className="w-10 h-10 rounded-full object-cover bg-slate-200 mt-1" />
                )}
                <div className="flex flex-col">
                  {!isMe && <span className="text-xs font-bold text-slate-500 mb-1 ml-1">{profile.full_name}</span>}
                  <div className={`relative group p-4 rounded-2xl ${isMe ? 'bg-[#001F3F] text-white rounded-tr-sm shadow-sm' : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-body">{msg.content}</p>
                    {isMe && (
                      <div className={`absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-full flex items-center gap-1 transition-opacity ${isConfirming ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {isConfirming ? (
                          <>
                            <button
                              onClick={() => setConfirmDeleteMsgId(null)}
                              className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors whitespace-nowrap"
                            >Cancel</button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >Delete</button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteMsgId(msg.id)}
                            title="Delete message"
                            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1.5 text-slate-400 font-bold tracking-wider ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100 shrink-0 relative">
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 pr-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="material-symbols-outlined p-2 text-slate-400 hover:text-[#001F3F] transition-colors"
          >
            attach_file
          </button>
          <input
            type="text"
            className="flex-1 bg-transparent border-none text-sm text-slate-800 focus:ring-0 placeholder:text-slate-400 px-2 outline-none"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <div className="relative">
            <button
              onClick={() => setShowEmojis(!showEmojis)}
              className="material-symbols-outlined p-2 text-slate-400 hover:text-[#001F3F] transition-colors flex items-center justify-center"
            >
              sentiment_satisfied
            </button>
            {showEmojis && (
              <div className="absolute bottom-12 right-0 bg-white shadow-xl rounded-xl p-3 grid grid-cols-4 gap-2 border border-slate-100 w-48 z-10">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojis(false);
                    }}
                    className="text-2xl hover:bg-slate-100 p-2 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-[#001F3F] text-white rounded-lg flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscussionView;
