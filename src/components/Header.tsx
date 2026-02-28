
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
        <header className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-border-light dark:border-white/5 shadow-glass">
            <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
                <div className="flex items-center gap-3 overflow-hidden">
                    {back && (
                        <button
                            onClick={handleBack}
                            type="button"
                            className="flex items-center justify-center p-2 rounded-lg text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}

                    <div className="flex flex-col">
                        <h1 className="font-display font-bold text-lg leading-none text-text-light dark:text-text-dark uppercase tracking-tight">
                            {title}
                        </h1>
                        {/* Optional Subtitle or decorative line could go here */}
                        <div className="h-0.5 w-8 bg-gradient-to-r from-primary to-transparent mt-1 opacity-50"></div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {showHome && (
                        <Link
                            to="/"
                            className="p-2 rounded-lg text-text-secondary-light dark:text-text-secondary-dark hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <Home size={18} />
                        </Link>
                    )}
                    {action}
                </div>
            </div>
        </header>
    );
};

export default Header;
