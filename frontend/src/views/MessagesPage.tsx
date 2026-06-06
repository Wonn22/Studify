import { useEffect, useState, useRef } from 'react';
import { supabase } from '../database/database';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import {
    getAcceptedFriendshipId,
    getCurrentSessionUser,
    getProjectFilesStoragePath,
    getResourceFileType,
    getUploadValidationError,
    isHttpUrl,
} from '../security/dataAccess';

interface Profile {
    id: string;
    full_name: string;
    avatar_url: string;
    major: string;
}

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    is_read?: boolean;
}

interface SocketAck {
    ok: boolean;
    error?: string;
}

interface FriendshipRow {
    id: string;
    requester_id: string;
    addressee_id: string;
}

const MessagesPage = () => {
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);
    const [contacts, setContacts] = useState<Profile[]>([]);
    const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
    const [confirmDeleteResId, setConfirmDeleteResId] = useState<string | null>(null);
    const [confirmRemoveContactId, setConfirmRemoveContactId] = useState<string | null>(null);
    const [friendshipMap, setFriendshipMap] = useState<Record<string, string>>({});
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [typingContactId, setTypingContactId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const selectedFriendshipId = selectedContact ? friendshipMap[selectedContact.id] : null;
    const emojis = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '🙏', '🔥', '✨', '💯', '🤔'];

    void emojis;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const removeInvalidContact = (contactId: string) => {
        setMessages([]);
        setResources([]);
        setFriendshipMap(prev => {
            const next = { ...prev };
            delete next[contactId];
            return next;
        });
        setContacts(prev => {
            const next = prev.filter(contact => contact.id !== contactId);
            setSelectedContact(current => current?.id === contactId ? next[0] || null : current);
            return next;
        });
    };

    useEffect(() => {
        const initialize = async () => {
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

            setCurrentUser(profile);

            const { data: friendships } = await supabase
                .from('friendships')
                .select('id, requester_id, addressee_id')
                .eq('status', 'Accepted')
                .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

            const acceptedFriendships = (friendships || []).filter((f: FriendshipRow) => {
                const contactId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
                return contactId && contactId !== user.id;
            });

            const friendIds = Array.from(new Set(acceptedFriendships.map(f =>
                f.requester_id === user.id ? f.addressee_id : f.requester_id
            )));

            const fMap: Record<string, string> = {};
            acceptedFriendships.forEach(f => {
                const contactId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
                fMap[contactId] = f.id;
            });
            setFriendshipMap(fMap);

            const { data: unreadData } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('receiver_id', user.id)
                .eq('is_read', false);

            const unreadMap: Record<string, number> = {};
            unreadData?.forEach((row: { sender_id: string }) => {
                unreadMap[row.sender_id] = (unreadMap[row.sender_id] || 0) + 1;
            });
            setUnreadCounts(unreadMap);

            if (friendIds.length > 0) {
                const { data: allContacts } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', friendIds);

                const acceptedContacts = (allContacts || []).filter(contact => fMap[contact.id]);

                if (acceptedContacts.length > 0) {
                    setContacts(acceptedContacts);
                    setSelectedContact(acceptedContacts[0]);
                } else {
                    setContacts([]);
                    setSelectedContact(null);
                }
            } else {
                setContacts([]);
                setSelectedContact(null);
            }

            setLoading(false);
        };
        initialize();
    }, [navigate]);

    useEffect(() => {
        if (!socket || contacts.length === 0) return;
        contacts.forEach(contact => {
            socket.emit('join_dm_room', { contactId: contact.id });
        });
    }, [socket, contacts]);

    useEffect(() => {
        if (!currentUser || !selectedContact || !socket) return;

        const fetchChatData = async () => {
            const verifiedFriendshipId = await getAcceptedFriendshipId(currentUser.id, selectedContact.id);

            if (!selectedFriendshipId || verifiedFriendshipId !== selectedFriendshipId) {
                removeInvalidContact(selectedContact.id);
                return;
            }

            const { data: msgs } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: true });

            const { data: res } = await supabase
                .from('resources')
                .select('*')
                .or(`and(uploaded_by.eq.${currentUser.id},receiver_id.eq.${selectedContact.id}),and(uploaded_by.eq.${selectedContact.id},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: false });

            if (msgs) setMessages(msgs);
            if (res) setResources(res);
            setTimeout(scrollToBottom, 100);
        };

        fetchChatData();

        socket.emit('join_dm_room', { contactId: selectedContact.id });
        socket.emit('mark_messages_read', { contactId: selectedContact.id });

        const onNewMessage = (msg: Message) => {
            const isForSelectedChat =
                (msg.sender_id === currentUser.id && msg.receiver_id === selectedContact.id) ||
                (msg.sender_id === selectedContact.id && msg.receiver_id === currentUser.id);

            if (isForSelectedChat) {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                setTimeout(scrollToBottom, 100);
                return;
            }

            const otherContactId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
            setUnreadCounts(prev => ({
                ...prev,
                [otherContactId]: (prev[otherContactId] || 0) + 1,
            }));
        };

        const onMessageDeleted = ({ messageId }: { messageId: string }) => {
            setMessages(prev => prev.filter(m => m.id !== messageId));
        };

        const onTypingStart = ({ userId: uid }: { userId: string }) => {
            if (uid === selectedContact.id) setTypingContactId(uid);
        };

        const onTypingStop = ({ userId: uid }: { userId: string }) => {
            setTypingContactId(prev => (prev === uid ? null : prev));
        };

        const onMessagesRead = ({ readBy }: { readBy: string }) => {
            if (readBy === selectedContact.id) {
                setMessages(prev => prev.map(m =>
                    m.sender_id === currentUser.id ? { ...m, is_read: true } : m
                ));
            }
        };

        socket.on('new_message', onNewMessage);
        socket.on('message_deleted', onMessageDeleted);
        socket.on('typing_start_dm', onTypingStart);
        socket.on('typing_stop_dm', onTypingStop);
        socket.on('messages_read', onMessagesRead);

        return () => {
            socket.off('new_message', onNewMessage);
            socket.off('message_deleted', onMessageDeleted);
            socket.off('typing_start_dm', onTypingStart);
            socket.off('typing_stop_dm', onTypingStop);
            socket.off('messages_read', onMessagesRead);
        };
    }, [currentUser, selectedContact, socket, selectedFriendshipId]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUser || !selectedContact) return;
        const verifiedFriendshipId = await getAcceptedFriendshipId(currentUser.id, selectedContact.id);
        if (!selectedFriendshipId || verifiedFriendshipId !== selectedFriendshipId) {
            alert('You can only message accepted contacts.');
            return;
        }

        const content = newMessage.trim();
        setNewMessage('');

        const { data } = await supabase.from('messages').insert({
            sender_id: currentUser.id,
            receiver_id: selectedContact.id,
            content,
        }).select().single();

        if (data) {
            setMessages(prev => [...prev, data]);
            setTimeout(scrollToBottom, 100);
            socket?.emit('send_message', data);
        }
    };

    const handleDeleteMessage = async (id: string) => {
        if (!currentUser || !selectedContact) return;

        if (!socket?.connected) {
            alert('Realtime connection is not authenticated. Please refresh and try again.');
            return;
        }

        const response = await new Promise<SocketAck>((resolve) => {
            socket.timeout(5000).emit(
                'delete_message',
                { messageId: id, contactId: selectedContact.id },
                (error: Error | null, ack?: SocketAck) => {
                    if (error) {
                        resolve({ ok: false, error: 'Delete request timed out.' });
                        return;
                    }
                    resolve(ack || { ok: false, error: 'Delete request failed.' });
                },
            );
        });

        if (!response.ok) {
            alert(response.error || 'Could not delete message.');
            return;
        }

        setMessages(prev => prev.filter(m => m.id !== id));
        setConfirmDeleteMsgId(null);
    };

    const handleShareLink = async () => {
        const url = prompt("Enter Academic URL:")?.trim();
        const title = prompt("Link Title:")?.trim();
        if (!url || !currentUser || !selectedContact) return;
        if (!isHttpUrl(url)) {
            alert('Please enter a valid http or https URL.');
            return;
        }

        const verifiedFriendshipId = await getAcceptedFriendshipId(currentUser.id, selectedContact.id);
        if (!selectedFriendshipId || verifiedFriendshipId !== selectedFriendshipId) {
            alert('You can only share links with accepted contacts.');
            return;
        }

        const { data, error: resourceError } = await supabase.from('resources').insert({
            file_name: title || url,
            file_url: url,
            file_type: 'link',
            uploaded_by: currentUser.id,
            receiver_id: selectedContact.id
        }).select().single();

        if (resourceError) {
            alert(resourceError.message);
            return;
        }

        if (data) {
            setResources(prev => [data, ...prev]);
            const { data: insertedMessage, error: messageError } = await supabase.from('messages').insert({
                sender_id: currentUser.id,
                receiver_id: selectedContact.id,
                content: `🔗 Shared a link: ${title || url}`
            }).select().single();

            if (messageError) {
                alert(messageError.message);
                return;
            }

            if (insertedMessage) {
                setMessages(prev => [...prev, insertedMessage]);
                setTimeout(scrollToBottom, 100);
                socket?.emit('send_message', insertedMessage);
            }
        }
    };

    const handleDeleteResource = async (id: string) => {
        if (!currentUser || !selectedContact) return;
        const resource = resources.find(r => r.id === id);

        const { error } = await supabase
            .from('resources')
            .delete()
            .eq('id', id)
            .eq('uploaded_by', currentUser.id)
            .eq('receiver_id', selectedContact.id);

        if (!error) {
            setResources(prev => prev.filter(r => r.id !== id));
            setConfirmDeleteResId(null);

            const storagePath = getProjectFilesStoragePath(resource?.file_url);
            if (storagePath) {
                await supabase.storage.from('project-files').remove([storagePath]);
            }
        }
    };

    const handleRemoveContact = async (contactId: string) => {
        if (!currentUser) return;

        const friendshipId = friendshipMap[contactId];
        if (!friendshipId) return;
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', friendshipId)
            .eq('status', 'Accepted')
            .or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${contactId}),and(requester_id.eq.${contactId},addressee_id.eq.${currentUser.id})`);

        if (!error) {
            setContacts(prev => prev.filter(c => c.id !== contactId));
            setFriendshipMap(prev => { const next = { ...prev }; delete next[contactId]; return next; });
            setConfirmRemoveContactId(null);
            if (selectedContact?.id === contactId) setSelectedContact(null);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser || !selectedContact) return;

        const uploadValidationError = getUploadValidationError(file);
        if (uploadValidationError) {
            alert(uploadValidationError);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const verifiedFriendshipId = await getAcceptedFriendshipId(currentUser.id, selectedContact.id);
        if (!selectedFriendshipId || verifiedFriendshipId !== selectedFriendshipId) {
            alert('You can only share files with accepted contacts.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `direct/${currentUser.id}/${fileName}`;

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

        const { data, error: resourceError } = await supabase.from('resources').insert({
            file_name: file.name,
            file_url: publicUrl,
            file_type: getResourceFileType(file.name),
            uploaded_by: currentUser.id,
            receiver_id: selectedContact.id
        }).select().single();

        if (resourceError) {
            await supabase.storage.from('project-files').remove([filePath]);
            alert(resourceError.message);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (data) {
            setResources(prev => [data, ...prev]);
            const { data: insertedMessage, error: messageError } = await supabase.from('messages').insert({
                sender_id: currentUser.id,
                receiver_id: selectedContact.id,
                content: `📎 Sent a file: ${file.name}`
            }).select().single();

            if (messageError) {
                alert(messageError.message);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            if (insertedMessage) {
                setMessages(prev => [...prev, insertedMessage]);
                setTimeout(scrollToBottom, 100);
                socket?.emit('send_message', insertedMessage);
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getAvatar = (url?: string, name?: string) =>
        url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Unknown')}`;

    const formatTime = (isoString: string) => 
        new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="bg-surface text-on-surface font-body flex flex-col h-screen overflow-hidden">
            <Navbar />
            <div className="flex flex-1 pt-20 overflow-hidden">
                <section className="w-80 border-r border-slate-200 bg-slate-50 overflow-y-auto p-6">
                    <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-6">Active Correspondence</h2>
                    <div className="space-y-3">
                        {contacts.map(contact => {
                            const isConfirmingRemove = confirmRemoveContactId === contact.id;
                            return (
                                <div
                                    key={contact.id}
                                    className={`group relative flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${selectedContact?.id === contact.id ? 'bg-white shadow-sm border-l-4 border-[#001F3F]' : 'hover:bg-slate-100'}`}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => { setSelectedContact(contact); setConfirmRemoveContactId(null); setUnreadCounts(prev => ({ ...prev, [contact.id]: 0 })); socket?.emit('mark_messages_read', { contactId: contact.id }); }}>
                                        <img className="w-12 h-12 rounded-lg object-cover shrink-0" src={getAvatar(contact.avatar_url, contact.full_name)} alt="" />
                                        <div className="overflow-hidden flex-1">
                                            <p className="text-sm font-bold text-[#001F3F] truncate">{contact.full_name}</p>
                                            <p className="text-xs text-slate-500 truncate">{contact.major}</p>
                                        </div>
                                        {unreadCounts[contact.id] > 0 && (
                                            <span className="shrink-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                {unreadCounts[contact.id]}
                                            </span>
                                        )}
                                    </div>
                                    {!isConfirmingRemove && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmRemoveContactId(contact.id); }}
                                            title="Remove contact"
                                            className="opacity-0 group-hover:opacity-100 shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>person_remove</span>
                                        </button>
                                    )}
                                    {isConfirmingRemove && (
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setConfirmRemoveContactId(null); }}
                                                className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                                            >Cancel</button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRemoveContact(contact.id); }}
                                                className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                                            >Remove</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {selectedContact ? (
                    <section className="flex-1 flex flex-col bg-white overflow-hidden">
                        <div className="h-20 px-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <img className="w-10 h-10 rounded-lg object-cover" src={getAvatar(selectedContact.avatar_url, selectedContact.full_name)} alt="" />
                                <div>
                                    <h3 className="font-bold text-[#001F3F]">{selectedContact.full_name}</h3>
                                    {typingContactId === selectedContact.id && (
                                        <p className="text-xs text-blue-500 font-medium animate-pulse">typing...</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-50/30">
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === currentUser?.id;
                                const isConfirming = confirmDeleteMsgId === msg.id;
                                return (
                                    <div key={msg.id} className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className="relative max-w-md">
                                            <div className={`p-4 rounded-2xl shadow-sm ${isMe ? 'bg-[#001F3F] text-white rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'}`}>
                                                <p className="text-sm">{msg.content}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-[10px] opacity-60">{formatTime(msg.created_at)}</span>
                                                    {isMe && (
                                                        <span className={`text-[9px] font-semibold tracking-wide ${msg.is_read ? 'text-blue-300' : 'text-white/40'}`}>
                                                            {msg.is_read ? 'Read' : 'Sent'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isMe && (
                                                <div className={`absolute -left-2 top-0 -translate-x-full flex items-center gap-1 transition-opacity ${isConfirming ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    {isConfirming ? (
                                                        <>
                                                            <button
                                                                onClick={() => setConfirmDeleteMsgId(null)}
                                                                className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
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
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100">
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                            <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-xl">
                                <button onClick={() => fileInputRef.current?.click()} title="Attach file" className="material-symbols-outlined p-2 text-slate-500 hover:text-[#001F3F] transition-colors">attach_file</button>
                                <button onClick={handleShareLink} title="Share link" className="material-symbols-outlined p-2 text-slate-500 hover:text-[#001F3F] transition-colors">add_link</button>
                                <input 
                                    className="flex-1 bg-transparent border-none outline-none text-sm" 
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        if (selectedContact && socket) {
                                            socket.emit('typing_start_dm', { contactId: selectedContact.id });
                                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                            typingTimeoutRef.current = setTimeout(() => {
                                                socket.emit('typing_stop_dm', { contactId: selectedContact.id });
                                            }, 2000);
                                        }
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button onClick={handleSendMessage} className="bg-[#001F3F] text-white p-2 rounded-lg material-symbols-outlined">send</button>
                            </div>
                        </div>
                    </section>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">Select a contact to start.</div>
                )}

                {selectedContact && (
                    <section className="w-72 border-l border-slate-200 p-8 hidden xl:block overflow-y-auto">
                        <h4 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-6">Shared Resources</h4>
                        <div className="space-y-3">
                            {resources.length === 0 && (
                                <p className="text-xs text-slate-400 italic text-center pt-8">No files shared yet.</p>
                            )}
                            {resources.map(res => {
                                const isConfirmingRes = confirmDeleteResId === res.id;
                                const canDelete = res.uploaded_by === currentUser?.id;
                                return (
                                    <div key={res.id} className="group flex flex-col gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <span className="material-symbols-outlined text-[#001F3F] shrink-0" style={{ fontSize: '20px' }}>
                                                {res.file_type === 'link' ? 'link' : res.file_type === 'pdf' ? 'picture_as_pdf' : 'description'}
                                            </span>
                                            <p className="text-xs font-bold truncate text-[#001F3F] flex-1">{res.file_name}</p>
                                            {canDelete && !isConfirmingRes && (
                                                <button
                                                    onClick={() => setConfirmDeleteResId(res.id)}
                                                    title="Remove file"
                                                    className="opacity-0 group-hover:opacity-100 shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
                                                </button>
                                            )}
                                        </div>
                                        {canDelete && isConfirmingRes && (
                                            <div className="flex gap-2 pl-8">
                                                <button
                                                    onClick={() => setConfirmDeleteResId(null)}
                                                    className="flex-1 text-[10px] font-bold py-1 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                                                >Cancel</button>
                                                <button
                                                    onClick={() => handleDeleteResource(res.id)}
                                                    className="flex-1 text-[10px] font-bold py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                >Delete</button>
                                            </div>
                                        )}
                                        {res.file_url && res.file_type !== 'link' && (
                                            <a href={res.file_url} target="_blank" rel="noreferrer"
                                                className="pl-8 text-[10px] font-semibold text-blue-500 hover:underline">Download</a>
                                        )}
                                        {res.file_type === 'link' && (
                                            <a href={res.file_url} target="_blank" rel="noreferrer"
                                                className="pl-8 text-[10px] font-semibold text-blue-500 hover:underline truncate block">{res.file_url}</a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default MessagesPage;
