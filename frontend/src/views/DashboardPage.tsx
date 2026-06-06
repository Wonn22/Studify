import { useEffect, useState } from 'react';
import { supabase } from '../database/database';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DashboardHeader from '../components/DashboardHeader';
import SessionCard from '../components/SessionCard';
import MatchPartnerCard from '../components/MatchPartnerCard';
import StatsCard from '../components/StatsCard';
import ActivityFeed from '../components/MessagesFeed';
import CalendarModal from '../components/CalendarModal';
import PartnerProfileModal from '../components/PartnerProfileModal';
import CreateSessionModal from '../components/CreateSessionModal';
import { getCurrentSessionUser } from '../security/dataAccess';
import { Profile, Session } from '../types';

const Dashboard = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalStudyTime: 0, consistencyPercent: 0 });
    const [loading, setLoading] = useState(true);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                const user = await getCurrentSessionUser();

                if (!user) {
                    navigate('/login');
                    return;
                }

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                setProfile(profileData as Profile);

                const { data: rawParticipantData } = await supabase
                    .from('session_participants')
                    .select(`
                        sessions (
                            id, title, subject, scheduled_at, duration_minutes
                        )
                    `)
                    .eq('profile_id', user.id);

                const participantData = rawParticipantData as { sessions: Session | null }[] | null;

                if (participantData) {
                    let sessionData = participantData
                        .map((p) => p.sessions)
                        .filter((s): s is Session => s !== null);

                    sessionData.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

                    // Calculate dynamic performance stats
                    const totalMinutes = sessionData.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
                    const totalStudyTime = Math.round(totalMinutes / 60);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const sevenDaysAgo = new Date(today);
                    sevenDaysAgo.setDate(today.getDate() - 6);

                    const activeDays = new Set<string>();
                    sessionData.forEach((s) => {
                        const sessionDate = new Date(s.scheduled_at);
                        sessionDate.setHours(0, 0, 0, 0);
                        if (sessionDate >= sevenDaysAgo && sessionDate <= today) {
                            activeDays.add(sessionDate.toISOString().split('T')[0]);
                        }
                    });
                    const consistencyPercent = Math.round((activeDays.size / 7) * 100);
                    setStats({ totalStudyTime, consistencyPercent });

                    const sessionIds = sessionData.map((s) => s.id);
                    let participantCounts: Record<string, number> = {};

                    if (sessionIds.length > 0) {
                        const { data: rawCountsData } = await supabase
                            .from('session_participants')
                            .select('session_id')
                            .in('session_id', sessionIds);

                        const countsData = rawCountsData as { session_id: string }[] | null;

                        if (countsData) {
                            countsData.forEach((row) => {
                                participantCounts[row.session_id] = (participantCounts[row.session_id] || 0) + 1;
                            });
                        }
                    }

                    const mappedSessions = sessionData.map((s) => {
                        const date = new Date(s.scheduled_at);
                        const endTime = new Date(date.getTime() + s.duration_minutes * 60000);
                        const timeStr = `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                        return {
                            id: s.id,
                            title: s.title,
                            time: timeStr,
                            tag: s.subject,
                            isGroup: true,
                            members: participantCounts[s.id] || 1,
                            scheduledAt: s.scheduled_at,
                            durationMinutes: s.duration_minutes
                        };
                    });
                    setSessions(mappedSessions);
                }

                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('*')
                    .neq('id', user.id)
                    .limit(3);

                if (profilesData) {
                    const mappedPartners = profilesData.map((p: Profile) => ({
                        id: p.id,
                        name: p.full_name || 'Anonymous User',
                        major: p.major || 'Undeclared',
                        tags: Array.isArray(p.interests) && p.interests.length > 0 ? p.interests : ['No skills listed'],
                        avatarUrl: p.avatar_url || null
                    }));
                    setPartners(mappedPartners);
                }

                const { data: rawMessageData } = await supabase
                    .from('messages')
                    .select('id, content, created_at, sender:profiles!messages_sender_id_fkey (full_name)')
                    .eq('receiver_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(3);

                const messageData = rawMessageData as { id: string; content: string; created_at: string; sender?: { full_name?: string } }[] | null;

                if (messageData) {
                    const mappedActivities = messageData.map((m) => {
                        const diff = Math.floor((new Date().getTime() - new Date(m.created_at).getTime()) / 60000);
                        const timeStr = diff < 60 ? `${diff} MIN AGO` : diff < 1440 ? `${Math.floor(diff / 60)} HOURS AGO` : 'YESTERDAY';
                        return {
                            id: m.id,
                            title: `Message from ${m.sender?.full_name || 'Unknown'}`,
                            content: m.content,
                            time: timeStr,
                            active: diff < 60
                        };
                    });
                    setActivities(mappedActivities);
                }

            } catch {
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate, refreshTick]);

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-white font-body">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-on-surface font-body">
            <Navbar />

            <main className="pt-28 pb-20 max-w-[1440px] mx-auto px-8">
                <DashboardHeader
                    name={profile?.full_name?.split(' ')[0] || 'Scholar'}
                    sessionCount={sessions.length}
                    onNewSession={() => setIsCreateSessionOpen(true)}
                    onBrowseSessions={() => navigate('/browse-sessions')}
                />

                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-8 space-y-12">
                        <div>
                            <div className="flex justify-between items-end mb-8">
                                <h2 className="text-2xl font-bold text-primary font-headline">Upcoming Sessions</h2>
                                <button
                                    onClick={() => setIsCalendarOpen(true)}
                                    className="text-sm font-semibold text-on-primary-container border-b border-on-primary-container/30 hover:border-on-primary-container transition-all"
                                >
                                    View Calendar
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {sessions.slice(0, 2).map(s => <SessionCard key={s.id} {...s} />)}
                            </div>
                        </div>

                        <div className="pt-4">
                            <div className="flex justify-between items-end mb-8">
                                <h2 className="text-2xl font-bold text-primary font-headline">Potential Match Partners</h2>
                                <span className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">Based on your interests</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {partners.map(p => (
                                    <MatchPartnerCard
                                        key={p.id}
                                        {...p}
                                        onClick={() => setSelectedPartnerId(p.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-4 space-y-8">
                        <StatsCard
                            totalStudyTime={stats.totalStudyTime}
                            consistencyPercent={stats.consistencyPercent}
                        />
                        <ActivityFeed activities={activities} onViewAll={() => navigate('/messages')} />
                    </div>
                </div>
            </main>

            {isCalendarOpen && <CalendarModal onClose={() => setIsCalendarOpen(false)} sessions={sessions} />}
            {isCreateSessionOpen && (
                <CreateSessionModal
                    onClose={() => setIsCreateSessionOpen(false)}
                    onSessionCreated={() => setRefreshTick(t => t + 1)}
                />
            )}
            {selectedPartnerId && (
                <PartnerProfileModal
                    partnerId={selectedPartnerId}
                    onClose={() => setSelectedPartnerId(null)}
                />
            )}
            <footer className="w-full flex flex-col items-center gap-6 px-8 py-12 bg-[#000613] text-white">
                <div className="flex flex-col md:flex-row justify-between w-full max-w-7xl items-center gap-8">
                    <div className="flex flex-col gap-2 items-center md:items-start">
                        <span className="text-white font-black text-xl tracking-tighter">Studify</span>
                        <p className="font-body text-[0.75rem] tracking-wide text-slate-400 max-w-xs text-center md:text-left">
                            © 2024 Studify Academic Atelier. All rights reserved.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-8">
                        <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Privacy Policy</a>
                        <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Terms of Service</a>
                        <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Research Ethics</a>
                        <a className="font-body text-[0.75rem] tracking-wide text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-white" href="#">Contact Support</a>
                    </div>
                </div>
                <div className="w-full max-w-7xl border-t border-white/5 pt-8 flex justify-center">
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer">
                            <span className="material-symbols-outlined text-[1rem]">language</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer">
                            <span className="material-symbols-outlined text-[1rem]">share</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;
