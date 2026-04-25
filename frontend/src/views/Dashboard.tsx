import React, { useEffect, useState } from 'react';
import { supabase } from '../database/database';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [profile, setProfile] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (!user || userError) {
                    navigate('/login');
                    return;
                }

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                const { data: sessionData } = await supabase
                    .from('sessions')
                    .select('*')
                    .order('scheduled_at', { ascending: true })
                    .limit(2);

                const { data: activityData } = await supabase
                    .from('messages')
                    .select(`
                        id,
                        content,
                        sender_id,
                        sender:profiles!messages_sender_id_fkey (
                            full_name
                        )
                    `)
                    .eq('receiver_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(3);

                setProfile(profileData);
                setSessions(sessionData || []);
                setRecentActivity(activityData || []);
            } catch (err) {
                console.error("Error loading dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-surface font-manrope">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-on-surface-variant">Synchronizing atelier data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-surface p-8 font-inter">
            <header className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
                <div>
                    <span className="text-[10px] tracking-[0.2em] font-bold text-outline uppercase block mb-2">
                        Academic Year 2024
                    </span>
                    <h1 className="text-5xl font-extrabold text-primary font-manrope tracking-tight">
                        Welcome back, {profile?.full_name || 'Scholar'}.
                    </h1>
                    <p className="text-on-surface-variant mt-4 text-lg font-light leading-relaxed">
                        You have {sessions.length} study sessions scheduled for today.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleLogout}
                        className="px-6 py-4 rounded-xl font-bold text-on-surface-variant hover:text-error transition-colors"
                    >
                        Sign Out
                    </button>
                    <button className="bg-primary-container text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-primary transition-all active:scale-95 shadow-xl shadow-primary-container/20">
                        <span className="material-symbols-outlined">add</span>
                        Start New Session
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-12">
                    <section>
                        <h2 className="text-2xl font-bold text-primary mb-6 font-manrope">Upcoming Sessions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {sessions.length > 0 ? sessions.map((session) => (
                                <div key={session.id} className="bg-white p-8 rounded-2xl border border-outline-variant/30 hover:shadow-2xl transition-all group">
                                    <span className="bg-secondary-fixed text-on-secondary-fixed text-[10px] font-black px-3 py-1 rounded-full uppercase">
                                        {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <h3 className="text-xl font-bold mt-4 text-primary leading-tight">{session.title}</h3>
                                    <div className="mt-6 flex items-center gap-4 text-sm text-on-surface-variant">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-base">groups</span> {session.subject}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-base">timer</span> {session.duration_minutes}m
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-2 p-12 text-center border-2 border-dashed border-outline-variant/30 rounded-2xl">
                                    <p className="text-on-surface-variant italic">No sessions scheduled. Time to find a match?</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <div className="bg-primary text-white p-10 rounded-3xl relative overflow-hidden shadow-2xl shadow-primary/20">
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-8">Weekly Performance</h3>
                            <div className="space-y-10">
                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-4xl font-black font-manrope">{profile?.total_study_time_hours ?? 0}h</span>
                                        <span className="text-xs font-bold text-secondary-fixed">+4.2h vs last week</span>
                                    </div>
                                    <p className="text-[10px] text-white/50 font-medium">Total Study Time</p>
                                </div>
                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-4xl font-black font-manrope">{profile?.consistency_percent ?? 0}%</span>
                                        <span className="text-xs font-bold text-secondary-fixed">Top 5% student</span>
                                    </div>
                                    <p className="text-[10px] text-white/50 font-medium">Session Consistency</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/20">
                        <h3 className="text-lg font-bold text-primary mb-6 font-manrope">Recent Activity</h3>
                        <div className="space-y-6">
                            {recentActivity.length > 0 ? recentActivity.map((msg) => (
                                <div key={msg.id} className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"></div>
                                    <div>
                                        <p className="text-sm font-bold text-primary">Message from {msg.sender?.full_name || 'Unknown'}</p>
                                        <p className="text-xs text-on-surface-variant line-clamp-2 italic mt-1">"{msg.content}"</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-on-surface-variant italic">No recent messages.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;