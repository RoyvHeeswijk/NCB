# Nederlandse Schrijfverbetering App (NCB)

Deze applicatie is ontworpen om inburgeringscursisten in Nederland te helpen hun schrijfvaardigheid in het Nederlands te verbeteren. Met behulp van de OpenAI API worden grammaticale fouten gecorrigeerd en wordt de zinsstructuur verbeterd.

## Kenmerken

- Gebruiksvriendelijke interface voor het invoeren van Nederlandse tekst
- Direct tekstverbeteringen via de OpenAI API
- Ontworpen voor inburgeringscursisten om hun Nederlands te verbeteren
- Voorbeeld: "ik zin in brood hebben" wordt verbeterd naar "ik heb zin in brood"
- Directe feedback wanneer de ingevoerde tekst grammaticaal correct is

## Installatie

1. Kloon de repository:
   ```bash
   git clone https://github.com/uwgebruikersnaam/ncb.git
   cd ncb
   ```

2. Installeer de benodigde pakketten:
   ```bash
   npm install
   ```

3. Maak een `.env.local` bestand in de hoofdmap en voeg je OpenAI API-sleutel toe:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Gebruik

1. Start de ontwikkelserver:
   ```bash
   npm run dev
   ```

2. Open je browser en ga naar `http://localhost:3000`

3. Volg de prompt op het scherm om een Nederlandse zin in te voeren

4. Klik op "antwoord invoeren" om de tekst te controleren

5. Ontvang direct feedback:
   - Een groen vinkje als je tekst correct is
   - Een verbeterde versie als er grammaticale fouten zijn

## Technologieën

- Next.js 15.3.1
- React 19
- Tailwind CSS 4
- OpenAI API (GPT-3.5 Turbo)
- TypeScript

## Structuur van het project

- `app/page.tsx`: Frontend gebruikersinterface
- `app/api/correct-text/route.ts`: API-endpoint die de OpenAI API aanroept
- `app/layout.tsx`: Hoofdlayout van de applicatie

## Bijdragen

Bijdragen aan dit project worden zeer op prijs gesteld. Voel je vrij om pull-requests in te dienen of problemen te melden via de issues sectie van de repository.

## Licentie

Dit project is gelicenseerd onder de MIT-licentie.
