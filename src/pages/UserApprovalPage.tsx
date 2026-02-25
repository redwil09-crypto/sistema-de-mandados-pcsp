
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, UserCheck, UserX, Search, Mail, Building2, UserCircle, BadgeCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/Header';

export default function UserApprovalPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === '42P01') {
                    // Table doesn't exist - this is handled in the UI
                    setUsers([]);
                } else {
                    throw error;
                }
            } else {
                setUsers(data || []);
            }
        } catch (err: any) {
            console.error('Error fetching users:', err);
            toast.error('Erro de conexão com a tabela de perfis.');
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (userId: string, authorize: boolean) => {
        try {
            // 1. Update the profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ authorized: authorize })
                .eq('id', userId);

            if (profileError) throw profileError;

            // 2. Note: Updating auth.user_metadata requires admin privileges usually
            // but if we have a trigger in Supabase (best practice), it's handled.
            // Alternatively, we'll try to use a service role if available (not in client).

            toast.success(authorize ? 'Usuário autorizado!' : 'Autorização removida.');
            fetchUsers();
        } catch (err: any) {
            toast.error('Erro ao atualizar status: ' + err.message);
        }
    };

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
            <Header title="Gestão de Acesso" back showHome />

            <div className="p-4 space-y-4 max-w-4xl mx-auto">
                {/* Search and Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/20 group-focus-within:text-primary transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar policial por nome ou e-mail..."
                            className="block w-full rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark py-3 pl-11 text-sm outline-none focus:ring-1 focus:ring-primary/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sincronizando base de dados...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {filteredUsers.length === 0 ? (
                            <div className="p-8 bg-surface-light dark:bg-surface-dark rounded-2xl border border-dashed border-amber-500/30 space-y-6">
                                <div className="flex items-center gap-4 text-amber-500">
                                    <Shield size={32} />
                                    <h2 className="text-lg font-bold uppercase tracking-tight">Configuração Necessária</h2>
                                </div>
                                <p className="text-sm text-text-secondary-light dark:text-white/60 leading-relaxed font-medium">
                                    A tabela de perfis não foi detectada. Para gerenciar usuários, execute o comando abaixo no <span className="text-white font-bold">SQL Editor</span> do seu painel Supabase:
                                </p>
                                <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-primary/80 overflow-x-auto whitespace-pre">
                                    {`-- 1. Garantir que a tabela e colunas existam
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  rg text,
  cargo text,
  phone text,
  workplace text,
  role text default 'agente',
  authorized boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Corrigir permissões (RLS)
alter table profiles enable row level security;

-- Deletar política antiga se existir e criar nova
drop policy if exists "Permitir leitura para todos" on profiles;
drop policy if exists "Admins podem ver tudo" on profiles;
create policy "Admins podem ver tudo" on profiles for all using (true);

-- 3. Trigger para novos cadastros (Sincronização)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, rg, cargo, phone, workplace, role, authorized)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'rg',
    new.raw_user_meta_data->>'cargo',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'workplace',
    new.raw_user_meta_data->>'role',
    coalesce((new.raw_user_meta_data->>'authorized')::boolean, false)
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name;
  return new;
end;
$$ language plpgsql security definer;

-- Recriar trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`}
                                </div>
                                <p className="text-[10px] text-amber-500/50 italic font-bold">
                                    * Após executar, recarregue esta página.
                                </p>
                            </div>
                        ) : (
                            filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className={`bg-surface-light dark:bg-surface-dark rounded-2xl p-5 border transition-all ${user.authorized ? 'border-[#2eb872]/20' : 'border-red-500/20'}`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${user.authorized ? 'bg-[#2eb872]/10 border-[#2eb872]/20 text-[#2eb872]' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                                <UserCircle size={24} />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-text-light dark:text-white uppercase text-sm tracking-tight">{user.full_name}</h3>
                                                    {user.authorized && <BadgeCheck size={16} className="text-[#2eb872]" />}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] items-center text-text-secondary-light dark:text-white/40 font-bold uppercase tracking-wider">
                                                    <span className="flex items-center gap-1"><Mail size={12} /> {user.email}</span>
                                                    <span className="flex items-center gap-1"><Shield size={12} /> {user.cargo}</span>
                                                    <span className="flex items-center gap-1"><Building2 size={12} /> {user.workplace}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {user.authorized ? (
                                                <button
                                                    onClick={() => handleApproval(user.id, false)}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all active:scale-95"
                                                >
                                                    <UserX size={14} /> Revogar Acesso
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleApproval(user.id, true)}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#2eb872] text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#2eb872]/20 hover:bg-[#259b5f] transition-all active:scale-95"
                                                >
                                                    <UserCheck size={14} /> Autorizar Acesso
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
