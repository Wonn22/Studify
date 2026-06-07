import { useState } from 'react';

interface ReportUserModalProps {
    reportedId: string;
    reportedName: string;
    reporterId: string;
    onClose: () => void;
    onSubmit: (reason: string, description: string) => Promise<{ error?: Error | null }>;
}

const reasons = [
    'Inappropriate behavior',
    'Harassment or bullying',
    'Spam',
    'Fake profile',
    'Cheating or academic dishonesty',
    'Other',
];

const ReportUserModal = ({ reportedId: _reportedId, reportedName, reporterId: _reporterId, onClose, onSubmit }: ReportUserModalProps) => {
    const [reason, setReason] = useState(reasons[0]);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason || !description.trim()) return;
        setSubmitting(true);
        const { error } = await onSubmit(reason, description.trim());
        setSubmitting(false);
        if (!error) {
            setDone(true);
            setTimeout(() => onClose(), 1500);
        } else {
            alert('Failed to submit report: ' + error.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
                <div className="bg-slate-950 p-6 flex justify-between items-center text-white">
                    <h3 className="font-headline text-lg font-bold">Report User</h3>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {done ? (
                    <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-2xl">check</span>
                        </div>
                        <p className="text-slate-800 font-bold">Report submitted</p>
                        <p className="text-sm text-slate-500 mt-1">Thank you for helping keep the community safe.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <p className="text-sm text-slate-500">
                            Reporting <span className="font-bold text-slate-800">{reportedName}</span>
                        </p>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Reason</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                            >
                                {reasons.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Please describe what happened..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 min-h-[100px] resize-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !description.trim()}
                            className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ReportUserModal;
