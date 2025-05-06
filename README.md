# Nederlandse Schrijfverbetering App

Deze applicatie is ontworpen om inburgeringscursisten in Nederland te helpen hun schrijfvaardigheid in het Nederlands te verbeteren. Met behulp van de OpenAI API worden grammaticale fouten gecorrigeerd en wordt de zinsstructuur verbeterd.

## Kenmerken

- Gebruiksvriendelijke interface voor het invoeren van Nederlandse tekst
- Direct tekstverbeteringen via de OpenAI API
- Ontworpen voor inburgeringscursisten om hun Nederlands te verbeteren
- Voorbeeld: "ik zin in brood hebben" wordt verbeterd naar "ik heb zin in brood"

## Installatie

1. Kloon de repository:
   ```bash
   git clone [repository-url]
   cd schrijfverbetering-app
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

3. Voer een Nederlandse zin in met fouten

4. Klik op "Verbeter mijn tekst" om de gecorrigeerde versie te zien

## Technologieën

- Next.js
- Tailwind CSS
- OpenAI API

## Bijdragen

Bijdragen aan dit project worden zeer op prijs gesteld. Voel je vrij om pull-requests in te dienen of problemen te melden via de issues sectie van de repository.
