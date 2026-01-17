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
    const currentValueRef = useRef(currentValue);
    const shouldBeListeningRef = useRef(false);

    // Update ref when currentValue changes so recognition handler always has latest text
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

        recognition.onstart = () => {
            setIsListening(true);
            shouldBeListeningRef.current = true;
        };

        recognition.onend = () => {
            // AUTO-RESTART LOGIC: If it was supposed to be listening, restart it
            if (shouldBeListeningRef.current) {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Failed to auto-restart recognition", e);
                    setIsListening(false);
                }
            } else {
                setIsListening(false);
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') return; // Ignore no-speech errors to stay open

            console.error("Speech recognition error", event.error);
            if (event.error === 'not-allowed') {
                toast.error("Permissão de microfone negada.");
                shouldBeListeningRef.current = false;
                setIsListening(false);
            }
        };

        recognition.onresult = (event: any) => {
            let finalResult = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalResult += event.results[i][0].transcript;
                }
            }

            if (finalResult) {
                const currentText = currentValueRef.current;
                const space = currentText && !currentText.endsWith(' ') ? ' ' : '';
                onTranscript(currentText + space + finalResult.trim());
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
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onTranscript]);

    const toggleListening = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isSupported) {
            toast.error("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        if (isListening) {
            shouldBeListeningRef.current = false;
            recognitionRef.current?.stop();
            toast.success("Ditado finalizado.");
        } else {
            // Re-setup on start to ensure clean state
            recognitionRef.current = setupRecognition();
            shouldBeListeningRef.current = true;
            recognitionRef.current?.start();
            toast.info("Microfone aberto. Só desligará quando você apertar novamente.");
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
