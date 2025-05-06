import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        // Get the text from the request body
        const { text } = await request.json();

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Tekst is vereist" },
                { status: 400 }
            );
        }

        // Check if the input has at least 5 words
        const wordCount = text.trim().split(/\s+/).length;
        if (wordCount < 5) {
            return NextResponse.json(
                { error: "Uw antwoord moet minimaal 5 woorden bevatten" },
                { status: 400 }
            );
        }

        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OpenAI API sleutel is niet geconfigureerd" },
                { status: 500 }
            );
        }

        // Call OpenAI API to check if the text is correct and provide correction if needed
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `Je bent een Nederlandse taalexpert die helpt bij het verbeteren van de grammatica en zinsstructuur voor mensen die Nederlands leren als onderdeel van hun inburgering.

Als de tekst grammaticaal correct is, antwoord dan met: "CORRECT: " gevolgd door de oorspronkelijke tekst.

Als de tekst grammaticaal niet correct is, verbeter dan de zinsbouw, woordvolgorde en grammatica, en antwoord met: "VERBETERD: " gevolgd door de verbeterde tekst.

Geef geen andere uitleg. Alleen de prefix (CORRECT of VERBETERD) en de tekst.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            temperature: 0.3,
            max_tokens: 150,
        });

        // Extract the response from the API
        const response = completion.choices[0]?.message?.content?.trim() || "";

        // Parse the response to check if it's correct or needs improvement
        let isCorrect = false;
        let correctedText = "";

        if (response.startsWith("CORRECT:")) {
            isCorrect = true;
            correctedText = text; // Use original text
        } else if (response.startsWith("VERBETERD:")) {
            isCorrect = false;
            correctedText = response.substring("VERBETERD:".length).trim();
        } else {
            // Fallback if the format is not followed
            isCorrect = response.toLowerCase().trim() === text.toLowerCase().trim();
            correctedText = response;
        }

        // Return the result with an indicator whether the text was correct
        return NextResponse.json({
            correctedText,
            isCorrect
        });
    } catch (error) {
        console.error("Error correcting text:", error);
        return NextResponse.json(
            { error: "Er is een fout opgetreden bij het verbeteren van de tekst" },
            { status: 500 }
        );
    }
} 