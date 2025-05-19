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

    useEffect(() => {
        // Laad beschikbare stemmen
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

    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            // Stop eventuele huidige spraak
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            // Zoek de beste Nederlandse stem
            const dutchVoice = voices.find(voice =>
                voice.lang.includes('nl') && voice.name.includes('Female')
            ) || voices.find(voice => voice.lang.includes('nl')) || voices[0];

            if (dutchVoice) {
                utterance.voice = dutchVoice;
            }

            // Aangepaste parameters voor natuurlijkere spraak
            utterance.lang = 'nl-NL';
            utterance.rate = 0.95; // Iets langzamer voor natuurlijkere spraak
            utterance.pitch = 1.0; // Neutrale toonhoogte
            utterance.volume = 1.0; // Maximale volume

            // Voeg pauzes toe aan leestekens voor natuurlijkere spraak
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
                            Praat met de Bakker
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
                                <p className="text-gray-700 italic">"{bakerResponse}"</p>
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