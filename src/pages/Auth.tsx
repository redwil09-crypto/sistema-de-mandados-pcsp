
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, Loader2, Shield, AlertCircle, UserPlus, LogIn, User, Smartphone, Building2, BadgeCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [rg, setRg] = useState('');
    const [cargo, setCargo] = useState('');
    const [ddd, setDdd] = useState('11');
    const [phone, setPhone] = useState('');
    const [workplace, setWorkplace] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const isInstitutionalEmail = email.toLowerCase().endsWith('@policiacivil.sp.gov.br');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (isSignUp && !isInstitutionalEmail) {
            setError('Apenas e-mails @policiacivil.sp.gov.br são permitidos.');
            setLoading(false);
            return;
        }

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            rg: rg,
                            cargo: cargo,
                            phone: `(${ddd}) ${phone}`,
                            workplace: workplace,
                            role: 'agente',
                            authorized: false // Pending admin approval
                        }
                    }
                });
                if (error) throw error;
                setIsSuccess(true);
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // Explicit check for authorization
                if (data.user && data.user.user_metadata.authorized === false) {
                    // We'll handle this in App.tsx, but let's notify here if we can
                }
            }
        } catch (error: any) {
            setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorreta' : error.message);
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f0f9f4] px-4 py-12">
                <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-xl text-center space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-[#e6f6ec] rounded-full flex items-center justify-center">
                            <CheckCircle2 size={40} className="text-[#2eb872]" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-[#1a4d33]">Cadastro Realizado!</h2>
                        <p className="text-sm text-[#2eb872] font-medium">Seu cadastro foi recebido com sucesso.</p>
                    </div>

                    <div className="bg-[#f8fdfa] border border-[#e6f6ec] rounded-2xl p-6 text-left space-y-6">
                        <div className="flex gap-4">
                            <div className="mt-1">
                                <Mail size={18} className="text-[#2eb872]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#1a4d33] mb-1">Verifique seu e-mail</h3>
                                <p className="text-[11px] text-[#4a7a61] leading-relaxed">
                                    Um link de confirmação foi enviado para sua caixa de entrada. Verifique também a pasta de spam.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="mt-1 text-[#2eb872]">
                                <Shield size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#1a4d33] mb-1">Aprovação administrativa</h3>
                                <p className="text-[11px] text-[#4a7a61] leading-relaxed">
                                    Após confirmar seu e-mail, um administrador precisará liberar seu acesso ao sistema.
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-[#2eb872]/60 font-medium italic">
                        Você será notificado por e-mail quando seu acesso for aprovado.
                    </p>

                    <button
                        onClick={() => setIsSuccess(false)}
                        className="w-full py-4 bg-[#2eb872] hover:bg-[#259b5f] text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-[#2eb872]/20"
                    >
                        Voltar para o Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background-dark px-4 py-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -ml-48 -mb-48 animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className={`w-full ${isSignUp ? 'max-w-md' : 'max-w-sm'} space-y-6 relative z-10 transition-all duration-500`}>
                {!isSignUp && (
                    <div className="text-center">
                        <div className="mx-auto flex h-28 w-28 items-center justify-center mb-6">
                            <img
                                src="/novo_brasao_lock.png"
                                alt="Brasão PCSP"
                                className="h-full w-auto object-contain animate-float tactical-shield-clip drop-shadow-[0_0_8px_rgba(226,232,240,0.6)]"
                            />
                        </div>
                        <h2 className="text-xl font-black tracking-[0.3em] text-white uppercase italic">
                            Polícia <span className="text-primary">Civil</span>
                        </h2>
                        <p className="mt-1 text-[8px] text-white/30 font-black uppercase tracking-[0.4em]">
                            Divisão de Inteligência e Capturas
                        </p>
                    </div>
                )}

                <div className="bg-surface-dark/40 backdrop-blur-xl py-8 px-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => { setIsSignUp(false); setError(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isSignUp ? 'bg-primary text-background-dark shadow-neon-blue' : 'text-white/40 hover:text-white'}`}
                        >
                            <LogIn size={14} /> Entrar
                        </button>
                        <button
                            onClick={() => { setIsSignUp(true); setError(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isSignUp ? 'bg-[#2eb872] text-white shadow-lg shadow-[#2eb872]/20' : 'text-white/40 hover:text-white'}`}
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
                            <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[#2eb872] ml-1">Nome Completo</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-[#2eb872] text-white/20">
                                            <User size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-3 pl-11 text-white placeholder:text-white/10 focus:ring-1 focus:ring-[#2eb872]/20 focus:border-[#2eb872]/50 outline-none transition-all text-sm"
                                            placeholder="William Campos de Assis Castro"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[#2eb872] ml-1">RG</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-[#2eb872] text-white/20">
                                            <BadgeCheck size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={rg}
                                            onChange={(e) => setRg(e.target.value)}
                                            className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-3 pl-11 text-white placeholder:text-white/10 focus:ring-1 focus:ring-[#2eb872]/20 focus:border-[#2eb872]/50 outline-none transition-all text-sm"
                                            placeholder="34.555.149"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[#2eb872] ml-1">Cargo</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-[#2eb872] text-white/20">
                                            <Shield size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={cargo}
                                            onChange={(e) => setCargo(e.target.value)}
                                            className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-3 pl-11 text-white placeholder:text-white/10 focus:ring-1 focus:ring-[#2eb872]/20 focus:border-[#2eb872]/50 outline-none transition-all text-sm"
                                            placeholder="Agente policial"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-1 space-y-1">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[#2eb872] ml-1">DDD</label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            value={ddd}
                                            onChange={(e) => setDdd(e.target.value)}
                                            className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-3 text-center text-white outline-none focus:border-[#2eb872]/50 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[#2eb872] ml-1">Telefone Celular</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-[#2eb872] text-white/20">
                                                <Smartphone size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-3 pl-11 text-white placeholder:text-white/10 focus:ring-1 focus:ring-[#2eb872]/20 focus:border-[#2eb872]/50 outline-none transition-all text-sm"
                                                placeholder="9 8831-3988"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[#2eb872] ml-1">Local de Trabalho</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-[#2eb872] text-white/20">
                                            <Building2 size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={workplace}
                                            onChange={(e) => setWorkplace(e.target.value)}
                                            className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-3 pl-11 text-white placeholder:text-white/10 focus:ring-1 focus:ring-[#2eb872]/20 focus:border-[#2eb872]/50 outline-none transition-all text-sm"
                                            placeholder="Dig-jacarei"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[#2eb872] ml-1">Email Institucional</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-[#2eb872] text-white/20">
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`block w-full rounded-xl border ${isSignUp && email && !isInstitutionalEmail ? 'border-red-500/50' : 'border-white/5'} bg-background-dark/50 py-3 pl-11 text-white placeholder:text-white/10 focus:ring-1 focus:ring-[#2eb872]/20 focus:border-[#2eb872]/50 outline-none transition-all text-sm`}
                                    placeholder="liam.castro@policiacivil.sp.gov.br"
                                />
                            </div>
                            {isSignUp && email && isInstitutionalEmail && (
                                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e6f6ec]/10 border border-[#2eb872]/20 text-[#2eb872] animate-in slide-in-from-top-2 duration-300">
                                    <CheckCircle2 size={14} />
                                    <span className="text-[10px] font-bold">Domínio reconhecido: Polícia Civil — SP</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[#2eb872] ml-1">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-[#2eb872] text-white/20">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-xl border border-white/5 bg-background-dark/50 py-3 pl-11 text-white placeholder:text-white/10 focus:ring-1 focus:ring-[#2eb872]/20 focus:border-[#2eb872]/50 outline-none transition-all text-sm"
                                    placeholder="Senha forte"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`group relative w-full overflow-hidden rounded-xl ${isSignUp ? 'bg-[#2eb872]' : 'bg-primary'} py-4 text-[10px] font-black uppercase tracking-[0.2em] ${isSignUp ? 'text-white shadow-lg shadow-[#2eb872]/20' : 'text-background-dark shadow-neon-blue'} transition-all active:scale-95 disabled:opacity-50`}
                            >
                                <div className="relative flex items-center justify-center gap-2">
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <span>{isSignUp ? 'Cadastrar' : 'Acessar Sistema'}</span>
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
