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
    const shouldBeListeningRef = useRef(false);
    const baselineTextRef = useRef(''); // The text that was there before this session started
    const currentValueRef = useRef(currentValue);
    const restartTimeoutRef = useRef<any>(null);

    // Keep currentValueRef in sync with the prop
    useEffect(() => {
        currentValueRef.current = currentValue;
    }, [currentValue]);

    const setupRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            shouldBeListeningRef.current = true;
            console.log("Voice: Recognition started");
        };

        recognition.onend = () => {
            console.log("Voice: Recognition ended. shouldBeListening:", shouldBeListeningRef.current);

            if (shouldBeListeningRef.current) {
                // Clear any existing timeout
                if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);

                // Keep trying to restart with a small delay
                restartTimeoutRef.current = setTimeout(() => {
                    if (shouldBeListeningRef.current) {
                        try {
                            // Update baseline to current text before restarting session
                            // to avoid losing what was already transcribed or duplicating it
                            baselineTextRef.current = currentValueRef.current;

                            recognition.start();
                        } catch (e) {
                            console.log("Voice: Restart failed, re-initializing instance");
                            const newRec = setupRecognition();
                            if (newRec) {
                                recognitionRef.current = newRec;
                                try { newRec.start(); } catch (err) { console.error("Voice: Critical start failure", err); }
                            }
                        }
                    }
                }, 300);
            } else {
                setIsListening(false);
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Voice: Speech recognition error", event.error);

            if (event.error === 'no-speech') return;

            if (event.error === 'not-allowed') {
                toast.error("Permissão de microfone negada.");
                shouldBeListeningRef.current = false;
                setIsListening(false);
                return;
            }

            if (event.error === 'network') {
                toast.error("Erro de conexão no reconhecimento de voz.");
            }
        };

        recognition.onresult = (event: any) => {
            // We use the results list which accumulates in continuous mode
            let sessionTranscript = '';
            for (let i = 0; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    sessionTranscript += event.results[i][0].transcript;
                }
            }

            if (sessionTranscript) {
                const baseline = baselineTextRef.current;
                const space = baseline && !baseline.endsWith(' ') ? ' ' : '';
                onTranscript(baseline + space + sessionTranscript.trim());
            }
        };

        return recognition;
    };

    useEffect(() => {
        const recognition = setupRecognition();
        if (recognition) {
            recognitionRef.current = recognition;
        }

        return () => {
            shouldBeListeningRef.current = false;
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
        };
    }, []);

    const toggleListening = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isSupported) {
            toast.error("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        if (isListening) {
            shouldBeListeningRef.current = false;
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            recognitionRef.current?.stop();
            toast.success("Ditado pausado.");
        } else {
            // Set baseline for the new session
            baselineTextRef.current = currentValue;

            // Re-setup on start to ensure clean state
            recognitionRef.current = setupRecognition();
            shouldBeListeningRef.current = true;

            try {
                recognitionRef.current?.start();
                toast.info("Microfone ligado. Pode ditar...");
            } catch (err) {
                console.error("Voice: Start error", err);
                toast.error("Erro ao iniciar microfone.");
            }
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
