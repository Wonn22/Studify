import { useState, useEffect } from 'react';

const DiscoveryRoomCard = ({ session }: { session: any }) => {
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

    const handleJoin = () => {
        if (isLive) {
            alert("Joining session...");
        } else {
            setShowPopup(true);
        }
    };


    const participantCount = session.participants?.length || 0;

    const getAvatar = (url: string, name: string) =>
        url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative group border border-slate-100 hover:border-outline-variant/15 flex flex-col justify-between min-h-[240px]">
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
                <div>
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
            </div>

            <button 
                onClick={handleJoin}
                className={`w-full ${isLive ? 'bg-primary text-white hover:bg-primary/90' : 'bg-primary-container text-white hover:bg-primary'} py-3 rounded-lg font-bold text-sm transition-all shadow-md active:scale-95`}
            >
                {isLive ? 'Join Live Session' : 'Join Session'}
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