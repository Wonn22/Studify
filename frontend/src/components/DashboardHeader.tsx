interface HeaderProps {
    name: string;
    sessionCount: number;
}

const DashboardHeader = ({ name, sessionCount }: HeaderProps) => {
    return (
        <section className="grid grid-cols-12 gap-6 mb-16">
            <div className="col-span-12 md:col-span-8">
                <span className="tracking-[0.2em] font-semibold uppercase text-[10px] text-slate-500 mb-3 block">
                    Academic Year 2024
                </span>
                <h1 className="text-5xl font-extrabold text-slate-950 tracking-tight mb-4 font-headline">
                    Welcome back, {name}.
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl font-light leading-relaxed">
                    You have <span className="font-semibold text-slate-950">{sessionCount} study sessions</span> scheduled.
                </p>
            </div>
            <div className="col-span-12 md:col-span-4 flex items-end justify-end">
                <button className="bg-slate-950 text-white px-8 py-4 rounded-md font-semibold flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-950/10 active:scale-95 duration-150">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Start New Session
                </button>
            </div>
        </section>
    );
};

export default DashboardHeader;