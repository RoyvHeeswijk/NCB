"use client";

import { useState } from "react";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [promptText, setPromptText] = useState("Beschrijf wat u gisteren heeft gegeten (minimaal 5 woorden)");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputText.trim()) {
      setError("Voer alstublieft een tekst in");
      return;
    }

    const wordCount = inputText.trim().split(/\s+/).length;
    if (wordCount < 5) {
      setError("Uw antwoord moet minimaal 5 woorden bevatten");
      return;
    }

    setIsLoading(true);
    setError("");
    setHasResult(false);
    setIsCorrect(false);

    try {
      const response = await fetch("/api/correct-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error("Er is een fout opgetreden bij het verbeteren van de tekst");
      }

      const data = await response.json();
      setCorrectedText(data.correctedText);
      setIsCorrect(data.isCorrect === true);
      setHasResult(true);
    } catch (err) {
      setError("Er is een fout opgetreden. Probeer het later opnieuw.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-12 bg-[#004c97]">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 overflow-hidden">
        {/* Prompt box */}
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-md">
          <p className="text-center text-black font-medium">{promptText}</p>
        </div>

        {/* Input field */}
        <div className="mb-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full p-3 border rounded-md text-black"
            placeholder="voer hier uw antwoord in"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm mb-4">{error}</div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-[#0099a9] hover:bg-[#007a8a] text-white font-semibold py-2 px-4 rounded-md mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Bezig met verbeteren..." : "antwoord invoeren"}
        </button>

        {/* Show response - either success message or correction */}
        {hasResult && (
          isCorrect ? (
            <div className="p-4 bg-white border border-green-400 rounded-md">
              <p className="text-center font-medium text-green-600">
                ✓ Goed gedaan!
              </p>
            </div>
          ) : (
            <div className="p-4 bg-white border border-gray-200 rounded-md">
              <p className="text-center font-medium text-[#0099a9]">
                {correctedText}
              </p>
            </div>
          )
        )}
      </div>
    </main>
  );
}
