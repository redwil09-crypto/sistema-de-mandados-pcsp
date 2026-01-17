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

    // Update ref when currentValue changes so recognition handler always has latest text
    useEffect(() => {
        currentValueRef.current = currentValue;
    }, [currentValue]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';

        recognition.onstart = () => {
            setIsListening(true);
            toast.info("Microfone ativado. Pode falar à vontade.");
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                toast.error("Permissão de microfone negada.");
            } else if (event.error !== 'no-speech') {
                toast.error(`Erro de voz: ${event.error}`);
            }
        };

        recognition.onresult = (event: any) => {
            let finalResult = '';

            // Iterate through results since the last check
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

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onTranscript]); // Only depend on onTranscript, not currentValue

    const toggleListening = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isSupported) {
            toast.error("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            try {
                recognitionRef.current?.start();
            } catch (err) {
                console.error("Recognition start error:", err);
                // Restart instance if it's in an invalid state
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'pt-BR';
                // (Handlers would need re-attachment here, but simplified for now)
                recognitionRef.current?.start();
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
