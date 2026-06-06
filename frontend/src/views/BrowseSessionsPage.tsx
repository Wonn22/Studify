import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/database';
import DiscoveryRoomCard from '../components/DiscoveryRoomCard';
import { getCurrentSessionUser } from '../security/dataAccess';

export interface SessionJoinRequest {
    id: string;
    sessionId: string;
    requesterId: string;
    requesterName: string;
    createdAt: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
}

const BrowseSessions = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [sessionRequests, setSessionRequests] = useState<Record<string, SessionJoinRequest[]>>({});
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true);
            const user = await getCurrentSessionUser();

            if (!user) {
                navigate('/login');
                return;
            }

            setCurrentUserId(user.id);

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
            console.log('[BrowseSessions] fetched sessions:', data?.length || 0, 'for user:', user.id);

            const { data: requestRows, error: requestError } = await supabase
                .from('session_join_requests')
                .select(`
                    id,
                    session_id,
                    requester_id,
                    status,
                    created_at,
                    requester:profiles!session_join_requests_requester_id_fkey (full_name)
                `)
                .eq('status', 'Pending')
                .or(`requester_id.eq.${user.id},host_id.eq.${user.id}`);

            if (requestError) {
                console.error('[BrowseSessions] request fetch error:', requestError.message, requestError.details);
                throw requestError;
            }
            console.log('[BrowseSessions] fetched request rows:', requestRows?.length || 0);

            const requestsBySession: Record<string, SessionJoinRequest[]> = {};
            (requestRows || []).forEach((row: any) => {
                const request = {
                    id: row.id,
                    sessionId: row.session_id,
                    requesterId: row.requester_id,
                    requesterName: row.requester?.full_name || 'Scholar',
                    createdAt: row.created_at,
                    status: row.status,
                };

                requestsBySession[row.session_id] = [
                    ...(requestsBySession[row.session_id] || []),
                    request,
                ];
            });

            setSessionRequests(requestsBySession);
        } catch (err: any) {
            console.error('[BrowseSessions] fetchSessions error:', err?.message || err);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleRequestJoin = async (session: any) => {
        if (!currentUserId) {
            navigate('/login');
            return;
        }

        const participantCount = session.participants?.length || 0;
        if (participantCount >= session.max_members) {
            alert('This session is already full.');
            return;
        }

        setBusyAction(`request:${session.id}`);
        console.log('[BrowseSessions] handleRequestJoin — sessionId:', session.id, 'requesterId:', currentUserId);
        try {
            const { error } = await supabase
                .from('session_join_requests')
                .upsert({
                    session_id: session.id,
                    requester_id: currentUserId,
                    host_id: session.created_by,
                    status: 'Pending',
                }, { onConflict: 'session_id,requester_id' });

            if (error) {
                console.error('[BrowseSessions] handleRequestJoin insert error:', error.message, error.details);
                throw error;
            }
            console.log('[BrowseSessions] handleRequestJoin — success');
            await fetchSessions();
        } catch (err: any) {
            console.error('[BrowseSessions] handleRequestJoin catch:', err?.message || err);
            alert(err.message || 'Failed to request this session.');
        } finally {
            setBusyAction(null);
        }
    };

    const handleAcceptRequest = async (session: any, request: SessionJoinRequest) => {
        if (!currentUserId || session.created_by !== currentUserId) return;

        const participantCount = session.participants?.length || 0;
        if (participantCount >= session.max_members) {
            alert('This session is already full.');
            return;
        }

        setBusyAction(`accept:${request.id}`);
        console.log('[BrowseSessions] handleAcceptRequest — requestId:', request.id, 'sessionId:', session.id, 'requesterId:', request.requesterId);
        try {
            const { error: participantError } = await supabase
                .from('session_participants')
                .upsert({
                    session_id: session.id,
                    profile_id: request.requesterId,
                }, { onConflict: 'session_id,profile_id' });

            if (participantError) {
                console.error('[BrowseSessions] handleAcceptRequest participant upsert error:', participantError.message);
                throw participantError;
            }
            console.log('[BrowseSessions] handleAcceptRequest — participant upsert success');

            const { error: updateError } = await supabase
                .from('session_join_requests')
                .update({ status: 'Accepted', decided_at: new Date().toISOString() })
                .eq('id', request.id)
                .eq('host_id', currentUserId);

            if (updateError) {
                console.error('[BrowseSessions] handleAcceptRequest status update error:', updateError.message);
                throw updateError;
            }
            console.log('[BrowseSessions] handleAcceptRequest — status update success');
            await fetchSessions();
        } catch (err: any) {
            console.error('[BrowseSessions] handleAcceptRequest catch:', err?.message || err);
            alert(err.message || 'Failed to accept request.');
        } finally {
            setBusyAction(null);
        }
    };

    const handleRejectRequest = async (request: SessionJoinRequest) => {
        if (!currentUserId) return;

        setBusyAction(`reject:${request.id}`);
        console.log('[BrowseSessions] handleRejectRequest — requestId:', request.id, 'hostId:', currentUserId);
        try {
            const { error } = await supabase
                .from('session_join_requests')
                .update({ status: 'Rejected', decided_at: new Date().toISOString() })
                .eq('id', request.id)
                .eq('host_id', currentUserId);

            if (error) {
                console.error('[BrowseSessions] handleRejectRequest update error:', error.message);
                throw error;
            }
            console.log('[BrowseSessions] handleRejectRequest — success');
            await fetchSessions();
        } catch (err: any) {
            console.error('[BrowseSessions] handleRejectRequest catch:', err?.message || err);
            alert(err.message || 'Failed to reject request.');
        } finally {
            setBusyAction(null);
        }
    };

    const getRequestStatus = (session: any) => {
        if (!currentUserId) return 'guest';
        if (session.created_by === currentUserId) return 'host';
        if ((session.participants || []).some((participant: any) => participant.profile_id === currentUserId)) {
            return 'joined';
        }
        if ((sessionRequests[session.id] || []).some(request => request.requesterId === currentUserId)) {
            return 'pending';
        }
        return 'none';
    };

    const visibleSessions = sessions.filter(session => {
        const participantCount = session.participants?.length || 0;
        return participantCount < session.max_members || getRequestStatus(session) !== 'none';
    });

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
                    <p className="text-slate-500 font-medium">Request a seat, then wait for the host to approve before joining.</p>
                </div>

                {loading ? (
                    <div className="text-center py-20 animate-pulse text-slate-400">Scanning for active ateliers...</div>
                ) : visibleSessions.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">No available study rooms right now.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {visibleSessions.map((session) => (
                            <DiscoveryRoomCard
                                key={session.id}
                                session={session}
                                requestStatus={getRequestStatus(session)}
                                pendingRequests={sessionRequests[session.id] || []}
                                busyAction={busyAction}
                                onRequestJoin={handleRequestJoin}
                                onAcceptRequest={handleAcceptRequest}
                                onRejectRequest={handleRejectRequest}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default BrowseSessions;
