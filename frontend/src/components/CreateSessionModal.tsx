import { useState, useEffect } from 'react';
import { supabase } from '../database/database';
import { getCurrentSessionUser, isHttpUrl } from '../security/dataAccess';

interface CreateSessionModalProps {
    onClose: () => void;
    onSessionCreated: () => void;
}

const SUBJECTS = [
    'Computational Neuroscience',
    'Data Structures & Algorithms',
    'Linear Algebra',
    'Calculus',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Networks',
    'Operating Systems',
    'Machine Learning',
    'Web Development',
    'Databases',
    'Software Engineering',
    'Other',
];

const CreateSessionModal = ({ onClose, onSessionCreated }: CreateSessionModalProps) => {
    const [subject, setSubject] = useState(SUBJECTS[0]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [capacity, setCapacity] = useState(4);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [meetingLink, setMeetingLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const now = new Date();
        setScheduledDate(now.toISOString().slice(0, 10));
        setScheduledTime(now.toTimeString().slice(0, 5));
    }, []);

    const handleSubmit = async () => {
        const trimmedTitle = title.trim();
        const trimmedMeetingLink = meetingLink.trim();

        if (!trimmedTitle) {
            setError('Session title is required.');
            return;
        }
        if (!scheduledDate || !scheduledTime) {
            setError('Please set a date and time.');
            return;
        }
        if (!trimmedMeetingLink) {
            setError('Meeting link is required.');
            return;
        }
        if (!isHttpUrl(trimmedMeetingLink)) {
            setError('Meeting link must be a valid http or https URL.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const user = await getCurrentSessionUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

            const { data: newSession, error: insertError } = await supabase
                .from('sessions')
                .insert({
                    title: trimmedTitle,
                    subject,
                    description: description.trim() || null,
                    scheduled_at: scheduledAt,
                    duration_minutes: durationMinutes,
                    max_members: capacity,
                    meeting_link: trimmedMeetingLink,
                    created_by: user.id,
                })
                .select('id')
                .single();

            if (insertError) {
                throw insertError;
            }
            if (!newSession) {
                throw new Error('Session was created without returning an id.');
            }

            const { error: participantError } = await supabase
                .from('session_participants')
                .upsert({
                    session_id: newSession.id,
                    profile_id: user.id,
                }, { onConflict: 'session_id,profile_id' });

            if (participantError) {
                throw participantError;
            }

            onSessionCreated();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create session.');
        } finally {
            setLoading(false);
        }
    };

    const clampCapacity = (value: number) => {
        setCapacity(Math.max(2, Math.min(20, value)));
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative max-h-[90vh] flex flex-col"
                style={{ animation: 'modalIn 0.22s cubic-bezier(.4,0,.2,1)' }}
            >
                <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900 font-headline">Start a New Study Session</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 transition-colors rounded-full p-1 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div className="px-6 pb-6 space-y-3.5 overflow-y-auto">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Session Subject</label>
                        <div className="relative">
                            <select
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition pr-9"
                            >
                                {SUBJECTS.map(item => <option key={item} value={item}>{item}</option>)}
                            </select>
                            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                                expand_more
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Session Title</label>
                        <input
                            type="text"
                            placeholder="e.g. Midterm Review Prep"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                        <textarea
                            rows={2}
                            placeholder="Add study goals, topics, or preparation notes..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Capacity</label>
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                            <button
                                onClick={() => clampCapacity(capacity - 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 transition font-bold text-lg"
                                aria-label="Decrease capacity"
                            >
                                -
                            </button>
                            <span className="text-slate-900 font-bold text-base min-w-20 text-center">{capacity} seats</span>
                            <button
                                onClick={() => clampCapacity(capacity + 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 transition font-bold text-lg"
                                aria-label="Increase capacity"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date</label>
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={e => setScheduledDate(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Time</label>
                            <input
                                type="time"
                                value={scheduledTime}
                                onChange={e => setScheduledTime(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Duration - {durationMinutes} min
                        </label>
                        <input
                            type="range"
                            min={15}
                            max={240}
                            step={15}
                            value={durationMinutes}
                            onChange={e => setDurationMinutes(Number(e.target.value))}
                            className="w-full accent-slate-900"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
                            <span>15 min</span><span>4 hrs</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Meeting Link</label>
                        <input
                            type="url"
                            placeholder="https://meet.google.com/... or https://zoom.us/j/..."
                            value={meetingLink}
                            onChange={e => setMeetingLink(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs font-semibold">{error}</p>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-slate-950 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 active:scale-[.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
                    >
                        {loading ? 'Creating...' : 'Create Session'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(12px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default CreateSessionModal;
