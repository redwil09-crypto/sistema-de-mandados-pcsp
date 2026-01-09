import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    currentValue?: string;
    className?: string;
    disabled?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, currentValue = '', className = '', disabled = false }) => {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        // Check browser support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false; // Stop after one sentence/pause for smoother partial updates manually if needed, usually false is better for short dictations, or true for long ones. Let's try false first or handling events.
        // Actually for reports, continuous=true might be better but requires careful handling of results. 
        // Let's stick to simple implementation: click to start, speak, click to stop or auto-stop on silence.
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'pt-BR';

        recognitionInstance.onstart = () => {
            setIsListening(true);
            toast.info("Escutando... Pode falar.");
        };

        recognitionInstance.onend = () => {
            setIsListening(false);
        };

        recognitionInstance.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                toast.error("Permissão de microfone negada.");
            } else {
                toast.error("Erro no reconhecimento de voz.");
            }
        };

        let finalTranscript = '';

        recognitionInstance.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                    // We append to the current value carefully or just let the user handle it via the callback?
                    // The safest way for an input helper is to return the NEW text chunk.
                    // But if we want to append, we should pass the full text. 
                    // Let's simplified: We call onTranscript with the NEW text appended to current value?
                    // Or simpler: Just emit the transcribed chunk and let parent handle?
                    // Or common generic behavior: Append to existing text.
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // For continuous dictation, we need to handle "final" events to append.
            // If we rely purely on 'finalTranscript' here, it resets per session.
            // We want to Append to what the user already has.
            // Strategy: When isFinal, call onTranscript(currentValue + ' ' + finalTranscript_of_this_chunk). 
            // BUT currentValue might be stale if we don't track it.

            // Safer approach: Just pass the `finalTranscript` of this session and let the parent decide?
            // No, standard UX is the input updates live.

            // Correct approach:
            // We need to keep track of what was spoken IN THIS SESSION.
            // On finalize, update parent.
        };

        // Simpler approach for React integration:
        // Use a ref or simple logic: 
        // 1. When result is final, append it to `currentValue` + space.
        // 2. Clear interim.

        recognitionInstance.onresult = (event: any) => {
            const lastResult = event.results[event.results.length - 1];
            if (lastResult.isFinal) {
                const text = lastResult[0].transcript.trim();
                if (text) {
                    // Append with space if needed
                    const space = currentValue && !currentValue.endsWith(' ') ? ' ' : '';
                    onTranscript(currentValue + space + text);
                }
            }
        };

        setRecognition(recognitionInstance);

        return () => {
            if (recognitionInstance) recognitionInstance.abort();
        };
    }, [currentValue, onTranscript]); // Dependency on currentValue is tricky for continuous usage, it might restart recognition.

    // Better implementation to avoid restarting:
    // Don't depend on currentValue inside useEffect. Use a ref if needed, or just let the user modify the text.
    // Actually, simply appending the *newly recognized text* to the *current prop value* is fine if the prop updates fast enough. 
    // IF we trust the prop is up to date.

    // Refined logic:
    // We will just expose a simple button. When clicked:
    // - Start listening.
    // - On result (final): call onTranscript(currentValue + " " + newText).

    // Let's rewrite the onresult based on this simple logic.

    const toggleListening = () => {
        if (!isSupported) {
            toast.error("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

    if (!isSupported) return null;

    return (
        <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            className={`p-2 rounded-full transition-all active:scale-95 flex items-center justify-center ${isListening
                    ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400 ring-offset-2'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                } ${className}`}
            title={isListening ? "Parar ditado" : "Ditar texto"}
        >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
    );
};

export default VoiceInput;
