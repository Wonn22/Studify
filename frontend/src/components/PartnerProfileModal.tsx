import { useEffect, useRef, useState } from 'react';
import { supabase } from '../database/database';

interface PartnerProfile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    major: string | null;
    bio: string | null;
    interests: string[] | null;
}

interface Props {
    partnerId: string;
    onClose: () => void;
}

const PartnerProfileModal = ({ partnerId, onClose }: Props) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [partner, setPartner] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [connectStatus, setConnectStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPartner = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) setCurrentUserId(user.id);

                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, major, bio, interests')
                    .eq('id', partnerId)
                    .single();

                if (error) throw error;
                setPartner(data as PartnerProfile);
            } catch (err) {
                console.error('Failed to load partner profile:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPartner();
    }, [partnerId]);

    const handleConnect = async () => {
        if (!currentUserId || !partner) return;
        setConnectStatus('sending');
        try {
            await supabase.from('messages').insert({
                sender_id: currentUserId,
                receiver_id: partner.id,
                content: `Hi ${partner.full_name}! I'd love to study together. Let's connect on Studify! 📚`,
            });
            setConnectStatus('sent');
        } catch (err) {
            console.error('Failed to send connect request:', err);
            setConnectStatus('idle');
        }
    };

    const avatarSrc = partner?.avatar_url
        ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(partner?.full_name ?? '')}`;

    return (
        <div
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
            <div
                className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                style={{ animation: 'partner-modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                <div className="relative bg-primary-container px-8 pt-8 pb-16">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined text-white text-base">close</span>
                    </button>
                    <p className="text-white/60 text-[0.6rem] font-bold tracking-[0.25em] uppercase mb-1">Studify Scholar</p>
                    <h2 className="text-white text-2xl font-bold font-headline">
                        {loading ? 'Loading…' : partner?.full_name ?? 'Unknown'}
                    </h2>
                    <p className="text-white/70 text-sm mt-0.5">{partner?.major ?? ''}</p>
                </div>

                <div className="relative px-8 -mt-10 mb-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-slate-200">
                        {!loading && (
                            <img
                                src={avatarSrc}
                                alt={partner?.full_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(partner?.full_name ?? '')}`;
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className="px-8 pb-8 space-y-6 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="material-symbols-outlined text-4xl text-slate-300" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
                        </div>
                    ) : (
                        <>
                            {partner?.bio ? (
                                <div>
                                    <p className="text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase mb-2">About</p>
                                    <p className="text-slate-500 leading-relaxed text-sm">{partner.bio}</p>
                                </div>
                            ) : (
                                <p className="text-slate-400 italic text-sm">No bio provided yet.</p>
                            )}

                            <div>
                                <p className="text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase mb-3">Skills & Interests</p>
                                <div className="flex flex-wrap gap-2">
                                    {partner?.interests && partner.interests.length > 0 ? (
                                        partner.interests.map(skill => (
                                            <span
                                                key={skill}
                                                className="px-4 py-1.5 bg-primary-container text-white rounded-full text-xs font-semibold tracking-wide"
                                            >
                                                {skill}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-400 italic text-sm">No skills listed.</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleConnect}
                                    disabled={connectStatus !== 'idle'}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-container text-white font-semibold text-sm hover:bg-primary transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {connectStatus === 'sent' ? (
                                        <><span className="material-symbols-outlined text-base">check_circle</span> Request Sent!</>
                                    ) : connectStatus === 'sending' ? (
                                        <><span className="material-symbols-outlined text-base" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Sending…</>
                                    ) : (
                                        <><span className="material-symbols-outlined text-base">person_add</span> Connect</>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes partner-modal-in {
                    from { opacity: 0; transform: scale(0.94) translateY(16px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default PartnerProfileModal;
