import { useState } from 'react';
import { supabase } from '../database/database';
import { Link } from 'react-router-dom';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMsg('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            setSuccessMsg('Registration successful! Check your email to verify your account.');
        } catch (err: any) {
            setError(err.message || 'Failed to register.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col md:flex-row font-body">
            <section className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 lg:p-24 bg-surface-container-lowest relative">
                <div className="absolute top-12 left-12 flex items-center gap-2">
                    <span className="text-2xl font-headline font-extrabold text-primary-container tracking-tight">Studify</span>
                </div>

                <div className="w-full max-w-md space-y-10 z-10">
                    <div className="space-y-2">
                        <span className="font-label text-[0.75rem] tracking-[0.05em] uppercase text-on-surface-variant">Join the Atelier</span>
                        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight">Create your account</h1>
                        <p className="text-on-surface-variant text-lg leading-relaxed">Begin your journey in our specialized academic ecosystem.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-4">
                            <div className="group">
                                <label className="block font-label text-[0.7rem] uppercase tracking-widest text-on-surface-variant mb-2 ml-1" htmlFor="email">Email Address</label>
                                <input
                                    className="w-full px-4 py-4 bg-surface-container-low border border-primary-container/20 focus:border-primary-container focus:ring-1 rounded-md transition-all duration-200 outline-none text-on-surface font-body"
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="student@university.edu"
                                    required
                                />
                            </div>

                            <div className="group">
                                <label className="block font-label text-[0.7rem] uppercase tracking-widest text-on-surface-variant mb-2 ml-1" htmlFor="password">Password</label>
                                <div className="relative">
                                    <input
                                        className="w-full px-4 py-4 bg-surface-container-low border border-primary-container/20 focus:border-primary-container focus:ring-1 rounded-md transition-all duration-200 outline-none text-on-surface font-body"
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPassword ? "visibility_off" : "visibility"}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="group">
                                <label className="block font-label text-[0.7rem] uppercase tracking-widest text-on-surface-variant mb-2 ml-1" htmlFor="confirm-password">Confirm Password</label>
                                <input
                                    className="w-full px-4 py-4 bg-surface-container-low border border-primary-container/20 focus:border-primary-container focus:ring-1 rounded-md transition-all duration-200 outline-none text-on-surface font-body"
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
                        {successMsg && <div className="text-green-600 text-sm font-medium">{successMsg}</div>}

                        <div className="flex items-start gap-3 px-1">
                            <input className="mt-1 rounded-sm border-primary-container/20 text-primary-container focus:ring-0 cursor-pointer" id="terms" type="checkbox" required />
                            <label className="text-[0.8rem] text-on-surface-variant leading-snug cursor-pointer" htmlFor="terms">
                                I agree to the <span className="text-primary-container font-semibold hover:underline">Terms of Service</span> and <span className="text-primary-container font-semibold hover:underline">Privacy Policy</span> of the Atelier.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-primary-container text-white font-headline font-bold text-lg rounded-md hover:bg-primary transition-all duration-300 shadow-xl shadow-primary/10 active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                        >
                            {isLoading ? 'Processing...' : 'Register'}
                        </button>
                    </form>

                    <div className="text-center">
                        <p className="text-on-surface-variant text-sm">
                            Already have an account?
                            <Link to="/login" className="text-primary-container font-bold ml-1 hover:underline underline-offset-4 cursor-pointer">
                                Login
                            </Link>
                        </p>
                    </div>
                </div>

                <footer className="absolute bottom-6 text-center w-full">
                    <p className="font-label text-[0.65rem] tracking-[0.1em] uppercase text-on-surface-variant/50">© 2026 Studify Academic Atelier</p>
                </footer>
            </section>

            <section className="hidden md:flex md:w-1/2 bg-primary-container flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
                </div>

                <div className="relative z-10 w-full px-12 lg:px-20 flex flex-col items-center text-center">
                    <div className="w-full max-w-xl aspect-[4/3] rounded-xl overflow-hidden mb-12 shadow-2xl shadow-primary/40 group relative">
                        <img
                            alt="Group of diverse university students collaborating in a minimalist modern library"
                            className="w-full h-full object-cover grayscale brightness-90 group-hover:grayscale-0 transition-all duration-700"
                            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop"
                        />

                        <div className="absolute bottom-6 left-6 right-6 bg-white/80 backdrop-blur-md p-6 rounded-lg text-left border border-white/10">
                            <div className="flex gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className="material-symbols-outlined text-primary-container text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                ))}
                            </div>
                            <p className="font-body italic text-primary text-sm leading-relaxed mb-4">"Studify transformed our research group's workflow. The atmosphere of focus and collaboration is unmatched in any other tool."</p>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-[10px] text-white font-bold">JD</div>
                                <div>
                                    <p className="text-xs font-bold text-primary">Julianna Davies</p>
                                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">PhD Candidate, Stanford</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 max-w-md">
                        <h2 className="font-headline text-3xl font-bold text-white tracking-tight">Collaborate with Purpose</h2>
                        <p className="text-on-primary-container text-lg opacity-90">Access a curated network of scholars and researchers dedicated to high-impact academic output.</p>
                    </div>
                </div>

                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border-[0.5px] border-white/5 rounded-full scale-150"></div>
            </section>
        </main>
    );
}