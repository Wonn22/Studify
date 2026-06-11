import { useState, useEffect } from 'react';

interface SessionProps {
    title: string;
    time: string;
    tag: string;
    members?: number;
    partner?: string;
    isGroup: boolean;
    scheduledAt?: string;
    durationMinutes?: number;
    meetingLink?: string | null;
}

const SessionCard = ({ title, time, tag, members, partner, isGroup, scheduledAt, durationMinutes, meetingLink }: SessionProps) => {
    const [showPopup, setShowPopup] = useState(false);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        if (scheduledAt) {
            const checkLive = () => {
                const now = new Date();
                const start = new Date(scheduledAt);
                const end = new Date(start.getTime() + (durationMinutes || 60) * 60000);
                setIsLive(now >= start && now <= end);
            };
            checkLive();
            const interval = setInterval(checkLive, 60000);
            return () => clearInterval(interval);
        }
    }, [scheduledAt, durationMinutes]);

    const handleJoin = () => {
        if (!isLive) {
            setShowPopup(true);
            return;
        }

        const trimmedMeetingLink = meetingLink?.trim();

        if (!trimmedMeetingLink) {
            alert('Meeting link is not available for this session.');
            return;
        }

        const targetUrl = /^https?:\/\//i.test(trimmedMeetingLink)
            ? trimmedMeetingLink
            : `https://${trimmedMeetingLink}`;

        window.open(targetUrl, '_blank', 'noopener,noreferrer');
    };
    return (
        <div className="bg-white p-8 rounded-lg relative overflow-hidden group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 border border-slate-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

            <div className="relative z-10">
                <div className="flex gap-2 items-center">
                    <span className={`${isGroup ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600'} text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider`}>
                        {tag}
                    </span>
                    {isLive && (
                        <span className="bg-green-500/10 text-green-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            LIVE
                        </span>
                    )}
                </div>

                <h3 className="text-xl font-bold mt-4 text-slate-900 leading-tight font-headline">{title}</h3>

                <div className="mt-6 flex items-center gap-4 text-slate-500 text-sm flex-wrap">
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">{isGroup ? 'groups' : 'person'}</span>
                        <span>{isGroup ? `${members} Members` : `With ${partner}`}</span>
                    </div>
                    {scheduledAt && (
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                            <span>{new Date(scheduledAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>{time}</span>
                    </div>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleJoin}
                        className={`${isLive ? 'bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800' : 'text-blue-900 hover:translate-x-2'} font-bold text-sm flex items-center gap-2 transition-all active:scale-95`}
                    >
                        {isLive ? 'Join Session' : 'Join Meeting Link'}
                        <span className="material-symbols-outlined text-sm">
                            {isLive ? 'login' : 'arrow_forward'}
                        </span>
                    </button>
                </div>
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
        </div>
    );
};

export default SessionCard;
