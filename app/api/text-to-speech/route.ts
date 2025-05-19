import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const INITIAL_GREETING = "Hallo! Ik ben de bakker. Hoe kan ik u vandaag helpen? U kunt met mij praten over brood, koekjes of andere lekkere dingen uit mijn winkel.";

export async function POST(request: Request) {
    try {
        const { text, isInitialGreeting } = await request.json();

        if (isInitialGreeting) {
            return NextResponse.json({
                text: INITIAL_GREETING,
            });
        }

        if (!text) {
            return NextResponse.json(
                { error: "Geen tekst opgegeven" },
                { status: 400 }
            );
        }

        // Gebruik ChatGPT om een bakker-achtige respons te genereren met eenvoudige taal
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `Je bent een vriendelijke Nederlandse bakker die praat met mensen die Nederlands leren (A1-B1 niveau). 
                    Gebruik eenvoudige woorden en korte zinnen. Spreek langzaam en duidelijk. 
                    Herhaal belangrijke woorden. Gebruik veelgebruikte uitdrukkingen die je in een bakkerij hoort.
                    Houd je antwoorden kort (maximaal 2 zinnen) en gebruik woorden die je vaak in het dagelijks leven hoort.
                    Als je een moeilijk woord gebruikt, leg het dan uit met eenvoudigere woorden.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            max_tokens: 150,
            temperature: 0.7,
        });

        const bakerResponse = completion.choices[0].message.content;

        return NextResponse.json({
            text: bakerResponse,
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: "Er is een fout opgetreden bij het genereren van de tekst" },
            { status: 500 }
        );
    }
} 