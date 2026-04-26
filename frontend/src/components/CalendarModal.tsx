interface CalendarModalProps {
    onClose: () => void;
}

const CalendarModal = ({ onClose }: CalendarModalProps) => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyCells = Array.from({ length: firstDay }, (_, i) => i);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const sessionDays = [today.getDate(), today.getDate() + 2, today.getDate() + 5];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
                <div className="bg-slate-950 p-6 flex justify-between items-center text-white">
                    <h3 className="font-headline text-xl font-bold uppercase tracking-wider">
                        {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
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
                            const isToday = day === today.getDate();
                            const hasSession = sessionDays.includes(day);

                            return (
                                <div
                                    key={day}
                                    className={`
                                        aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all cursor-pointer relative group
                                        ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-700 hover:bg-slate-100'}
                                        ${hasSession && !isToday ? 'border border-blue-200 bg-blue-50' : ''}
                                    `}
                                >
                                    <span>{day}</span>
                                    {hasSession && (
                                        <div className={`w-1 h-1 rounded-full mt-1 ${isToday ? 'bg-white' : 'bg-blue-600'}`}></div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-100 p-6">
                    <h4 className="text-sm font-bold text-slate-900 mb-3 font-headline">Upcoming on {today.getDate()} {today.toLocaleString('default', { month: 'short' })}</h4>
                    <div className="flex gap-4 items-center bg-white p-3 rounded-lg border border-slate-200">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        <div>
                            <p className="text-xs font-bold text-slate-900">Structural Engineering Final Prep</p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">14:00 - 16:00</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarModal;
