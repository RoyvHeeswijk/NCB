import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { audio } = await request.json();

        if (!audio) {
            return NextResponse.json(
                { error: "Geen audio data ontvangen" },
                { status: 400 }
            );
        }

        console.log("Audio data ontvangen, lengte:", audio.length);

        // Verwijder de data: prefix en converteer base64 naar een buffer
        const base64Audio = audio.replace(/^data:audio\/webm;codecs=opus;base64,/, '');
        console.log("Base64 prefix verwijderd, nieuwe lengte:", base64Audio.length);

        const audioBuffer = Buffer.from(base64Audio, 'base64');
        console.log("Audio buffer gemaakt, grootte:", audioBuffer.length);

        // Maak een Blob van de audio buffer
        const audioBlob = new Blob([audioBuffer], { type: 'audio/webm;codecs=opus' });

        // Converteer Blob naar File object
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm;codecs=opus' });
        console.log("Audio file gemaakt, grootte:", audioFile.size);

        // Gebruik Whisper API voor spraakherkenning
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "nl",
            response_format: "text"
        });

        console.log("Transcriptie succesvol:", transcription);

        // Als er geen tekst is, geef een lege string terug
        if (!transcription) {
            return NextResponse.json({ text: "" });
        }

        return NextResponse.json({ text: transcription });
    } catch (error) {
        console.error('Error in speech-to-text:', error);

        // Geef een specifiekere foutmelding terug
        let errorMessage = "Er is een fout opgetreden bij het verwerken van de spraak";

        if (error instanceof Error) {
            if (error.message.includes("API key")) {
                errorMessage = "OpenAI API key is niet geldig. Controleer je .env.local bestand.";
            } else if (error.message.includes("network")) {
                errorMessage = "Netwerk fout. Controleer je internetverbinding.";
            } else if (error.message.includes("audio")) {
                errorMessage = "Audio kon niet worden verwerkt. Probeer het opnieuw.";
            }
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
} 