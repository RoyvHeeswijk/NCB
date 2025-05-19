"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function NewProject() {
    const [inputText, setInputText] = useState("");
    const [bakerResponse, setBakerResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [showIntroduction, setShowIntroduction] = useState(true);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!inputText.trim()) {
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
                    text: inputText
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
                        Nederlandse Taaloefening: Gesprek met de Bakker
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
                                <li>Je kunt reageren door je antwoord in te typen</li>
                                <li>De bakker spreekt langzaam en duidelijk</li>
                                <li>Je kunt de tekst opnieuw laten afspelen</li>
                                <li>Gebruik eenvoudige zinnen en dagelijkse woorden</li>
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

                    {/* Input Section */}
                    <div className="w-full md:w-1/2">
                        <h1 className="text-2xl font-bold text-center mb-6 text-[#004c97]">
                            Gesprek met de Bakker
                        </h1>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    className="w-full p-3 border rounded-md text-black min-h-[100px]"
                                    placeholder="Typ hier wat je tegen de bakker wilt zeggen..."
                                />
                            </div>

                            {error && (
                                <div className="text-red-500 text-sm">{error}</div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || isSpeaking}
                                className="w-full bg-[#0099a9] hover:bg-[#007a8a] text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? "Bezig met genereren..." :
                                    isSpeaking ? "De bakker spreekt..." :
                                        "Praat met de bakker"}
                            </button>
                        </form>

                        {bakerResponse && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-md">
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