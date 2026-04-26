interface StatsProps {
    time: string;
    consistency: number;
}

const StatsCard = ({ time, consistency }: StatsProps) => {
    return (
        <div className="bg-slate-950 text-white p-10 rounded-lg relative overflow-hidden">
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40 mb-8">Weekly Performance</h2>

                <div className="space-y-10">
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-3xl font-extrabold font-headline">{time}</span>
                            <span className="text-xs font-semibold text-blue-300">+4.2h vs last week</span>
                        </div>
                        <p className="text-xs text-white/50 font-medium uppercase tracking-wider">Total Study Time</p>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-3xl font-extrabold font-headline">{consistency}%</span>
                            <span className="text-xs font-semibold text-blue-300">Top 5% student</span>
                        </div>
                        <p className="text-xs text-white/50 font-medium uppercase tracking-wider">Session Consistency</p>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-md flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-300">emoji_events</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold">New Achievement!</p>
                            <p className="text-xs text-white/40">"Early Bird" for 5 days straight</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsCard;