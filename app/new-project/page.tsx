"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Voeg type definities toe voor de Web Speech API
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (event: Event) => void;
    onend: (event: Event) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

type ScreenState = 'selection' | 'detailedRules' | 'chat' | 'levelSelection';
type LanguageLevel = 'A1' | 'A2' | 'B1';

export default function NewProject() {
    const [inputText, setInputText] = useState("");
    const [bakerResponse, setBakerResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [currentScreen, setCurrentScreen] = useState<ScreenState>('selection');
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [isTextConfirmed, setIsTextConfirmed] = useState(false);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const [remainingTime, setRemainingTime] = useState<number>(20);
    const [languageLevel, setLanguageLevel] = useState<LanguageLevel | null>(null);
    const [showLevelWarning, setShowLevelWarning] = useState(false);
    const [warningPosition, setWarningPosition] = useState({ x: 0, y: 0 });
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            // Cleanup speech synthesis when component unmounts
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            if (currentUtteranceRef.current) {
                currentUtteranceRef.current.onstart = null;
                currentUtteranceRef.current.onend = null;
                currentUtteranceRef.current.onerror = null;
                currentUtteranceRef.current = null;
            }
            window.speechSynthesis.onvoiceschanged = null;

            // Cancel any ongoing fetch requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const goToChatScreen = async (exerciseType?: string) => {
        // Cancel any ongoing speech before changing screens
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setCurrentScreen('chat');
        await fetchInitialGreeting();
    };

    const fetchInitialGreeting = async (levelOverride?: LanguageLevel) => {
        try {
            // Cancel any previous ongoing requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller for this request
            abortControllerRef.current = new AbortController();

            // Use levelOverride if provided, otherwise use current languageLevel
            const currentLevel = levelOverride || languageLevel;

            const response = await fetch("/api/text-to-speech", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    isInitialGreeting: true,
                    languageLevel: currentLevel
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error("Fout bij genereren tekst");
            const data = await response.json();
            setBakerResponse(data.text);
            speakText(data.text);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                // Request was aborted, do nothing
                return;
            }
            console.error(err);
            setError("Kon de bakker niet bereiken. Probeer het later opnieuw.");
        }
    };

    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            // Cancel any previous speech and clear its references
            window.speechSynthesis.cancel();
            if (currentUtteranceRef.current) {
                // Clear event handlers to prevent old utterances from triggering errors
                currentUtteranceRef.current.onstart = null;
                currentUtteranceRef.current.onend = null;
                currentUtteranceRef.current.onerror = null;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            currentUtteranceRef.current = utterance;

            const dutchVoice = voices.find(voice =>
                voice.lang.includes('nl') && voice.name.includes('Female')
            ) || voices.find(voice => voice.lang.includes('nl')) || voices[0];

            if (dutchVoice) {
                utterance.voice = dutchVoice;
            }
            utterance.lang = 'nl-NL';
            utterance.rate = 0.85;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            const cleanedText = text.replace(/\\s+/g, ' ').trim();
            utterance.text = cleanedText;

            utterance.onstart = () => {
                // Only set speaking state if this is still the current utterance
                if (currentUtteranceRef.current === utterance) {
                    setIsSpeaking(true);
                }
            };

            utterance.onend = () => {
                // Only update state if this is still the current utterance
                if (currentUtteranceRef.current === utterance) {
                    setIsSpeaking(false);
                    currentUtteranceRef.current = null;
                }
            };

            utterance.onerror = (event) => {
                // Only show error if this is still the current utterance and it's not a cancellation
                if (currentUtteranceRef.current === utterance && event.error !== 'interrupted') {
                    setIsSpeaking(false);
                    setError("Er is een fout opgetreden bij het afspelen van de spraak");
                    currentUtteranceRef.current = null;
                }
            };

            window.speechSynthesis.speak(utterance);
        } else {
            setError("Spraak wordt niet ondersteund in deze browser");
        }
    };

    const startListening = async () => {
        if (!languageLevel) {
            setError("Selecteer eerst je taalniveau voordat je kunt beginnen met spreken");
            setTimeout(() => setError(""), 3000);
            return;
        }

        try {
            setError("");
            setInputText("");
            setIsListening(true);
            setIsTextConfirmed(false);
            setIsProcessingAudio(false);
            setRemainingTime(20);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const localAudioChunks: Blob[] = [];
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            setMediaRecorder(recorder);
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) localAudioChunks.push(event.data);
            };
            recorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());

                await new Promise(resolve => setTimeout(resolve, 100));

                if (localAudioChunks.length === 0) {
                    setError("Geen audio opgenomen. Probeer opnieuw.");
                    setIsListening(false);
                    setIsProcessingAudio(false);
                    return;
                }

                setIsListening(false);
                setIsProcessingAudio(true);

                const audioBlob = new Blob(localAudioChunks, { type: 'audio/webm;codecs=opus' });
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const base64Audio = reader.result as string;
                        const response = await fetch("/api/speech-to-text", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ audio: base64Audio }),
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error || "Fout bij spraakverwerking");
                        setInputText(data.text || "");
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "Fout bij verwerken audio");
                        setInputText("");
                    } finally {
                        setIsProcessingAudio(false);
                    }
                };
                reader.readAsDataURL(audioBlob);
            };
            recorder.start(100);
            const currentRecorderInstance = recorder;

            // Start the countdown timer
            const timer = setInterval(() => {
                setRemainingTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        if (currentRecorderInstance && currentRecorderInstance.state === "recording") {
                            currentRecorderInstance.stop();
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Cleanup timer when recording stops
            recorder.addEventListener('stop', () => {
                clearInterval(timer);
                setRemainingTime(20);
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : "Fout bij starten opname");
            setIsListening(false);
            setIsProcessingAudio(false);
        }
    };

    const confirmAndSendText = async () => {
        if (inputText.trim()) {
            setIsTextConfirmed(true);
            await handleSubmit(new Event('submit') as any, inputText);
        }
    };

    const handleSubmit = async (e: React.FormEvent, voiceInput?: string) => {
        e.preventDefault();
        const textToSubmit = voiceInput || inputText;
        if (!textToSubmit.trim()) {
            setError("Voer alstublieft een tekst in");
            return;
        }
        setIsLoading(true);
        setError("");
        setBakerResponse("");

        try {
            // Cancel any previous ongoing requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller for this request
            abortControllerRef.current = new AbortController();

            const response = await fetch("/api/text-to-speech", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: textToSubmit,
                    languageLevel
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error("Fout bij genereren tekst");
            const data = await response.json();
            setBakerResponse(data.text);
            speakText(data.text);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                // Request was aborted, do nothing
                return;
            }
            setError("Er is een fout opgetreden. Probeer het later opnieuw.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSpeakClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!languageLevel) {
            // Get button position
            const button = event.currentTarget;
            const rect = button.getBoundingClientRect();

            // Position the warning above the button
            setWarningPosition({
                x: rect.left + (rect.width / 2),
                y: rect.top - 10
            });

            setShowLevelWarning(true);
            setTimeout(() => setShowLevelWarning(false), 3000);
            return;
        }
        goToChatScreen('speak');
    };

    const handleLevelSelect = (level: LanguageLevel) => {
        // Cancel any ongoing speech and requests before changing levels
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (currentUtteranceRef.current) {
            // Clear event handlers to prevent error messages from cancelled speech
            currentUtteranceRef.current.onstart = null;
            currentUtteranceRef.current.onend = null;
            currentUtteranceRef.current.onerror = null;
            currentUtteranceRef.current = null;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Clear any existing errors and reset states
        setError("");
        setIsSpeaking(false);
        setBakerResponse(""); // Clear the previous response immediately

        setLanguageLevel(level);
        setCurrentScreen('chat');

        // Pass the new level directly to avoid race condition
        fetchInitialGreeting(level);
    };

    const handleBackToMenu = () => {
        // Stop any ongoing speech and clear references
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (currentUtteranceRef.current) {
            currentUtteranceRef.current.onstart = null;
            currentUtteranceRef.current.onend = null;
            currentUtteranceRef.current.onerror = null;
            currentUtteranceRef.current = null;
        }
        setIsSpeaking(false);
        setError("");
        setCurrentScreen('selection');
    };

    if (currentScreen === 'levelSelection') {
        return (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
                    <h2 className="text-2xl font-bold text-white text-center mb-2">
                        Kies je taalniveau
                    </h2>
                    <p className="text-gray-300 text-center mb-8">
                        Selecteer het niveau dat het beste bij jou past
                    </p>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        {(['A1', 'A2', 'B1'] as const).map((level) => (
                            <button
                                key={level}
                                onClick={() => handleLevelSelect(level)}
                                className="flex flex-col items-center p-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                            >
                                <span className="text-2xl font-bold text-white mb-2">{level}</span>
                                <span className="text-xs text-gray-300 text-center">
                                    {level === 'A1' && 'Beginner'}
                                    {level === 'A2' && 'Basis'}
                                    {level === 'B1' && 'Gevorderd'}
                                </span>
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setCurrentScreen('selection')}
                        className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        Terug naar menu
                    </button>
                </div>
            </div>
        );
    }

    if (currentScreen === 'selection') {
        return (
            <main className="flex min-h-screen flex-col items-center justify-start pt-10 sm:pt-16 p-4 sm:p-6 bg-gray-900 text-white">
                {showLevelWarning && (
                    <div
                        className="fixed bg-yellow-500 text-black py-2 px-4 rounded-md shadow-lg text-sm z-50 animate-bounce"
                        style={{
                            left: `${warningPosition.x}px`,
                            top: `${warningPosition.y}px`,
                            transform: 'translate(-50%, -100%)'
                        }}
                    >
                        ⚠️ Selecteer eerst je niveau
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-yellow-500"></div>
                    </div>
                )}

                <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                    <Link href="/" className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white inline-flex items-center justify-center" aria-label="Ga terug">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 15L3 9M3 9L9 3M3 9H16C18.7614 9 21 11.2386 21 14C21 16.7614 18.7614 19 16 19H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </div>

                <div className="w-full max-w-lg text-center mt-8 sm:mt-4">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-white">
                        Gesprek voeren
                    </h1>
                    <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-10">
                        Kies een optie
                    </p>

                    <div className="w-full max-w-xs sm:max-w-sm mx-auto mb-8 sm:mb-10">
                        <Image
                            src="/Bakker.png"
                            alt="De Bakker"
                            width={300}
                            height={300}
                            objectFit="contain"
                            className="rounded-lg"
                        />
                    </div>

                    <div className="space-y-4 w-full max-w-xs sm:max-w-sm mx-auto">
                        <button
                            onClick={() => setCurrentScreen('detailedRules')}
                            className="flex items-center w-full p-3 sm:p-4 rounded-full bg-[#7BCFD6] text-slate-800 font-semibold shadow-md hover:bg-[#6AB6BC] transition-colors text-sm sm:text-base"
                        >
                            <span className="bg-[#005A9C] rounded-full p-2 mr-3 sm:mr-4 ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c.266-.173.582-.255.898-.255s.632.082.898.255c.282.186.45.496.45.837v3.004c0 .341-.168.651-.45.837a1.5 1.5 0 01-1.796 0c-.282-.186-.45-.496-.45-.837V11.394c0-.341.168.651.45-.837zM12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                            </span>
                            Introductie
                        </button>
                        <button
                            onClick={() => { console.log('Typen feature is not currently active.'); }}
                            disabled
                            className="flex items-center w-full p-3 sm:p-4 rounded-full bg-gray-400 text-gray-600 font-semibold shadow-md cursor-not-allowed text-sm sm:text-base"
                        >
                            <span className="bg-gray-500 rounded-full p-2 mr-3 sm:mr-4 ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                                    <path fillRule="evenodd" d="M7.5 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm0 3a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm0 3a.75.75 0 01.75-.75H12a.75.75 0 010 1.5H8.25a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                </svg>
                            </span>
                            Typen
                        </button>
                        <button
                            onClick={() => setCurrentScreen('levelSelection')}
                            className="flex items-center w-full p-3 sm:p-4 rounded-full bg-[#7BCFD6] text-slate-800 font-semibold shadow-md hover:bg-[#6AB6BC] transition-colors text-sm sm:text-base"
                        >
                            <span className="bg-[#005A9C] rounded-full p-2 mr-3 sm:mr-4 ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v4M8 23h8" />
                                </svg>
                            </span>
                            Spreken
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    if (currentScreen === 'detailedRules') {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-12 bg-[#004c97]">
                <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
                    <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                        <button
                            onClick={() => setCurrentScreen('selection')}
                            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-700 inline-flex items-center justify-center" aria-label="Terug naar selectie"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <h1 className="text-3xl font-bold text-center mb-6 text-[#004c97]">
                        Praat met de Bakker
                    </h1>
                    <div className="space-y-6 text-gray-700">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h2 className="text-xl font-semibold mb-2 text-[#0099a9]">Doel van de Oefening</h2>
                            <p>Oefen je Nederlandse spreekvaardigheid door een gesprek te voeren met de bakker. Deze oefening is geschikt voor niveau A1 tot B1.</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h2 className="text-xl font-semibold mb-2 text-[#0099a9]">Hoe werkt het?</h2>
                            <ul className="list-disc list-inside space-y-2">
                                <li>De bakker begint het gesprek met een begroeting</li>
                                <li>Klik op de grote microfoonknop om te beginnen met praten</li>
                                <li>Je hebt 5 seconden om je antwoord in te spreken</li>
                                <li>De bakker spreekt langzaam en duidelijk</li>
                                <li>Je kunt de tekst opnieuw laten afspelen</li>
                            </ul>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <h2 className="text-xl font-semibold mb-2 text-[#0099a9]">Tips</h2>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Begin met eenvoudige begroetingen</li>
                                <li>Vraag naar verschillende soorten brood</li>
                                <li>Praat over de prijzen</li>
                                <li>Vraag naar openingstijden</li>
                                <li>Gebruik woorden die je in een bakkerij hoort</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setCurrentScreen('selection')}
                            className="bg-[#0099a9] hover:bg-[#007a8a] text-white font-semibold py-3 px-8 rounded-md text-lg"
                        >
                            Terug naar Keuzemenu
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <div className="relative flex-grow w-full h-3/5 sm:h-2/3 md:h-3/4 bg-gray-700">
                <Image
                    src="/Bakker.png"
                    alt="Bakker achtergrond"
                    layout="fill"
                    objectFit="cover"
                    objectPosition="top"
                    className="z-0 opacity-80"
                    priority
                />

                <button
                    onClick={handleBackToMenu}
                    className="absolute top-4 left-4 p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white inline-flex items-center justify-center shadow-lg z-20"
                    aria-label="Terug naar menu"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {!languageLevel && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20">
                        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                            <h3 className="text-xl font-semibold text-center mb-4">Kies je taalniveau</h3>
                            <p className="text-gray-300 text-sm mb-6 text-center">
                                Selecteer je niveau om te beginnen met spreken
                            </p>
                            <div className="flex justify-center gap-4">
                                {(['A1', 'A2', 'B1'] as const).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setLanguageLevel(level)}
                                        className={`px-6 py-2 rounded-full font-semibold transition-colors ${languageLevel === level
                                            ? 'bg-[#0099a9] text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end p-4 sm:p-6 md:p-8 z-10 pb-8 sm:pb-12">
                    {bakerResponse && (
                        <div className="text-center">
                            <p className="text-white text-xl sm:text-2xl md:text-3xl font-semibold bg-slate-800 bg-opacity-75 p-3 sm:p-4 rounded-lg inline-block shadow-lg">
                                {bakerResponse}
                            </p>
                            <button
                                onClick={() => speakText(bakerResponse)}
                                disabled={isSpeaking}
                                className="text-gray-200 hover:text-white text-xs font-medium flex items-center gap-1 justify-center mt-2 bg-black bg-opacity-40 hover:bg-opacity-50 py-1 px-2 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                Herhaal
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white py-2 px-4 rounded-md shadow-lg text-sm z-20 w-auto max-w-xs sm:max-w-sm text-center">
                    {error}
                </div>
            )}

            <div className="w-full h-2/5 sm:h-1/3 md:h-1/4 bg-gray-800 p-4 sm:p-6 flex flex-col justify-end items-center relative">
                <div className="w-full max-w-md mb-3 sm:mb-4 flex items-center justify-center h-16 sm:h-20">
                    {isProcessingAudio ? (
                        <div className="w-full p-3 bg-gray-700 rounded-lg text-center shadow">
                            <p className="text-gray-300 italic text-sm sm:text-base">Audio verwerken...</p>
                        </div>
                    ) : inputText && !isTextConfirmed ? (
                        <div className="w-full p-3 bg-gray-700 rounded-lg text-center shadow">
                            <p className="text-gray-100 mb-2 text-base sm:text-lg">"{inputText}"</p>
                            <button
                                onClick={confirmAndSendText}
                                className="bg-[#0099a9] hover:bg-[#007a8a] text-white font-semibold py-1.5 px-3 sm:py-2 sm:px-4 rounded-md text-xs sm:text-sm transition-colors"
                            >
                                Bevestig en Verstuur
                            </button>
                        </div>
                    ) : inputText && isTextConfirmed ? (
                        <div className="w-full p-3 bg-gray-600 rounded-lg text-center shadow">
                            <p className="text-gray-200 text-base sm:text-lg">Verstuurd: "{inputText}"</p>
                        </div>
                    ) : !isListening && (
                        <div className="w-full p-3 bg-gray-700 rounded-lg flex items-center justify-center shadow-inner h-full">
                            <p className="text-gray-400 italic text-sm sm:text-base">Hier komt je tekst...</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-center items-center mb-2 sm:mb-3">
                    <button
                        onClick={() => {
                            if (isListening && mediaRecorder && mediaRecorder.state === "recording") {
                                mediaRecorder.stop();
                            } else {
                                startListening();
                            }
                        }}
                        disabled={isLoading || isSpeaking || isProcessingAudio}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
                            ${isListening
                                ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400 animate-pulse'
                                : 'bg-gray-600 hover:bg-gray-500 focus:ring-gray-500'
                            } 
                            text-white disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {isListening ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v4M8 23h8" />
                            </svg>
                        )}
                    </button>
                </div>
                {isListening && (
                    <p className="text-center text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4">
                        Nog {remainingTime} seconden om op te nemen...
                    </p>
                )}

                <div className="absolute bottom-4 right-4">
                    <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
} 