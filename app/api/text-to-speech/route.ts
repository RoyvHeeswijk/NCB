import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

type LanguageLevel = 'A1' | 'A2' | 'B1';

interface RequestBody {
    text?: string;
    isInitialGreeting?: boolean;
    languageLevel?: LanguageLevel;
}

const INITIAL_GREETINGS: Record<LanguageLevel, string> = {
    A1: "Hallo! Ik ben de bakker. Welkom in mijn winkel. Kan ik u ergens mee helpen?",
    A2: "Goedendag! Welkom in mijn bakkerij. Ik ben de bakker hier. Wat kan ik voor u betekenen?",
    B1: "Welkom in mijn bakkerij! Ik ben de bakker en help u graag. We hebben vers brood, broodjes en gebak. Wat wilt u kopen?"
};

const levelDescriptions: Record<LanguageLevel, string> = {
    A1: "Gebruik alleen basiswoorden en zeer eenvoudige zinnen. Maximaal 5-7 woorden per zin. Gebruik alleen het heden. Vermijd bijzinnen. Gebruik veel herhaling. Gebruik alleen de meest voorkomende woorden zoals: brood, koekjes, lekker, kopen, alstublieft, dankuwel.",
    A2: "Gebruik eenvoudige woorden en korte zinnen. Maximaal 8-10 woorden per zin. Focus op dagelijkse situaties. Eenvoudige verbindingswoorden zoals 'en', 'maar', 'want' zijn OK. Gebruik woorden die vaak in een bakkerij voorkomen zoals: vers gebakken, knapperig, zacht, zoet.",
    B1: "Gebruik normale dagelijkse taal. Zinnen mogen wat langer zijn, maar probeer rond de 15-20 woorden per zin te blijven. Complexere verbindingswoorden zijn OK. Leg moeilijke woorden uit met simpelere woorden. Je mag praten over verschillende soorten brood en gebak, ingrediënten, en bereidingswijzen."
};

export async function POST(request: Request) {
    try {
        const body = await request.json() as RequestBody;
        const languageLevel = body.languageLevel || 'A1';

        if (body.isInitialGreeting) {
            return NextResponse.json({
                text: INITIAL_GREETINGS[languageLevel],
            });
        }

        if (!body.text) {
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
                    content: `Je bent een vriendelijke Nederlandse bakker met jarenlange ervaring in je eigen bakkerij. Je praat met mensen die Nederlands leren op ${languageLevel} niveau.
                    ${levelDescriptions[languageLevel]}
                    
                    Belangrijke regels voor je rol als bakker:
                    - Blijf ALTIJD in je rol als bakker en praat vanuit je ervaring in de bakkerij
                    - Relateer alle informatie aan jouw bakkerij, producten of ervaring als bakker
                    - Als er vragen komen over andere onderwerpen, probeer ze terug te brengen naar de context van de bakkerij
                    - Gebruik voorbeelden uit je dagelijkse werk in de bakkerij
                    
                    Spreek langzaam en duidelijk. 
                    Herhaal belangrijke woorden. Gebruik veelgebruikte uitdrukkingen die je in een bakkerij hoort.
                    Houd je antwoorden kort (maximaal 2-3 zinnen).
                    Eindig ALTIJD met een vraag of een uitnodiging om door te praten.
                    Als je een moeilijk woord gebruikt, leg het dan uit met eenvoudigere woorden.
                    
                    Voorbeelden van antwoorden op dit niveau:
                    ${languageLevel === 'A1' ?
                            "- 'Ja, dit brood is vers. Het is lekker. Wilt u het proeven?'\n- 'De koekjes kosten twee euro. Ze zijn zoet. Hoeveel wilt u er hebben?'" :
                            languageLevel === 'A2' ?
                                "- 'Dit brood is vanochtend vers gebakken. Het is nog lekker warm en zacht. Zal ik er een stukje afsnijden om te proeven?'\n- 'We hebben verschillende soorten koekjes, zoals chocolade en vanille. Welke vindt u het lekkerst?'" :
                                "- 'Als bakker maak ik elke dag volkoren brood met de beste graankorrels. Ik kan u laten zien hoe knapperig de korst is. Wilt u weten hoe ik dit brood zo lekker krijg?'\n- 'In mijn bakkerij maak ik de appelgebakjes elke ochtend vers. Ik snijd de appels zelf en gebruik een speciaal recept. Zal ik u vertellen wat er zo bijzonder aan is?'"
                        }`
                },
                {
                    role: "user",
                    content: body.text
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