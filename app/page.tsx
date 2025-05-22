"use client";

import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-12 bg-[#004c97]">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#004c97]">
          Welkom bij NCB Projecten
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Text Correction Project Card */}
          <Link href="/text-correction" className="block">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300">
              <h2 className="text-xl font-semibold mb-3 text-[#0099a9]">
                Tekst Verbetering
              </h2>
              <p className="text-gray-600">
                Oefen je Nederlandse taalvaardigheid door antwoorden te geven op verschillende vragen.
                Je antwoorden worden automatisch verbeterd en je krijgt feedback.
              </p>
            </div>
          </Link>

          {/* New Project Card */}
          <Link href="/new-project" className="block">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300">
              <h2 className="text-xl font-semibold mb-3 text-[#0099a9]">
                Praat met de Bakker
              </h2>
              <p className="text-gray-600">
                Oefen je Nederlandse spreekvaardigheid in een interactief gesprek met een vriendelijke bakker.
                Bestel brood, vraag naar prijzen en verbeter je uitspraak!
              </p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
