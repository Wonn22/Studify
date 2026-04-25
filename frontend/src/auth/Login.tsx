import { useState } from 'react';
import { supabase } from '../database/database.ts';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      console.log('Logged in successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full font-body overflow-hidden">
      <section className="hidden lg:flex lg:w-1/2 bg-primary-container relative flex-col justify-between p-16 overflow-hidden">
        <div className="relative z-20">
          <span className="font-headline text-3xl font-bold tracking-tighter text-white">Studify</span>
          <div className="mt-2 h-1 w-12 bg-on-tertiary-container"></div>
        </div>

        <div className="relative z-10 flex flex-col items-start max-w-lg">
          <div className="mb-8 p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <span className="material-symbols-outlined text-on-tertiary-container text-4xl">auto_awesome</span>
          </div>
          <h2 className="font-headline text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Elevate Your Academic Potential.
          </h2>
          <p className="text-on-primary-container text-lg font-light leading-relaxed mb-8">
            Join a prestigious global network of researchers and scholars utilizing the Atelier for advanced collaborative study.
          </p>

          <div className="relative w-full aspect-square mt-4">
            <img
              alt="Diverse university students collaborating"
              className="w-full h-full object-cover rounded-xl shadow-2xl opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700"
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop"
            />
          </div>
        </div>

        <footer className="relative z-20">
          <p className="text-on-primary-container/60 text-xs font-label tracking-widest uppercase">© 2026 Studify Scholarly Atelier</p>
        </footer>
      </section>

      <section className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <header className="mb-12">
            <div className="lg:hidden mb-12">
              <span className="font-headline text-2xl font-bold tracking-tighter text-primary">Studify</span>
            </div>
            <span className="block text-xs font-label tracking-[0.2em] uppercase text-on-tertiary-container mb-2">Access Portal</span>
            <h1 className="font-headline text-4xl font-bold text-primary mb-3">Welcome Back</h1>
            <p className="text-on-surface-variant text-base">Enter your details to continue your learning journey.</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-2 group">
              <label className="block text-xs font-label font-bold tracking-wider uppercase text-primary" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <input
                  className="w-full bg-surface-container-low border-0 border-b-2 border-primary-container/20 px-4 py-3 text-primary focus:ring-0 focus:border-primary-container transition-all placeholder:text-outline/50 outline-none"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                />
                <div className="absolute right-3 top-3 text-outline group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined">mail</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 group">
              <div className="flex justify-between items-end">
                <label className="block text-xs font-label font-bold tracking-wider uppercase text-primary" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  className="w-full bg-surface-container-low border-0 border-b-2 border-primary-container/20 px-4 py-3 text-primary focus:ring-0 focus:border-primary-container transition-all placeholder:text-outline/50 outline-none"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-outline hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

            <div className="pt-4 space-y-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-container text-white py-4 px-6 rounded-lg font-headline font-bold text-sm tracking-widest uppercase hover:bg-primary-container/90 transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {isLoading ? 'Processing...' : 'Login'}
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-outline-variant/30"></div>
                <span className="flex-shrink mx-4 text-xs font-label uppercase text-outline">or</span>
                <div className="flex-grow border-t border-outline-variant/30"></div>
              </div>

              <div className="text-center">
                <p className="text-sm text-on-surface-variant">
                  Don't have an account?
                  <Link to="/register" className="font-bold text-primary-container hover:underline decoration-primary-container decoration-2 underline-offset-4 ml-1 cursor-pointer">
                    Register
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}