import { useState, useEffect } from 'react';

interface SessionJoinRequest {
    id: string;
    sessionId: string;
    requesterId: string;
    requesterName: string;
    createdAt: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
}

interface SessionWithDetails {
    id: string;
    title: string;
    created_by: string;
    max_members: number;
    participants?: Array<{ profile_id: string }>;
    scheduled_at: string;
    duration_minutes: number;
    meeting_link?: string | null;
    host?: { full_name?: string; avatar_url?: string };
}

interface DiscoveryRoomCardProps {
    session: SessionWithDetails;
    requestStatus: string;
    pendingRequests: SessionJoinRequest[];
    busyAction: string | null;
    onRequestJoin: (session: SessionWithDetails) => void;
    onAcceptRequest: (session: SessionWithDetails, request: SessionJoinRequest) => void;
    onRejectRequest: (request: SessionJoinRequest) => void;
}

const DiscoveryRoomCard = ({
    session,
    requestStatus,
    pendingRequests,
    busyAction,
    onRequestJoin,
    onAcceptRequest,
    onRejectRequest,
}: DiscoveryRoomCardProps) => {
    const [showPopup, setShowPopup] = useState(false);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        if (session?.scheduled_at) {
            const checkLive = () => {
                const now = new Date();
                const start = new Date(session.scheduled_at);
                const end = new Date(start.getTime() + (session.duration_minutes || 60) * 60000);
                setIsLive(now >= start && now <= end);
            };
            checkLive();
            const interval = setInterval(checkLive, 60000);
            return () => clearInterval(interval);
        }
    }, [session]);

    const participantCount = session.participants?.length || 0;
    const isHost = requestStatus === 'host';
    const isJoined = requestStatus === 'joined' || isHost;
    const isPending = requestStatus === 'pending';
    const isFull = participantCount >= session.max_members;
    const isRequestBusy = busyAction === `request:${session.id}`;

    const getAvatar = (url: string | undefined, name: string | undefined) =>
        url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Scholar')}`;

    const handleJoin = () => {
        if (!isJoined) {
            onRequestJoin(session);
            return;
        }

        if (isLive) {
            if (session.meeting_link) {
                window.open(session.meeting_link, '_blank', 'noopener,noreferrer');
                return;
            }

            alert('Meeting link is not available for this session.');
        } else {
            setShowPopup(true);
        }
    };

    const getButtonLabel = () => {
        const label = (() => {
            if (isHost) return isLive ? 'Open Host Room' : 'Host Session';
            if (isJoined) return isLive ? 'Join Live Session' : 'Join Session';
            if (isPending) return 'Request Pending';
            if (isFull) return 'Session Full';
            if (isRequestBusy) return 'Requesting...';
            return 'Request to Join';
        })();
        return label;
    };

    const buttonDisabled = isPending || isFull || isRequestBusy;

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative group border border-slate-100 hover:border-outline-variant/15 flex flex-col justify-between min-h-[260px]">
            {isLive && (
                <div className="absolute -top-3 -left-3">
                    <div className="bg-white shadow-lg p-2 rounded-lg">
                        <div className="bg-green-500/10 text-green-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            LIVE
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start mb-4 pt-2">
                <div className="min-w-0 pr-4">
                    <h3 className="text-xl font-bold font-headline text-primary leading-tight group-hover:text-primary-container transition-colors">
                        {session.title}
                    </h3>
                    <span className="text-xs font-medium text-slate-400 mt-1 block italic">
                        Host: {session.host?.full_name || 'Unknown Scholar'}
                    </span>
                </div>
                <div className="bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-2 shrink-0">
                    <span className="material-symbols-outlined text-sm text-primary">groups</span>
                    <span className="text-xs font-bold text-primary">{participantCount}/{session.max_members} joined</span>
                </div>
            </div>

            <div className="flex items-center gap-6 mb-6">
                <div className="flex -space-x-3 overflow-hidden">
                    <img
                        alt="Host"
                        className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover bg-slate-200"
                        src={getAvatar(session.host?.avatar_url, session.host?.full_name)}
                    />
                    {participantCount > 1 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white text-[10px] font-bold text-slate-400">
                            +{participantCount - 1}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                    <span className="text-xs font-bold">
                        {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                {isPending && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-2 py-1 rounded">
                        Waiting Approval
                    </span>
                )}
            </div>

            {isHost && pendingRequests.length > 0 && (
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Join Requests</span>
                        <span className="text-[10px] font-bold text-slate-400">{pendingRequests.length}</span>
                    </div>
                    <div className="space-y-2">
                        {pendingRequests.map(request => {
                            const acceptBusy = busyAction === `accept:${request.id}`;
                            const rejectBusy = busyAction === `reject:${request.id}`;
                            const disabled = acceptBusy || rejectBusy || isFull;

                            return (
                                <div key={request.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
                                    <span className="min-w-0 truncate text-xs font-bold text-slate-700">
                                        {request.requesterName}
                                    </span>
                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            onClick={() => onRejectRequest(request)}
                                            disabled={disabled}
                                            className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => onAcceptRequest(session, request)}
                                            disabled={disabled}
                                            className="px-2 py-1 rounded text-[10px] font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <button
                onClick={handleJoin}
                disabled={buttonDisabled}
                className={`w-full ${isLive && isJoined ? 'bg-primary text-white hover:bg-primary/90' : 'bg-primary-container text-white hover:bg-primary'} py-3 rounded-lg font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100`}
            >
                {getButtonLabel()}
            </button>

            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-slate-900 px-6 py-6 rounded-2xl shadow-2xl border-2 border-red-100 font-bold transition-all duration-300 z-50 flex flex-col items-center min-w-[260px] ${showPopup ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                <button
                    onClick={() => setShowPopup(false)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 rounded-full p-1 flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-sm block leading-none">close</span>
                </button>
                <div className="bg-red-50 text-red-500 p-3 rounded-full mb-3 border border-red-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl block leading-none">error</span>
                </div>
                <span className="text-lg text-center whitespace-normal leading-tight">Session hasn't started yet!</span>
            </div>
        </div>
    );
};

export default DiscoveryRoomCard;
