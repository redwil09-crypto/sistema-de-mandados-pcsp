
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, Loader2, Shield, AlertCircle, UserPlus, LogIn, User } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: 'agente'
                        }
                    }
                });
                if (error) throw error;
                toast.success("Cadastro realizado! Verifique seu e-mail ou faça login.");
                setIsSignUp(false);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorreta' : error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background-dark px-4 py-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -ml-48 -mb-48 animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-sm space-y-6 relative z-10">
                <div className="text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center mb-4">
                        <img
                            src="/novo_brasao_tatical.png"
                            alt="Brasão PCSP"
                            className="h-full w-auto object-contain drop-shadow-[0_0_15px_rgba(255,215,0,0.3)] animate-float tactical-shield-clip"
                        />
                    </div>
                    <h2 className="text-xl font-black tracking-[0.3em] text-white uppercase italic">
                        Polícia <span className="text-primary">Civil</span>
                    </h2>
                    <p className="mt-1 text-[8px] text-white/30 font-black uppercase tracking-[0.4em]">
                        Divisão de Inteligência e Capturas
                    </p>
                </div>

                <div className="bg-surface-dark/40 backdrop-blur-xl py-8 px-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => { setIsSignUp(false); setError(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isSignUp ? 'bg-primary text-background-dark shadow-neon-blue' : 'text-white/40 hover:text-white'}`}
                        >
                            <LogIn size={14} /> Entrar
                        </button>
                        <button
                            onClick={() => { setIsSignUp(true); setError(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isSignUp ? 'bg-primary text-background-dark shadow-neon-blue' : 'text-white/40 hover:text-white'}`}
                        >
                            <UserPlus size={14} /> Cadastrar
                        </button>
                    </div>

                    <form className="space-y-4" onSubmit={handleAuth}>
                        {error && (
                            <div className="bg-red-500/10 text-red-500 p-3 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest border border-red-500/20 animate-shake">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {isSignUp && (
                            <div className="space-y-1">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Nome Completo</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-primary text-white/20">
                                        <User size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-3 pl-11 text-white placeholder:text-white/10 focus:ring-1 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all text-sm"
                                        placeholder="Seu nome"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Email Institucional</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-primary text-white/20">
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-3 pl-11 text-white placeholder:text-white/10 focus:ring-1 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all text-sm"
                                    placeholder="policial@pcsp.sp.gov.br"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-primary text-white/20">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-3 pl-11 text-white placeholder:text-white/10 focus:ring-1 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full overflow-hidden rounded-xl bg-primary py-3 text-[10px] font-black uppercase tracking-[0.2em] text-background-dark shadow-neon-blue transition-all active:scale-95 disabled:opacity-50"
                            >
                                <div className="relative flex items-center justify-center gap-2">
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <span>{isSignUp ? 'Concluir Cadastro' : 'Acessar Sistema'}</span>
                                    )}
                                </div>
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-white/5"></div>
                            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/20">Criptografia Ponta-a-Ponta</span>
                            <div className="flex-1 h-px bg-white/5"></div>
                        </div>
                        <p className="text-[9px] text-white/20 font-bold leading-relaxed">
                            USO EXCLUSIVO DA POLÍCIA CIVIL. <br /> TRÁFEGO MONITORADO.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
