interface PartnerProps {
    name: string;
    major: string;
    tags: string[];
    avatarUrl?: string | null;
}

const MatchPartnerCard = ({ name, major, tags, avatarUrl }: PartnerProps) => {
    const avatarSrc = avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    return (
        <div className="bg-white p-6 rounded-lg border-l-4 border-blue-900 shadow-sm hover:shadow-md transition-shadow">
            <img
                className="w-16 h-16 rounded-lg object-cover mb-4 grayscale hover:grayscale-0 transition-all duration-500"
                src={avatarSrc}
                alt={name}
            />
            <h4 className="font-bold text-slate-950 font-headline">{name}</h4>
            <p className="text-xs text-slate-500 mb-4">{major}</p>
            <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="text-[9px] bg-slate-100 px-2 py-1 rounded-full font-bold uppercase tracking-tighter text-slate-600"
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default MatchPartnerCard;