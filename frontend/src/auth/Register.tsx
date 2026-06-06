import { useState } from 'react';
import { supabase } from '../database/database';
import { Link, useNavigate } from 'react-router-dom';
import { getSafeAuthErrorMessage, normalizeEmail, validateEmail, validatePassword } from './authValidation';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMsg('');

        const cleanEmail = normalizeEmail(email);
        const emailError = validateEmail(cleanEmail);
        if (emailError) {
            setError(emailError);
            setIsLoading(false);
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email: cleanEmail,
                password,
            });

            if (error) throw error;

            if (data.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        full_name: 'Scholar',
                    }, { onConflict: 'id' });

                if (profileError) {
                    throw profileError;
                }
            }

            await supabase.auth.signOut();
            navigate('/login', { replace: true });
        } catch (err: any) {
            setError(getSafeAuthErrorMessage(err, 'register'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col md:flex-row font-body">
            <section className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 lg:p-24 bg-white relative">
                <div className="absolute top-12 left-12 flex items-center gap-2">
                    <span className="text-2xl font-headline font-bold text-[#001f3f] tracking-tight">Studify</span>
                </div>

                <div className="w-full max-w-md space-y-10 z-10">
                    <div className="space-y-2">
                        <span className="font-label text-xs tracking-widest uppercase text-slate-500">Join the Atelier</span>
                        <h1 className="font-headline text-5xl font-bold text-[#000613] tracking-tight leading-tight">Create your<br />account</h1>
                        <p className="text-slate-500 text-base leading-relaxed mt-2">Begin your journey in our specialized academic ecosystem.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2" htmlFor="email">Email</label>
                                <input
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 focus:border-[#001f3f] focus:ring-0 rounded-md transition-all outline-none text-slate-900"
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    maxLength={254}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="student@gmail.com"
                                    required
                                />
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2" htmlFor="password">Password</label>
                                <div className="relative">
                                    <input
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 focus:border-[#001f3f] focus:ring-0 rounded-md transition-all outline-none text-slate-900"
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        minLength={8}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPassword ? "visibility_off" : "visibility"}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2" htmlFor="confirm-password">Confirm Password</label>
                                <input
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 focus:border-[#001f3f] focus:ring-0 rounded-md transition-all outline-none text-slate-900"
                                    id="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100">{error}</div>}
                        {successMsg && <div className="bg-green-50 text-green-700 p-3 rounded text-sm border border-green-100">{successMsg}</div>}

                        <div className="flex items-start gap-3 px-1 mt-2">
                            <input className="mt-1 w-4 h-4 rounded border-slate-300 text-[#001f3f] focus:ring-[#001f3f] cursor-pointer" id="terms" type="checkbox" required />
                            <label className="text-[0.8rem] text-slate-500 leading-snug cursor-pointer" htmlFor="terms">
                                I agree to the <span className="text-[#001f3f] font-semibold hover:underline">Terms of Service</span> and <span className="text-[#001f3f] font-semibold hover:underline">Privacy Policy</span> of the Atelier.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-[#001f3f] text-white font-bold text-base rounded-md hover:bg-black transition-all shadow-lg shadow-[#001f3f]/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? 'Processing...' : 'Register'}
                        </button>
                    </form>

                    <div className="text-center mt-6">
                        <p className="text-slate-500 text-sm">
                            Already have an account?
                            <Link to="/login" className="text-[#001f3f] font-bold ml-1 hover:underline underline-offset-4">
                                Login
                            </Link>
                        </p>
                    </div>
                </div>

                <footer className="absolute bottom-8 text-center w-full">
                    <p className="text-[0.65rem] tracking-widest uppercase text-slate-400">© 2024 Studify Academic Atelier</p>
                </footer>
            </section>

            <section className="hidden md:flex md:w-1/2 bg-[#001529] flex-col items-center justify-center relative p-12 lg:p-20">
                <div className="w-full max-w-lg aspect-[4/3] rounded-xl overflow-hidden mb-12 shadow-2xl relative">
                    <img
                        alt="Group of diverse university students collaborating in a minimalist modern library"
                        className="w-full h-full object-cover grayscale brightness-90 hover:grayscale-0 transition-all duration-700"
                        src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop"
                    />
                </div>

                <div className="text-center max-w-md">
                    <h2 className="text-3xl font-bold text-white mb-4">Collaborate with Purpose</h2>
                    <p className="text-[#5b7391] text-base leading-relaxed">
                        Access a curated network of scholars and researchers dedicated to high-impact academic output.
                    </p>
                </div>
            </section>
        </main>
    );
}
