import { useEffect, useState, useRef } from 'react';
import { supabase } from '../database/database';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

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
}

const MessagesPage = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);
    const [contacts, setContacts] = useState<Profile[]>([]);
    const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showEmojis, setShowEmojis] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<Profile[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojis = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '🙏', '🔥', '✨', '💯', '🤔'];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const initialize = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
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
                .select('requester_id, addressee_id')
                .eq('status', 'Accepted')
                .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

            const friendIds = friendships?.map(f =>
                f.requester_id === user.id ? f.addressee_id : f.requester_id
            ) || [];

            if (friendIds.length > 0) {
                const { data: allContacts } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', friendIds);

                if (allContacts && allContacts.length > 0) {
                    setContacts(allContacts);
                    setSelectedContact(allContacts[0]);
                } else {
                    setContacts([]);
                    setSelectedContact(null);
                }
            } else {
                setContacts([]);
                setSelectedContact(null);
            }

            const { data: pendingData } = await supabase
                .from('friendships')
                .select('requester_id')
                .eq('addressee_id', user.id)
                .eq('status', 'Pending');
            
            if (pendingData && pendingData.length > 0) {
                const requesterIds = pendingData.map(p => p.requester_id);
                const { data: pendingProfiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', requesterIds);
                setPendingRequests(pendingProfiles || []);
            } else {
                setPendingRequests([]);
            }

            setLoading(false);
        };
        initialize();
    }, [navigate]);

    const handleAcceptRequest = async (requesterId: string) => {
        if (!currentUser) return;
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'Accepted' })
            .eq('requester_id', requesterId)
            .eq('addressee_id', currentUser.id);

        if (!error) {
            const acceptedUser = pendingRequests.find(p => p.id === requesterId);
            if (acceptedUser) {
                setPendingRequests(prev => prev.filter(p => p.id !== requesterId));
                setContacts(prev => [...prev, acceptedUser]);
                if (!selectedContact) setSelectedContact(acceptedUser);
            }
        }
    };

    const handleDeclineRequest = async (requesterId: string) => {
        if (!currentUser) return;
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('requester_id', requesterId)
            .eq('addressee_id', currentUser.id);

        if (!error) {
            setPendingRequests(prev => prev.filter(p => p.id !== requesterId));
        }
    };

    useEffect(() => {
        if (!currentUser || !selectedContact) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data);
                setTimeout(scrollToBottom, 100);
            }
        };

        const fetchResources = async () => {
            const { data } = await supabase
                .from('resources')
                .select('*')
                .or(`and(uploaded_by.eq.${currentUser.id},receiver_id.eq.${selectedContact.id}),and(uploaded_by.eq.${selectedContact.id},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: false });

            if (data) {
                setResources(data);
            }
        };

        fetchMessages();
        fetchResources();

        const subscription = supabase
            .channel('messages_channel')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentUser.id}`,
            }, payload => {
                if (payload.new.sender_id === selectedContact.id) {
                    setMessages(prev => [...prev, payload.new as Message]);
                    setTimeout(scrollToBottom, 100);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [currentUser, selectedContact]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUser || !selectedContact) return;

        const messageData = {
            sender_id: currentUser.id,
            receiver_id: selectedContact.id,
            content: newMessage.trim(),
        };

        const { data, error } = await supabase
            .from('messages')
            .insert(messageData)
            .select()
            .single();

        if (data) {
            setMessages(prev => [...prev, data]);
            setNewMessage('');
            setTimeout(scrollToBottom, 100);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser || !selectedContact) return;

        const newResource = {
            id: Date.now().toString(),
            file_name: file.name,
            file_type: file.name.split('.').pop() || 'unknown',
            uploaded_by: currentUser.id,
            receiver_id: selectedContact.id,
            created_at: new Date().toISOString()
        };
        setResources(prev => [newResource, ...prev]);

        const messageData = {
            sender_id: currentUser.id,
            receiver_id: selectedContact.id,
            content: `📎 Sent a file: ${file.name}`,
        };

        const { data, error } = await supabase
            .from('messages')
            .insert(messageData)
            .select()
            .single();

        if (data) {
            setMessages(prev => [...prev, data]);
            setTimeout(scrollToBottom, 100);
        }
    };

    const getAvatar = (url?: string, name?: string) =>
        url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Unknown')}`;

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
    );

    return (
        <div className="bg-surface text-on-surface overflow-hidden font-body flex flex-col h-screen">
            <Navbar />
            <div className="flex flex-1 pt-20 h-full">
                <section className="w-80 h-full bg-surface-container-low flex flex-col border-r border-slate-200 overflow-y-auto">
                    <div className="p-6">
                        {pendingRequests.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                    Pending Invites ({pendingRequests.length})
                                </h2>
                                <div className="space-y-3">
                                    {pendingRequests.map(req => (
                                        <div key={req.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <img alt={req.full_name} className="w-8 h-8 rounded-md object-cover bg-slate-200" src={getAvatar(req.avatar_url, req.full_name)} />
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-xs font-bold text-primary truncate">{req.full_name}</p>
                                                    <p className="text-[9px] text-on-surface-variant truncate">{req.major || 'Student'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAcceptRequest(req.id)} className="flex-1 bg-[#001F3F] text-white text-[10px] font-bold py-1.5 rounded-lg hover:bg-blue-950 transition-colors">Accept</button>
                                                <button onClick={() => handleDeclineRequest(req.id)} className="flex-1 bg-slate-100 text-slate-600 text-[10px] font-bold py-1.5 rounded-lg hover:bg-slate-200 transition-colors">Decline</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <h2 className="text-xs font-bold tracking-[0.15em] text-on-surface-variant uppercase mb-6 font-label">Active Correspondence</h2>
                        <div className="space-y-4">
                            {contacts.length === 0 ? (
                                <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-sm font-medium text-slate-500 mb-3">No friends yet</p>
                                    <button onClick={() => navigate('/match')} className="text-xs bg-[#001F3F] text-white px-4 py-2 rounded-lg hover:bg-blue-950 transition-colors font-bold">Find Matches</button>
                                </div>
                            ) : (
                                contacts.map(contact => (
                                    <div
                                        key={contact.id}
                                        onClick={() => setSelectedContact(contact)}
                                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${selectedContact?.id === contact.id ? 'bg-surface-container-lowest shadow-sm border-l-4 border-[#001F3F]' : 'hover:bg-surface-container-highest'}`}
                                    >
                                        <img alt={contact.full_name} className="w-12 h-12 rounded-lg object-cover bg-slate-200" src={getAvatar(contact.avatar_url, contact.full_name)} />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold text-primary truncate">{contact.full_name}</p>
                                            <p className="text-xs text-on-surface-variant truncate">{contact.major || 'Student'}</p>
                                        </div>
                                        {selectedContact?.id === contact.id && (
                                            <div className="w-2 h-2 rounded-full bg-[#001F3F]"></div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                {selectedContact ? (
                    <section className="flex-1 h-full flex flex-col bg-white">
                        <div className="h-20 px-8 flex justify-between items-center bg-white border-b border-surface-container-low">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <img alt={selectedContact.full_name} className="w-12 h-12 rounded-lg object-cover bg-slate-200" src={getAvatar(selectedContact.avatar_url, selectedContact.full_name)} />
                                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                                </div>
                                <div>
                                    <h3 className="text-[#001F3F] font-bold text-lg font-headline leading-tight">{selectedContact.full_name}</h3>
                                    <span className="text-[10px] tracking-widest text-on-surface-variant uppercase font-bold">Online · {selectedContact.major || 'Student'}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="material-symbols-outlined p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors">video_call</button>
                                <button className="material-symbols-outlined p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors">call</button>
                                <button className="material-symbols-outlined p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors">more_vert</button>
                            </div>
                        </div>

                        <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-slate-50/50">
                            {messages.length === 0 ? (
                                <div className="text-center text-slate-400 mt-10 font-medium">No messages yet. Say hello!</div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender_id === currentUser?.id;
                                    return (
                                        <div key={msg.id} className={`flex gap-4 max-w-2xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                            {!isMe && (
                                                <img alt={selectedContact.full_name} className="w-8 h-8 rounded-md self-end mb-1" src={getAvatar(selectedContact.avatar_url, selectedContact.full_name)} />
                                            )}
                                            <div className={`${isMe ? 'bg-[#001F3F] text-white rounded-br-none shadow-lg shadow-blue-900/10' : 'bg-[#F3F3F4] text-[#000613] rounded-bl-none shadow-sm'} p-4 rounded-xl`}>
                                                <p className="text-sm leading-relaxed font-body whitespace-pre-wrap">{msg.content}</p>
                                                <span className={`text-[10px] block mt-2 font-medium ${isMe ? 'text-blue-200' : 'text-on-surface-variant'}`}>{formatTime(msg.created_at)}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-6 bg-white border-t border-surface-container-low relative">
                            <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-xl">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="material-symbols-outlined p-2 text-on-surface-variant hover:text-[#001F3F] transition-colors"
                                >
                                    attach_file
                                </button>
                                <input
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-body text-primary placeholder:text-on-surface-variant/50 outline-none px-2"
                                    placeholder={`Type a message to ${selectedContact.full_name.split(' ')[0]}...`}
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <div className="relative">
                                    <button
                                        onClick={() => setShowEmojis(!showEmojis)}
                                        className="material-symbols-outlined p-2 text-on-surface-variant hover:text-[#001F3F] transition-colors flex items-center justify-center"
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
                                    className="bg-[#001F3F] text-white p-3 rounded-lg flex items-center justify-center hover:bg-black transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined">send</span>
                                </button>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="flex-1 h-full flex items-center justify-center bg-slate-50">
                        <p className="text-slate-400 font-medium">
                            {contacts.length === 0 ? "Add friends to start messaging!" : "Select a contact to start messaging."}
                        </p>
                    </section>
                )}

                {selectedContact && (
                    <section className="w-72 h-full border-l border-surface-container-low bg-white hidden xl:flex flex-col p-8 overflow-y-auto">
                        <div className="flex flex-col items-center mb-8">
                            <img alt={selectedContact.full_name} className="w-24 h-24 rounded-2xl object-cover mb-4 shadow-xl bg-slate-200" src={getAvatar(selectedContact.avatar_url, selectedContact.full_name)} />
                            <h3 className="text-lg font-bold text-primary font-headline text-center">{selectedContact.full_name}</h3>
                            <p className="text-xs text-on-surface-variant font-medium text-center">{selectedContact.major || 'Undeclared'}</p>
                        </div>
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase mb-3">Academic Files</h4>
                                <div className="space-y-2">
                                    {resources.filter(r => r.file_type !== 'link').length === 0 ? (
                                        <p className="text-xs text-on-surface-variant italic">No files shared yet.</p>
                                    ) : (
                                        resources.filter(r => r.file_type !== 'link').map(file => (
                                            <div key={file.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg group cursor-pointer hover:bg-[#001F3F] transition-colors">
                                                <span className="material-symbols-outlined text-primary group-hover:text-white">description</span>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold truncate group-hover:text-white">{file.file_name}</p>
                                                    <p className="text-[10px] text-on-surface-variant group-hover:text-white/70 uppercase">{file.file_type}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase mb-3">Shared Links</h4>
                                <ul className="text-xs space-y-3 font-medium text-primary">
                                    {resources.filter(r => r.file_type === 'link').length === 0 ? (
                                        <p className="text-xs text-on-surface-variant italic">No links shared yet.</p>
                                    ) : (
                                        resources.filter(r => r.file_type === 'link').map(link => (
                                            <li key={link.id}>
                                                <a className="flex items-center gap-2 hover:underline" href={link.file_url} target="_blank" rel="noreferrer">
                                                    <span className="material-symbols-outlined text-sm">link</span> {link.file_name || link.file_url}
                                                </a>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default MessagesPage;
