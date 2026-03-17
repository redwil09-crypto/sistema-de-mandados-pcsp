
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] text-white p-6">
          <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-widest text-red-500">Erro de Sistema</h2>
              <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                Ocorreu uma falha inesperada na renderização. Isso pode ser causado por uma oscilação na rede ou incompatibilidade temporária.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[10px] font-mono text-zinc-500 break-all text-left overflow-auto max-h-24">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
            >
              <RefreshCw size={18} />
              Recarregar Sistema
            </button>
            
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">
              Uso Restrito - PCSP
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
