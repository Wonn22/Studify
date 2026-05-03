interface StatsProps {
    totalStudyTime: number;
    consistencyPercent: number;
}

const StatsCard = ({ totalStudyTime, consistencyPercent }: StatsProps) => {
    const consistencyLabel =
        consistencyPercent >= 80 ? 'Top 10% student' :
            consistencyPercent >= 50 ? 'Good momentum!' :
                consistencyPercent === 0 ? 'No sessions yet' :
                    `Keep it up!`;

    // Calculate a rough consistencyDays equivalent for the progress bar dots
    const consistencyDays = Math.round((consistencyPercent / 100) * 7);

    return (
        <div className="bg-slate-950 text-white p-10 rounded-lg relative overflow-hidden">
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40 mb-8">Overall Performance</h2>

                <div className="space-y-10">
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-3xl font-extrabold font-headline">{totalStudyTime}h</span>
                            <span className="text-xs font-semibold text-green-400">All-time</span>
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
            </div>
        </div>
    );
};

export default StatsCard;
