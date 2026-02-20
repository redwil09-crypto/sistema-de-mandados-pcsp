import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    currentValue?: string;
    className?: string;
    disabled?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, currentValue = '', className = '', disabled = false }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef<any>(null);
    const startTextRef = useRef(''); // Text present when mic was clicked
    const lastFinalTranscriptRef = useRef(''); // To track what we've already sent to parent

    const initRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';

        recognition.onstart = () => {
            setIsListening(true);
            startTextRef.current = currentValue;
            lastFinalTranscriptRef.current = '';
        };

        recognition.onresult = (event: any) => {
            let sessionFinalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    sessionFinalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (sessionFinalTranscript || interimTranscript) {
                const base = startTextRef.current;
                const space = base && !base.endsWith(' ') ? ' ' : '';

                // We only send the FINAL bits to the parent to avoid jitter and cursor jumping
                // If you want real-time interim, it's riskier for repetitions.
                // Let's stick to appending finalized chunks for stability like "standard" mics.
                if (sessionFinalTranscript) {
                    // Update startText for the NEXT chunk so we don't repeat the current one
                    const newText = base + space + sessionFinalTranscript.trim();
                    onTranscript(newText);
                    startTextRef.current = newText;
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Voice Error:", event.error);
            if (event.error === 'not-allowed') {
                toast.error("Acesso ao microfone negado.");
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        return recognition;
    };

    useEffect(() => {
        const rec = initRecognition();
        if (rec) recognitionRef.current = rec;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const toggleListening = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isSupported) {
            toast.error("Navegador não suporta voz.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            // Re-init to clear any stale state
            const rec = initRecognition();
            recognitionRef.current = rec;
            startTextRef.current = currentValue;
            rec?.start();
        }
    };

    if (!isSupported) return null;

    return (
        <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            className={`p-2 rounded-full transition-all active:scale-95 flex items-center justify-center ${isListening
                ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/20 shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                } ${className}`}
            title={isListening ? "Parar de ouvir" : "Ditar com voz"}
        >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
    );
};

export default VoiceInput;
