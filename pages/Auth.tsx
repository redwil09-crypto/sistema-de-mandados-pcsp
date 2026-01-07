
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, Loader2, Shield, AlertCircle } from 'lucide-react';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
        } catch (error: any) {
            setError(error.message || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background-dark px-4 py-12 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -ml-48 -mb-48 animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-sm space-y-8 relative z-10">
                <div className="text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-dark border border-white/5 shadow-neon-blue mb-6">
                        <Shield size={40} className="text-primary drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]" />
                    </div>
                    <h2 className="text-2xl font-black tracking-[0.3em] text-white uppercase italic">
                        Polícia <span className="text-primary">Civil</span>
                    </h2>
                    <p className="mt-2 text-[10px] text-white/30 font-black uppercase tracking-[0.4em]">
                        Divisão de Inteligência e Capturas
                    </p>
                </div>

                <div className="bg-surface-dark/40 backdrop-blur-xl py-10 px-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
                    {/* Interior gradient shine */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-500/10 text-red-500 p-4 rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border border-red-500/20 animate-shake">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
                                Identificação Operacional
                            </label>
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-primary text-white/20">
                                    <Mail size={18} />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-4 pl-12 text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all text-sm font-bold"
                                    placeholder="policial@pcsp.sp.gov.br"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
                                Credencial de Acesso
                            </label>
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-primary text-white/20">
                                    <Lock size={18} />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-4 pl-12 text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all text-sm font-bold"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full overflow-hidden rounded-xl bg-primary py-4 text-xs font-black uppercase tracking-[0.2em] text-background-dark shadow-neon-blue transition-all active:scale-95 disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <div className="relative flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            <span>Validando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Autenticar</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-px bg-white/5"></div>
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">Segurança Nível 4</span>
                            <div className="flex-1 h-px bg-white/5"></div>
                        </div>
                        <p className="text-[10px] text-white/20 font-bold leading-relaxed">
                            ACESSO RESTRITO. <br /> MONITORAMENTO EM TEMPO REAL ATIVADO.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
