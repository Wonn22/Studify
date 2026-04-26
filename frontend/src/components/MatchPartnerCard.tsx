interface PartnerProps {
    name: string;
    major: string;
    tags: string[];
    avatarUrl?: string | null;
    onClick?: () => void;
}

const MatchPartnerCard = ({ name, major, tags, avatarUrl, onClick }: PartnerProps) => {
    const avatarSrc = avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    return (
        <div
            onClick={onClick}
            className="bg-white p-6 rounded-lg border-l-4 border-blue-900 shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 group"
        >
            <div className="relative mb-4 w-fit">
                <img
                    className="w-16 h-16 rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    src={avatarSrc}
                    alt={name}
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary-container rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-[10px]">open_in_full</span>
                </div>
            </div>
            <h4 className="font-bold text-slate-950 font-headline group-hover:text-primary-container transition-colors">{name}</h4>
            <p className="text-xs text-slate-500 mb-4">{major}</p>
            <div className="flex flex-wrap gap-2">
                {tags.slice(0, 3).map((tag) => (
                    <span
                        key={tag}
                        className="text-[9px] bg-slate-100 px-2 py-1 rounded-full font-bold uppercase tracking-tighter text-slate-600"
                    >
                        {tag}
                    </span>
                ))}
                {tags.length > 3 && (
                    <span className="text-[9px] bg-slate-100 px-2 py-1 rounded-full font-bold uppercase tracking-tighter text-slate-400">
                        +{tags.length - 3}
                    </span>
                )}
            </div>
        </div>
    );
};

export default MatchPartnerCard;