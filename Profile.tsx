import React from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, LogOut, ChevronLeft } from 'lucide-react';

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
                                <p className="text-sm font-bold text-text-light dark:text-text-dark">Administrador</p>
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

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={handleSignOut}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-sm transition-colors disabled:opacity-70"
                    >
                        <LogOut size={20} />
                        {loading ? 'Saindo...' : 'Sair do Sistema'}
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
