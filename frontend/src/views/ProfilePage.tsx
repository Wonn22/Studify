import { useEffect, useRef, useState } from 'react';
import { supabase } from '../database/database';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    major: string | null;
    bio: string | null;
    interests: string[] | null;
    location?: string;
    email?: string;
}

const EditModal = ({ profile, onClose, onSaved }: {
    profile: UserProfile;
    onClose: () => void;
    onSaved: (updated: UserProfile) => void;
}) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [form, setForm] = useState({
        full_name: profile.full_name ?? '',
        major: profile.major ?? '',
        bio: profile.bio ?? '',
        avatar_url: profile.avatar_url ?? '',
    });
    const [tags, setTags] = useState<string[]>(profile.interests ?? []);
    const [newTag, setNewTag] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const addTag = () => {
        const t = newTag.trim();
        if (t && !tags.includes(t)) setTags([...tags, t]);
        setNewTag('');
    };

    const handleSave = async () => {
        if (!form.full_name.trim()) { setError('Full name is required.'); return; }
        setSaving(true); setError(null);
        try {
            const updates = {
                id: profile.id,
                full_name: form.full_name.trim(),
                major: form.major.trim() || null,
                bio: form.bio.trim() || null,
                avatar_url: form.avatar_url.trim() || null,
                interests: tags,
            };
            const { error: supaErr } = await supabase
                .from('profiles')
                .upsert(updates, { onConflict: 'id' });
            if (supaErr) throw supaErr;
            onSaved({ ...profile, ...updates });
        } catch (err: any) {
            setError(err.message ?? 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ animation: 'modal-in 0.2s ease-out' }}>
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                    <div>
                        <p className="text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase mb-1">Profile</p>
                        <h2 className="text-2xl font-bold text-primary-container font-headline">Edit Profile</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>

                <div className="overflow-y-auto px-8 py-6 space-y-6 flex-1">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">error</span>{error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase mb-2">Avatar URL</label>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                                <img
                                    src={form.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.full_name)}`}
                                    alt="preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.full_name)}`; }}
                                />
                            </div>
                            <input type="url" placeholder="https://example.com/photo.jpg" value={form.avatar_url}
                                onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                                className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase mb-2">Full Name <span className="text-red-400">*</span></label>
                        <input type="text" placeholder="Your full name" value={form.full_name}
                            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition"
                        />
                    </div>

                    <div>
                        <label className="block text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase mb-2">Major</label>
                        <input type="text" placeholder="e.g. Computer Science" value={form.major}
                            onChange={e => setForm(f => ({ ...f, major: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition"
                        />
                    </div>

                    <div>
                        <label className="block text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase mb-2">Bio</label>
                        <textarea rows={4} placeholder="Tell others about your academic journey..." value={form.bio}
                            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase mb-2">Interests & Skills</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 px-4 py-1.5 bg-primary-container text-white rounded-full text-sm font-semibold tracking-wide">
                                    {tag}
                                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:opacity-70 transition-opacity ml-1">
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                </span>
                            ))}
                            {tags.length === 0 && <span className="text-slate-400 italic text-sm">No tags yet.</span>}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="e.g. Python, NLP…" value={newTag}
                                onChange={e => setNewTag(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition"
                            />
                            <button onClick={addTag}
                                className="px-4 py-2.5 bg-primary-container text-white rounded-lg text-sm font-semibold hover:bg-primary transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-base">add</span> Add
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
                    <button onClick={onClose}
                        className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-colors"
                    >Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="px-6 py-2.5 rounded-lg bg-primary-container text-white text-sm font-semibold hover:bg-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving
                            ? <><span className="material-symbols-outlined text-base" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Saving…</>
                            : <><span className="material-symbols-outlined text-base">save</span> Save Changes</>
                        }
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes modal-in { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
                @keyframes spin     { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
                @keyframes toast-in { from { opacity:0; transform:translateX(-50%) translateY(-8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
            `}</style>
        </div>
    );
};

// ─── Share Modal ─────────────────────────────────────────────────────────────
const ShareModal = ({ profile, onClose }: { profile: UserProfile; onClose: () => void }) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState<'link' | 'text' | null>(null);

    const profileUrl = `${window.location.origin}/profile/${profile.id}`;

    const textSummary =
        `📚 ${profile.full_name}` +
        (profile.major ? ` · ${profile.major}` : '') +
        (profile.bio ? `\n"${profile.bio}"` : '') +
        (profile.interests?.length ? `\nSkills: ${profile.interests.join(', ')}` : '') +
        `\n🔗 ${profileUrl}`;

    const copyLink = async () => {
        await navigator.clipboard.writeText(profileUrl);
        setCopied('link');
        setTimeout(() => setCopied(null), 2000);
    };

    const copyText = async () => {
        await navigator.clipboard.writeText(textSummary);
        setCopied('text');
        setTimeout(() => setCopied(null), 2000);
    };

    const nativeShare = () => {
        if (navigator.share) {
            navigator.share({ title: `${profile.full_name} on Studify`, text: textSummary, url: profileUrl });
        } else {
            copyLink();
        }
    };

    return (
        <div
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ animation: 'modal-in 0.2s ease-out' }}>
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                    <div>
                        <p className="text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase mb-1">Portfolio</p>
                        <h2 className="text-2xl font-bold text-primary-container font-headline">Share Profile</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>

                <div className="mx-6 mt-6 rounded-xl border border-slate-100 overflow-hidden shadow-md">
                    <div className="bg-primary-container px-6 pt-6 pb-10 relative">
                        <div className="text-white/60 text-[0.6rem] font-bold tracking-[0.25em] uppercase mb-4">Studify · Academic Profile</div>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/20 flex-shrink-0 ring-2 ring-white/30">
                                <img
                                    src={profile.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.full_name)}`}
                                    alt={profile.full_name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <p className="text-white font-bold text-lg font-headline leading-tight">{profile.full_name}</p>
                                <p className="text-white/70 text-sm">{profile.major || 'Studify Scholar'}</p>
                            </div>
                        </div>
                        {profile.bio && (
                            <p className="text-white/80 text-sm mt-4 leading-relaxed line-clamp-2">"{profile.bio}"</p>
                        )}
                    </div>
                    <div className="bg-slate-50 px-6 py-4 flex flex-wrap gap-2">
                        {profile.interests?.slice(0, 4).map(s => (
                            <span key={s} className="px-3 py-1 bg-white border border-slate-200 text-primary-container rounded-full text-xs font-semibold tracking-wide shadow-sm">{s}</span>
                        ))}
                        {(profile.interests?.length ?? 0) > 4 && (
                            <span className="px-3 py-1 bg-white border border-slate-200 text-slate-400 rounded-full text-xs font-semibold">+{(profile.interests?.length ?? 0) - 4} more</span>
                        )}
                        {(!profile.interests || profile.interests.length === 0) && (
                            <span className="text-slate-400 text-xs italic">No skills listed</span>
                        )}
                    </div>
                    <div className="px-6 py-3 border-t border-slate-100 flex items-center gap-2 bg-white">
                        <span className="material-symbols-outlined text-slate-300 text-sm">link</span>
                        <span className="text-xs text-slate-400 truncate flex-1 font-mono">{profileUrl}</span>
                    </div>
                </div>

                <div className="px-6 py-6 space-y-3">
                    <button
                        onClick={copyLink}
                        className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 border-primary-container text-primary-container font-semibold hover:bg-primary-container hover:text-white transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">{copied === 'link' ? 'check_circle' : 'content_copy'}</span>
                        {copied === 'link' ? 'Link Copied!' : 'Copy Link'}
                    </button>
                    <button
                        onClick={copyText}
                        className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">{copied === 'text' ? 'check_circle' : 'format_quote'}</span>
                        {copied === 'text' ? 'Copied as Text!' : 'Copy as Text'}
                    </button>
                    <button
                        onClick={nativeShare}
                        className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-700 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">ios_share</span>
                        Share via…
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProfilePage = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getProfile = async () => {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    navigate('/login');
                    return;
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                setProfile(data);
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        getProfile();
    }, [navigate]);

    const handleSaved = (updated: UserProfile) => {
        setProfile(updated);
        setShowEdit(false);
        setToast('Profile updated!');
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-surface">
            <div className="animate-pulse text-primary font-headline">Synchronizing Atelier...</div>
        </div>
    );

    return (
        <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col font-body">
            {toast && (
                <div className="fixed top-6 left-1/2 z-[100] bg-primary-container text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold" style={{ animation: 'toast-in 0.25s ease-out', transform: 'translateX(-50%)' }}>
                    <span className="material-symbols-outlined text-base">check_circle</span>{toast}
                </div>
            )}
            {showEdit && profile && (
                <EditModal profile={profile} onClose={() => setShowEdit(false)} onSaved={handleSaved} />
            )}
            {showShare && profile && (
                <ShareModal profile={profile} onClose={() => setShowShare(false)} />
            )}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
                <div className="flex items-center gap-4 w-full px-6 h-16">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-slate-900 hover:bg-slate-100 p-2 rounded-full transition-all"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        <span className="text-lg font-semibold font-headline">Back to Dashboard</span>
                    </button>
                </div>
            </nav>

            <main className="flex-grow w-full max-w-[1440px] mx-auto px-8 py-12 md:py-20 mt-16 grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-start-2 lg:col-span-10 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row border border-slate-100">

                    <aside className="w-full md:w-[320px] bg-slate-50 p-10 flex flex-col items-center md:items-start text-center md:text-left border-r border-slate-100">
                        <div className="relative mb-8">
                            <div className="w-48 h-48 rounded-lg overflow-hidden shadow-xl transform -rotate-2 hover:rotate-0 transition-transform duration-500 bg-slate-200">
                                <img
                                    alt={profile?.full_name}
                                    className="w-full h-full object-cover"
                                    src={
                                        profile?.avatar_url
                                        ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile?.full_name ?? '')}`
                                    }
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary-container text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                                <span className="material-symbols-outlined text-sm">verified</span>
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold tracking-tight text-primary-container font-headline mb-1">
                            {profile?.full_name || 'Scholar Name'}
                        </h1>
                        <p className="text-secondary font-medium mb-8">{profile?.major || 'Undecided Major'}</p>

                        <div className="w-full space-y-4 pt-8 border-t border-slate-200">
                            <button onClick={() => setShowEdit(true)} className="w-full bg-primary-container text-white py-3 rounded-lg font-semibold hover:bg-primary transition-all active:scale-95 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-lg">edit</span> Edit Profile
                            </button>
                            <button onClick={() => setShowShare(true)} className="w-full border-2 border-primary-container text-primary-container py-3 rounded-lg font-semibold hover:bg-primary-container hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-lg">share</span> Share Portfolio
                            </button>
                        </div>

                        <div className="mt-auto pt-12 space-y-3 w-full">
                            <div className="flex items-center gap-3 text-slate-600">
                                <span className="material-symbols-outlined text-[18px]">location_on</span>
                                <span className="text-sm font-label uppercase tracking-wider">Binus, Alam Sutera</span>
                            </div>
                        </div>
                    </aside>

                    <div className="flex-grow p-10 md:p-16 space-y-16">
                        <section>
                            <SectionHeader label="Research Statement" title="Bio" />
                            <p className="text-on-surface-variant leading-relaxed text-lg max-w-2xl font-light">
                                {profile?.bio || 'No biography provided yet. Update your profile to share your academic journey.'}
                            </p>
                        </section>

                        <section>
                            <SectionHeader label="Competencies" title="Technical Skills" />
                            <div className="flex flex-wrap gap-3">
                                {profile?.interests && profile.interests.length > 0 ? (
                                    profile.interests.map((skill) => (
                                        <span key={skill} className="px-5 py-2 bg-primary-container text-white rounded-full text-sm font-semibold tracking-wide">
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-slate-400 italic">No skills listed yet.</span>
                                )}
                            </div>
                        </section>

                        <section>
                            <SectionHeader label="Active Investigations" title="Ongoing Projects" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ProjectCard
                                    title="Semantic Graph Mapping"
                                    desc="Collaborative project to map academic synthesis using modern AI clusters."
                                    icon="group"
                                    meta="4 Collaborators"
                                />
                                <ProjectCard
                                    title="Studify System Architecture"
                                    desc="Building the next generation of academic matching systems for Binusians."
                                    icon="science"
                                    meta="Academic Thesis"
                                />
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <footer className="w-full mt-auto py-12 bg-slate-100">
                <div className="max-w-[1440px] mx-auto px-12 flex flex-col md:flex-row justify-between items-center gap-8">
                    <span className="font-headline font-bold text-primary-container text-xl">Studify</span>
                    <p className="text-sm uppercase font-semibold text-slate-500">© 2026 Studify Academic Atelier.</p>
                </div>
            </footer>
        </div>
    );
};

const SectionHeader = ({ label, title }: { label: string, title: string }) => (
    <>
        <div className="flex items-center gap-4 mb-6">
            <span className="text-[0.65rem] font-bold tracking-[0.2em] text-primary-container uppercase">{label}</span>
            <div className="h-[1px] flex-grow bg-slate-200"></div>
        </div>
        <h2 className="text-2xl font-bold text-primary-container mb-4 font-headline">{title}</h2>
    </>
);

const ProjectCard = ({ title, desc, icon, meta }: any) => (
    <div className="group bg-slate-50 p-6 rounded-lg transition-all hover:bg-slate-100 cursor-pointer border border-transparent hover:border-slate-200">
        <h3 className="text-lg font-bold text-primary mb-2 group-hover:text-primary-container font-headline">{title}</h3>
        <p className="text-sm text-slate-500 mb-4">{desc}</p>
        <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-sm">{icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{meta}</span>
        </div>
    </div>
);

export default ProfilePage;