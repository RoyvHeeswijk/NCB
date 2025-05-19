import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json(
                { error: "Geen tekst opgegeven" },
                { status: 400 }
            );
        }

        // Gebruik ChatGPT om een bakker-achtige respons te genereren
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "Je bent een vriendelijke Nederlandse bakker. Spreek in een warme, uitnodigende toon. Gebruik typische bakker-uitdrukkingen en spreek alsof je in een bakkerij staat. Houd je antwoorden kort en persoonlijk."
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