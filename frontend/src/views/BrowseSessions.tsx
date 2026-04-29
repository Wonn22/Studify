import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/database';
import DiscoveryRoomCard from '../components/DiscoveryRoomCard';

const BrowseSessions = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('sessions')
                    .select(`
            *,
            host:profiles!sessions_created_by_fkey (full_name, avatar_url),
            participants:session_participants (profile_id)
          `)
                    .order('scheduled_at', { ascending: true });

                if (error) throw error;
                setSessions(data || []);
            } catch (err) {
                console.error("Error fetching discovery rooms:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
    }, []);

    return (
        <div className="bg-surface text-on-surface font-body min-h-screen">
            <header className="bg-white border-b border-surface-container-highest sticky top-0 z-50 flex items-center w-full px-8 py-4">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-primary hover:text-on-primary-container transition-colors font-medium"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    <span className="font-headline font-bold">Back to Dashboard</span>
                </button>
            </header>

            <main className="max-w-[1200px] mx-auto px-8 py-12 md:py-20">
                <div className="border-b border-surface-container-highest pb-6 mb-8">
                    <span className="label-md uppercase tracking-[0.2em] text-on-primary-container font-headline mb-1 block text-xs">DISCOVERY</span>
                    <h2 className="text-3xl font-extrabold font-headline text-primary">Available Study Rooms</h2>
                    <p className="text-slate-500 font-medium">Join an active session to collaborate in real-time.</p>
                </div>

                {loading ? (
                    <div className="text-center py-20 animate-pulse text-slate-400">Scanning for active ateliers...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sessions.map((session) => (
                            <DiscoveryRoomCard
                                key={session.id}
                                session={session}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default BrowseSessions;