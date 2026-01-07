
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

interface HeaderProps {
    title: string;
    back?: boolean;
    onBack?: () => void;
    action?: React.ReactNode;
    showHome?: boolean;
}

const Header = ({ title, back = false, onBack, action, showHome = false }: HeaderProps) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <header className="sticky top-0 z-40 flex items-center justify-between bg-surface-light/80 px-4 py-3 backdrop-blur-md dark:bg-surface-dark/80 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
                {back && (
                    <button onClick={handleBack} type="button" className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10">
                        <ChevronLeft size={24} />
                    </button>
                )}
                {!back && <div className="w-1" />}
                <h1 className="text-lg font-bold text-text-light dark:text-text-dark truncate">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
                {showHome && (
                    <Link to="/" className="rounded-full p-2 text-text-secondary-light hover:bg-black/5 dark:text-text-secondary-dark dark:hover:bg-white/10">
                        <Home size={20} />
                    </Link>
                )}
                {action}
            </div>
        </header>
    );
};

export default Header;
