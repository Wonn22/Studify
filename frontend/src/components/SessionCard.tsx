interface SessionProps {
    title: string;
    time: string;
    tag: string;
    members?: number;
    partner?: string;
    isGroup: boolean;
}

const SessionCard = ({ title, time, tag, members, partner, isGroup }: SessionProps) => {
    return (
        <div className="bg-white p-8 rounded-lg relative overflow-hidden group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 border border-slate-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

            <div className="relative z-10">
                <span className={`${isGroup ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600'} text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider`}>
                    {tag}
                </span>

                <h3 className="text-xl font-bold mt-4 text-slate-900 leading-tight font-headline">{title}</h3>

                <div className="mt-6 flex items-center gap-4 text-slate-500 text-sm">
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">{isGroup ? 'groups' : 'person'}</span>
                        <span>{isGroup ? `${members} Members` : `With ${partner}`}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>{time}</span>
                    </div>
                </div>

                {!isGroup && (
                    <div className="mt-8">
                        <button className="text-blue-900 font-bold text-sm flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                            Join Meeting Link
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionCard;