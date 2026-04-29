import { useState, useEffect } from 'react';
import { supabase } from '../database/database';

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
    const [sessionType, setSessionType] = useState<'focus' | 'collaborative'>('focus');
    const [participants, setParticipants] = useState(1);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [meetingLink, setMeetingLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Default date/time to now
    useEffect(() => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 5);
        setScheduledDate(dateStr);
        setScheduledTime(timeStr);
    }, []);

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Session title is required.');
            return;
        }
        if (!scheduledDate || !scheduledTime) {
            setError('Please set a date and time.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

            const { error: insertError } = await supabase
                .from('sessions')
                .insert({
                    title: title.trim(),
                    subject,
                    description: description.trim() || null,
                    scheduled_at: scheduledAt,
                    duration_minutes: durationMinutes,
                    max_members: sessionType === 'focus' ? 1 : participants,
                    meeting_link: meetingLink.trim() || null,
                    created_by: user.id,
                });

            if (insertError) throw insertError;

            onSessionCreated();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create session.');
        } finally {
            setLoading(false);
        }
    };

    const clampParticipants = (val: number) => {
        setParticipants(Math.max(1, Math.min(20, val)));
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative"
                style={{ animation: 'modalIn 0.22s cubic-bezier(.4,0,.2,1)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 pt-7 pb-4">
                    <h2 className="text-xl font-bold text-slate-900 font-headline">Start a New Study Session</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 transition-colors rounded-full p-1 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
                    </button>
                </div>

                <div className="px-7 pb-7 space-y-5">
                    {/* Subject */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Session Subject</label>
                        <div className="relative">
                            <select
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition pr-9"
                            >
                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/></svg>
                            </span>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Session Title</label>
                        <input
                            type="text"
                            placeholder="e.g. Midterm Review Prep"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition"
                        />
                    </div>

                    {/* Session Type */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Session Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Focus */}
                            <button
                                onClick={() => setSessionType('focus')}
                                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 font-semibold text-sm transition-all duration-150
                                    ${sessionType === 'focus'
                                        ? 'border-slate-900 bg-white text-slate-900 shadow-md shadow-slate-900/10'
                                        : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                                    }`}
                            >
                                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                                    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
                                    <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1" opacity=".4"/>
                                </svg>
                                Focus
                            </button>
                            {/* Collaborative */}
                            <button
                                onClick={() => setSessionType('collaborative')}
                                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 font-semibold text-sm transition-all duration-150
                                    ${sessionType === 'collaborative'
                                        ? 'border-slate-900 bg-white text-slate-900 shadow-md shadow-slate-900/10'
                                        : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                                    }`}
                            >
                                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                                    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/>
                                    <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/>
                                    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M3 20c0-3.314 2.239-6 5-6h8c2.761 0 5 2.686 5 6"/>
                                </svg>
                                Collaborative
                            </button>
                        </div>
                    </div>

                    {/* Participants — only for collaborative */}
                    {sessionType === 'collaborative' && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Participants</label>
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                                <button
                                    onClick={() => clampParticipants(participants - 1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 transition font-bold text-lg"
                                    aria-label="Decrease"
                                >−</button>
                                <span className="text-slate-900 font-bold text-base w-8 text-center">{participants}</span>
                                <button
                                    onClick={() => clampParticipants(participants + 1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 transition font-bold text-lg"
                                    aria-label="Increase"
                                >+</button>
                            </div>
                        </div>
                    )}

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date</label>
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={e => setScheduledDate(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Time</label>
                            <input
                                type="time"
                                value={scheduledTime}
                                onChange={e => setScheduledTime(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition"
                            />
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Duration — {durationMinutes} min
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

                    {/* Meeting Link (optional) */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Meeting Link <span className="normal-case font-normal">(optional)</span></label>
                        <input
                            type="url"
                            placeholder="https://meet.google.com/..."
                            value={meetingLink}
                            onChange={e => setMeetingLink(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-red-500 text-xs font-semibold">{error}</p>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-slate-950 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 active:scale-[.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                </svg>
                                Creating…
                            </span>
                        ) : 'Create Session'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(12px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default CreateSessionModal;
