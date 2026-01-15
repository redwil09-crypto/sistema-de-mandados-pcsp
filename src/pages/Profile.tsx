
import React from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, LogOut, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });
    }, []);

    const handleSignOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
    };

    return (
        <div className="min-h-screen pb-24 bg-background-light dark:bg-background-dark">
            <header className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-3 dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} type="button" className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-text-light dark:text-text-dark">Perfil</h1>
                </div>
            </header>

            <div className="p-4 space-y-6">
                {/* User Info Card */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 shadow-sm border border-border-light dark:border-border-dark">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-4 border-primary/20">
                            <User size={48} className="text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-1">
                            {user?.user_metadata?.full_name || 'Policial'}
                        </h2>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-2">
                            <Mail size={14} />
                            {user?.email || 'Carregando...'}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background-light dark:bg-background-dark">
                            <Shield size={20} className="text-primary" />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase">Função</p>
                                <p className="text-sm font-bold text-text-light dark:text-text-dark">
                                    {user?.user_metadata?.role === 'admin' ? 'Administrador' : 'Agente'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background-light dark:bg-background-dark">
                            <User size={20} className="text-primary" />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase">ID do Usuário</p>
                                <p className="text-xs font-mono text-text-light dark:text-text-dark">{user?.id || '...'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Settings Card */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 shadow-sm border border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Shield size={18} className="text-blue-500" />
                        </div>
                        <h3 className="font-bold text-text-light dark:text-text-dark">Inteligência Artificial (Google Gemini)</h3>
                    </div>

                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">
                        Configure sua chave API do Google AI Pro para liberar as análises profundas no Protocolo Raio-X.
                    </p>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1 block">
                                Chave API Gemini {localStorage.getItem('gemini_api_key') ? '(Usando Pessoal)' : '(Usando Equipe)'}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    placeholder="Cole aqui sua chave (começa com AIza...)"
                                    className="flex-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded px-3 py-2 text-sm text-text-light dark:text-text-dark focus:border-primary outline-none transition-colors"
                                    value={localStorage.getItem('gemini_api_key') || ''}
                                    onChange={(e) => {
                                        localStorage.setItem('gemini_api_key', e.target.value);
                                        toast.success("Chave salva localmente!");
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('gemini_api_key');
                                        window.location.reload();
                                    }}
                                    className="text-[10px] text-red-500 font-bold hover:underline"
                                >
                                    LIMPAR
                                </button>
                            </div>
                        </div>

                        {user?.user_metadata?.role === 'admin' && (
                            <button
                                onClick={async () => {
                                    const key = localStorage.getItem('gemini_api_key');
                                    if (!key) {
                                        toast.error("Insira uma chave primeiro para salvar para todos.");
                                        return;
                                    }
                                    const { error } = await supabase
                                        .from('system_settings')
                                        .upsert({ key: 'gemini_api_key', value: key });

                                    if (error) toast.error("Erro ao salvar chave global.");
                                    else toast.success("Chave salva para todos os usuários da equipe!");
                                }}
                                className="w-full py-2 bg-blue-600/10 text-blue-600 rounded text-[10px] font-bold border border-blue-600/20 hover:bg-blue-600/20 transition-all"
                            >
                                SALVAR PARA TODA A EQUIPE (ADMIN)
                            </button>
                        )}

                        <div className="flex items-center gap-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-[10px] text-blue-700 dark:text-blue-300">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            {localStorage.getItem('gemini_api_key') ? 'IA Ativa com Chave Pessoal' : 'IA Ativa com Chave da Equipe'}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={handleSignOut}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-sm transition-colors disabled:opacity-70"
                    >
                        <LogOut size={20} />
                        {loading ? 'Sair do Sistema...' : 'Sair do Sistema'}
                    </button>

                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-900/30">
                        <p className="text-xs text-orange-800 dark:text-orange-300 text-center">
                            <strong>Atenção:</strong> Ao sair, você precisará fazer login novamente para acessar o sistema.
                        </p>
                    </div>
                </div>

                {/* System Info */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
                    <h3 className="font-bold text-sm text-text-light dark:text-text-dark mb-3">Informações do Sistema</h3>
                    <div className="space-y-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        <div className="flex justify-between">
                            <span>Versão:</span>
                            <span className="font-mono">1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Última atualização:</span>
                            <span>30/12/2024</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Organização:</span>
                            <span className="font-bold">PCSP</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
