"use client";

import { useState, useEffect } from 'react';
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

export default function NewProject() {
    const [inputText, setInputText] = useState("");
    const [bakerResponse, setBakerResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [showIntroduction, setShowIntroduction] = useState(true);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [isTextConfirmed, setIsTextConfirmed] = useState(false);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const startExercise = async () => {
        setShowIntroduction(false);
        await fetchInitialGreeting();
    };

    const fetchInitialGreeting = async () => {
        try {
            const response = await fetch("/api/text-to-speech", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    isInitialGreeting: true
                }),
            });

            if (!response.ok) {
                throw new Error("Er is een fout opgetreden bij het ophalen van de begroeting");
            }

            const data = await response.json();
            setBakerResponse(data.text);
            speakText(data.text);
        } catch (err) {
            console.error(err);
        }
    };

    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

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

            const textWithPauses = text
                .replace(/[.,!?]/g, match => match + ' ')
                .replace(/\s+/g, ' ');

            utterance.text = textWithPauses;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => {
                setIsSpeaking(false);
                setError("Er is een fout opgetreden bij het afspelen van de spraak");
            };

            window.speechSynthesis.speak(utterance);
        } else {
            setError("Spraak wordt niet ondersteund in deze browser");
        }
    };

    const startListening = async () => {
        try {
            // Reset states
            setError("");
            setInputText("");
            setIsListening(true);
            setIsTextConfirmed(false);

            // Vraag microfoon toegang
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const localAudioChunks: Blob[] = []; // Local accumulator for this recording session

            // Maak een nieuwe recorder
            const recorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            setMediaRecorder(recorder); // Still set for the timeout logic to check recorder.state

            // Verwerk de audio data
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    localAudioChunks.push(event.data); // Push to local array
                }
            };

            // Verwerk de opname wanneer deze stopt
            recorder.onstop = async () => {
                try {
                    // Stop alle audio tracks
                    stream.getTracks().forEach(track => track.stop());

                    // Wacht even tot alle chunks zijn verzameld
                    await new Promise(resolve => setTimeout(resolve, 100));

                    if (localAudioChunks.length === 0) {
                        console.warn("No audio chunks recorded for this session.");
                        setError("Geen audio opgenomen. Probeer opnieuw.");
                        setIsListening(false);
                        return;
                    }

                    const audioBlob = new Blob(localAudioChunks, { type: 'audio/webm;codecs=opus' });
                    const reader = new FileReader();

                    reader.onloadend = async () => {
                        try {
                            const base64Audio = reader.result as string;

                            const response = await fetch("/api/speech-to-text", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    audio: base64Audio
                                }),
                            });

                            const data = await response.json();

                            if (!response.ok) {
                                throw new Error(data.error || "Er is een fout opgetreden bij het verwerken van de spraak");
                            }

                            if (data.text) {
                                setInputText(data.text);
                            } else {
                                setInputText(""); // Ensure inputText is cleared if API returns no text
                            }
                        } catch (err) {
                            console.error("Fout bij verwerken audio:", err);
                            setError(err instanceof Error ? err.message : "Er is een fout opgetreden bij het verwerken van de spraak");
                            setInputText(""); // Clear input text on error
                        }
                    };

                    reader.readAsDataURL(audioBlob);
                } catch (err) {
                    console.error("Fout bij verwerken opname:", err);
                    setError("Er is een fout opgetreden bij het verwerken van de opname");
                } finally {
                    setIsListening(false);
                }
            };

            // Start de opname
            recorder.start(100); // Start emitting data every 100ms

            // Stop na 5 seconden - ensure this refers to *this* recorder instance
            const currentRecorderInstance = recorder;
            setTimeout(() => {
                if (currentRecorderInstance && currentRecorderInstance.state === "recording") {
                    currentRecorderInstance.stop();
                }
            }, 5000);

        } catch (err) {
            console.error("Fout bij starten opname:", err);
            setError(err instanceof Error ? err.message : "Er is een fout opgetreden bij het starten van de opname");
            setIsListening(false);
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
            const response = await fetch("/api/text-to-speech", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: textToSubmit
                }),
            });

            if (!response.ok) {
                throw new Error("Er is een fout opgetreden bij het genereren van de tekst");
            }

            const data = await response.json();
            setBakerResponse(data.text);
            speakText(data.text);
        } catch (err) {
            setError("Er is een fout opgetreden. Probeer het later opnieuw.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (showIntroduction) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-12 bg-[#004c97]">
                <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
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
                            onClick={startExercise}
                            className="bg-[#0099a9] hover:bg-[#007a8a] text-white font-semibold py-3 px-8 rounded-md text-lg"
                        >
                            Start de Oefening
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-12 bg-[#004c97]">
            <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Baker Image */}
                    <div className="w-full md:w-1/2">
                        <div className="relative w-full aspect-square">
                            <Image
                                src="/Bakker.png"
                                alt="Vriendelijke bakker"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    {/* Conversation Section */}
                    <div className="w-full md:w-1/2">
                        <h1 className="text-2xl font-bold text-center mb-6 text-[#004c97]">
                            Gesprek met de Bakker
                        </h1>

                        {error && (
                            <div className="text-red-500 text-sm mb-4">{error}</div>
                        )}

                        {inputText && (
                            <div className="mb-4 p-4 bg-gray-50 rounded-md">
                                <p className="text-gray-700 mb-3">Jouw antwoord: "{inputText}"</p>
                                {!isTextConfirmed && (
                                    <div className="flex justify-center">
                                        <button
                                            onClick={confirmAndSendText}
                                            className="bg-[#0099a9] hover:bg-[#007a8a] text-white font-semibold py-3 px-6 rounded-md text-lg shadow-md transition-all duration-300 hover:shadow-lg"
                                        >
                                            Bevestig en Verstuur
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {bakerResponse && (
                            <div className="mb-4 p-4 bg-gray-50 rounded-md">
                                <p className="text-gray-700 italic mb-2">"{bakerResponse}"</p>
                                <button
                                    onClick={() => speakText(bakerResponse)}
                                    disabled={isSpeaking}
                                    className="text-[#0099a9] hover:text-[#007a8a] text-sm font-medium flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    Herhaal
                                </button>
                            </div>
                        )}

                        <div className="flex justify-center mt-6">
                            <button
                                onClick={startListening}
                                disabled={isLoading || isSpeaking || isListening}
                                className={`flex items-center justify-center w-24 h-24 rounded-full ${isListening
                                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                    : 'bg-[#0099a9] hover:bg-[#007a8a]'
                                    } text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg`}
                            >
                                {isListening ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {isListening && (
                            <p className="text-center mt-4 text-gray-600">
                                Spreek nu je antwoord in... (5 seconden)
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link href="/" className="text-[#0099a9] hover:text-[#007a8a]">
                        Terug naar Homepage
                    </Link>
                </div>
            </div>
        </main>
    );
} 