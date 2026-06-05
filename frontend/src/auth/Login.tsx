import { useState, useEffect } from 'react';
import { supabase } from '../database/database.ts';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSafeAuthErrorMessage, normalizeEmail, validateEmail } from './authValidation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate(redirectTo, { replace: true });
      }
    };
    checkUser();
  }, [navigate, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = normalizeEmail(email);
    const emailError = validateEmail(cleanEmail);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      if (data.user) {
        navigate(redirectTo, { replace: true });
      }
    } catch (err: any) {
      setError(getSafeAuthErrorMessage(err, 'login'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full font-body overflow-hidden">
      <section className="hidden lg:flex lg:w-1/2 bg-[#001f3f] relative flex-col justify-between p-16 overflow-hidden">
        <div className="relative z-20">
          <span className="font-headline text-3xl font-bold tracking-tighter text-white">Studify</span>
          <div className="mt-2 h-1 w-12 bg-[#b5785f]"></div>
          <div className="mt-6 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#b5785f]">auto_awesome</span>
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-start max-w-lg text-white mt-8 mb-4">
          <h2 className="text-5xl font-extrabold mb-6 leading-tight">Elevate Your Academic Potential.</h2>
          <p className="text-[#a0b0c0] font-light leading-relaxed">
            Join a prestigious global network of researchers and scholars utilizing the Atelier for advanced collaborative study.
          </p>
        </div>
        <div className="relative w-full aspect-square mt-4 mb-8">
          <img
            alt="Diverse university students collaborating"
            className="w-full h-full object-cover rounded-xl shadow-2xl opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700"
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop"
          />
          <div className="absolute -bottom-6 -right-6 bg-[#1a2d45]/90 backdrop-blur-md border border-white/5 p-4 pr-6 rounded-xl flex items-center gap-4 shadow-2xl">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-[#001f3f]"></div>
              <div className="w-10 h-10 rounded-full bg-white border-2 border-[#001f3f]"></div>
              <div className="w-10 h-10 rounded-full bg-white border-2 border-[#001f3f]"></div>
            </div>
            <div>
              <div className="text-white font-bold text-sm">12.4k+</div>
              <div className="text-white/50 text-[9px] tracking-[0.15em] uppercase font-bold mt-0.5">Scholars Active</div>
            </div>
          </div>
        </div>

        <footer className="relative z-20 text-white/30 text-[10px] tracking-widest uppercase">
          © 2024 Studify Scholarly Atelier
        </footer>
      </section>

      <section className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <header className="mb-12">
            <span className="block text-xs font-bold tracking-[0.2em] uppercase text-[#b5785f] mb-2">Access Portal</span>
            <h1 className="text-4xl font-bold text-[#000613] mb-3">Welcome Back</h1>
            <p className="text-slate-500">Enter your details to continue your learning journey.</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-2 group">
              <label className="block text-xs font-bold tracking-wider uppercase text-slate-900" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <input
                  className="w-full border-0 border-b-2 border-slate-200 px-4 py-3 focus:ring-0 focus:border-[#001f3f] transition-all outline-none"
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="block text-xs font-bold tracking-wider uppercase text-slate-900" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full border-0 border-b-2 border-slate-200 px-4 py-3 focus:ring-0 focus:border-[#001f3f] transition-all outline-none"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-900"
                >
                  <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#001f3f] text-white py-4 rounded-lg font-bold tracking-widest uppercase hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Login'}
              {!isLoading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
            </button>

            <div className="text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?
                <Link to="/register" className="font-bold text-[#001f3f] hover:underline ml-1">
                  Register
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
