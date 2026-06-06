import { useState, useMemo } from 'react';

interface CalendarSession {
    id: string;
    title: string;
    scheduledAt: string;
    durationMinutes?: number;
    time?: string;
}

interface CalendarModalProps {
    onClose: () => void;
    sessions: CalendarSession[];
}

const CalendarModal = ({ onClose, sessions }: CalendarModalProps) => {
    const [viewDate, setViewDate] = useState(new Date());

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyCells = Array.from({ length: firstDay }, (_, i) => i);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    const sessionsByDay = useMemo(() => {
        const map: Record<number, CalendarSession[]> = {};
        sessions.forEach((s) => {
            const d = new Date(s.scheduledAt);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const day = d.getDate();
                if (!map[day]) map[day] = [];
                map[day].push(s);
            }
        });
        return map;
    }, [sessions, year, month]);

    const upcomingToday = useMemo(() => {
        if (!isCurrentMonth) return [];
        return sessionsByDay[today.getDate()] || [];
    }, [sessionsByDay, isCurrentMonth, today]);

    const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const goNextMonth = () => setViewDate(new Date(year, month + 1, 1));

    const formatSessionTime = (scheduledAt: string, durationMinutes?: number) => {
        const start = new Date(scheduledAt);
        const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!durationMinutes) return startStr;
        const end = new Date(start.getTime() + durationMinutes * 60000);
        const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${startStr} - ${endStr}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
                <div className="bg-slate-950 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={goPrevMonth}
                            className="text-white/60 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <h3 className="font-headline text-xl font-bold uppercase tracking-wider">
                            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button
                            onClick={goNextMonth}
                            className="text-white/60 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors flex items-center justify-center p-1 rounded-md hover:bg-white/10"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-7 gap-2 mb-6 text-center">
                        {dayNames.map(day => (
                            <div key={day} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                        {emptyCells.map(i => <div key={`empty-${i}`} />)}

                        {days.map(day => {
                            const isToday = isCurrentMonth && day === today.getDate();
                            const daySessions = sessionsByDay[day] || [];
                            const hasSession = daySessions.length > 0;

                            return (
                                <div
                                    key={day}
                                    className={`
                                        aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all relative group
                                        ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-700 hover:bg-slate-100'}
                                        ${hasSession && !isToday ? 'border border-blue-200 bg-blue-50' : ''}
                                    `}
                                >
                                    <span>{day}</span>
                                    {hasSession && (
                                        <div className={`flex gap-0.5 mt-1 ${isToday ? 'bg-white' : 'bg-blue-600'} rounded-full px-1 py-0.5`}>
                                            {daySessions.slice(0, 3).map((_, i) => (
                                                <div key={i} className={`w-1 h-1 rounded-full ${isToday ? 'bg-blue-600' : 'bg-white'}`}></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-100 p-6 max-h-48 overflow-y-auto">
                    <h4 className="text-sm font-bold text-slate-900 mb-3 font-headline">
                        {isCurrentMonth ? `Upcoming on ${today.getDate()} ${today.toLocaleString('default', { month: 'short' })}` : `Sessions in ${viewDate.toLocaleString('default', { month: 'long' })}`}
                    </h4>
                    {upcomingToday.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No sessions scheduled.</p>
                    ) : (
                        <div className="space-y-2">
                            {upcomingToday.map((s) => (
                                <div key={s.id} className="flex gap-4 items-center bg-white p-3 rounded-lg border border-slate-200">
                                    <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 truncate">{s.title}</p>
                                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">
                                            {formatSessionTime(s.scheduledAt, s.durationMinutes)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarModal;
