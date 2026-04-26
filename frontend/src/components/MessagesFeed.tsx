interface Activity {
    id: string | number;
    title: string;
    content: string;
    time: string;
    active: boolean;
}

interface ActivityFeedProps {
    activities: Activity[];
}

const ActivityFeed = ({ activities }: ActivityFeedProps) => {

    return (
        <div className="bg-slate-50 p-8 rounded-lg border border-slate-100">
            <h3 className="text-lg font-bold text-slate-950 mb-6 font-headline">Recent Messages</h3>
            <div className="space-y-6">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${activity.active ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                        <div>
                            <p className="text-sm font-semibold text-slate-950">{activity.title}</p>
                            <p className="text-xs text-slate-500 mt-1 italic">"{activity.content}"</p>
                            <span className="text-[10px] text-slate-400 font-bold mt-2 block tracking-widest">{activity.time}</span>
                        </div>
                    </div>
                ))}
            </div>
            <button className="w-full mt-8 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-950 transition-colors border border-slate-200 rounded-md">
                View All Messages
            </button>
        </div>
    );
};

export default ActivityFeed;