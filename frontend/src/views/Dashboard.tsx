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

interface Profile {
    id: string;
    full_name: string;
    total_study_time_hours: number;
    consistency_percent: number;
    major?: string;
}

const Dashboard = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [weeklyStats, setWeeklyStats] = useState({ thisWeekHours: 0, lastWeekHours: 0, consistencyDays: 0 });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (!user || userError) {
                    navigate('/login');
                    return;
                }

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                setProfile(profileData as Profile);

                const { data: participantData } = await supabase
                    .from('session_participants')
                    .select(`
                        sessions (
                            id, title, subject, scheduled_at, duration_minutes
                        )
                    `)
                    .eq('profile_id', user.id);

                if (participantData) {
                    let sessionData = participantData
                        .map((p: any) => p.sessions)
                        .filter((s: any) => s !== null);

                    sessionData.sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

                    const now = new Date();
                    const startOfThisWeek = new Date(now);
                    startOfThisWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
                    startOfThisWeek.setHours(0, 0, 0, 0);
                    const startOfLastWeek = new Date(startOfThisWeek);
                    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

                    const thisWeekSessions = sessionData.filter((s: any) => {
                        const d = new Date(s.scheduled_at);
                        return d >= startOfThisWeek && d <= now;
                    });
                    const lastWeekSessions = sessionData.filter((s: any) => {
                        const d = new Date(s.scheduled_at);
                        return d >= startOfLastWeek && d < startOfThisWeek;
                    });

                    const thisWeekMinutes = thisWeekSessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
                    const lastWeekMinutes = lastWeekSessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

                    const sevenDaysAgo = new Date(now);
                    sevenDaysAgo.setDate(now.getDate() - 7);
                    const activeDays = new Set(
                        sessionData
                            .filter((s: any) => new Date(s.scheduled_at) >= sevenDaysAgo)
                            .map((s: any) => new Date(s.scheduled_at).toDateString())
                    );

                    setWeeklyStats({
                        thisWeekHours: Math.round((thisWeekMinutes / 60) * 10) / 10,
                        lastWeekHours: Math.round((lastWeekMinutes / 60) * 10) / 10,
                        consistencyDays: activeDays.size,
                    });

                    const mappedSessions = sessionData.slice(0, 2).map((s: any) => {
                        const date = new Date(s.scheduled_at);
                        const endTime = new Date(date.getTime() + s.duration_minutes * 60000);
                        const timeStr = `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                        return {
                            id: s.id,
                            title: s.title,
                            time: timeStr,
                            tag: s.subject,
                            isGroup: true,
                            members: Math.floor(Math.random() * 3) + 2
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
                    const mappedPartners = profilesData.map((p: any) => ({
                        id: p.id,
                        name: p.full_name || 'Anonymous User',
                        major: p.major || 'Undeclared',
                        tags: Array.isArray(p.interests) && p.interests.length > 0 ? p.interests : ['No skills listed'],
                        avatarUrl: p.avatar_url || null
                    }));
                    setPartners(mappedPartners);
                }

                const { data: messageData } = await supabase
                    .from('messages')
                    .select('id, content, created_at, sender:profiles!messages_sender_id_fkey (full_name)')
                    .eq('receiver_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (messageData) {
                    const mappedActivities = messageData.map((m: any) => {
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

            } catch (err) {
                console.error("Error loading dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-white font-body">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-on-surface font-body">
            <Navbar />

            <main className="pt-28 pb-20 max-w-[1440px] mx-auto px-8">
                <DashboardHeader name={profile?.full_name?.split(' ')[0] || 'Scholar'} sessionCount={sessions.length} />

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
                                {sessions.map(s => <SessionCard key={s.id} {...s} />)}
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
                            thisWeekHours={weeklyStats.thisWeekHours}
                            lastWeekHours={weeklyStats.lastWeekHours}
                            consistencyDays={weeklyStats.consistencyDays}
                        />
                        <ActivityFeed activities={activities} />
                    </div>
                </div>
            </main>

            {isCalendarOpen && <CalendarModal onClose={() => setIsCalendarOpen(false)} />}
            {selectedPartnerId && (
                <PartnerProfileModal
                    partnerId={selectedPartnerId}
                    onClose={() => setSelectedPartnerId(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;