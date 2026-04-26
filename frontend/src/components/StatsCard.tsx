interface StatsProps {
    thisWeekHours: number;
    lastWeekHours: number;
    consistencyDays: number;
}

const StatsCard = ({ thisWeekHours, lastWeekHours, consistencyDays }: StatsProps) => {
    const diffHours = Math.round((thisWeekHours - lastWeekHours) * 10) / 10;
    const diffLabel = diffHours >= 0 ? `+${diffHours}h vs last week` : `${diffHours}h vs last week`;
    const diffColor = diffHours >= 0 ? 'text-blue-300' : 'text-red-400';

    const consistencyPercent = Math.round((consistencyDays / 7) * 100);
    const consistencyLabel =
        consistencyPercent >= 80 ? 'Top 10% student' :
            consistencyPercent >= 50 ? 'Good momentum!' :
                consistencyDays === 0 ? 'No sessions yet this week' :
                    `${consistencyDays} active day${consistencyDays > 1 ? 's' : ''} this week`;

    return (
        <div className="bg-slate-950 text-white p-10 rounded-lg relative overflow-hidden">
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40 mb-8">Weekly Performance</h2>

                <div className="space-y-10">
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-3xl font-extrabold font-headline">{thisWeekHours}h</span>
                            <span className={`text-xs font-semibold ${diffColor}`}>{diffLabel}</span>
                        </div>
                        <p className="text-xs text-white/50 font-medium uppercase tracking-wider">Total Study Time</p>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-3xl font-extrabold font-headline">{consistencyPercent}%</span>
                            <span className="text-xs font-semibold text-blue-300">{consistencyLabel}</span>
                        </div>
                        <p className="text-xs text-white/50 font-medium uppercase tracking-wider">Session Consistency</p>
                        <div className="mt-3 flex gap-1">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 h-1.5 rounded-full ${i < consistencyDays ? 'bg-blue-400' : 'bg-white/10'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-md flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-300">emoji_events</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold">
                                {consistencyDays >= 5 ? 'New Achievement!' : 'Keep it up!'}
                            </p>
                            <p className="text-xs text-white/40">
                                {consistencyDays >= 5
                                    ? '"Early Bird" for 5 days straight'
                                    : `Study ${7 - consistencyDays} more day${7 - consistencyDays > 1 ? 's' : ''} to unlock "Early Bird"`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsCard;
