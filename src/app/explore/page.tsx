"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

type LangCode = "en" | "hi" | "kn";

const brochureMap: Record<LangCode, string> = {
  en: "/brochures/mandi-plus-brochure-english.pdf",
  hi: "/brochures/mandi-plus-brochure-hindi.pdf",
  kn: "/brochures/mandi-plus-brochure-kannada.pdf",
};

const languageOptions = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

const ExplorePage = () => {
  const router = useRouter();
  const [lang, setLang] = useState<LangCode>("hi"); // Default Hindi

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f5f3ff] via-[#faf8ff] to-white">
      {/* Background glow */}
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-[#4309ac]/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[560px] h-[560px] bg-[#e65100]/20 rounded-full blur-[180px] pointer-events-none" />

      {/* Header with back button and language selector */}
      <div className="fixed top-3 sm:top-6 left-0 right-0 z-30 px-3 sm:px-4 flex items-center justify-between">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1 text-[#4309ac] hover:text-[#350889] font-medium text-sm px-3 py-2 rounded-full bg-white/90 border border-[#e0d7fc] hover:bg-[#ede7fa] shadow transition"
          aria-label="Back to Home"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Language Selector */}
        <div className="flex gap-1 p-1 bg-white/90 rounded-full shadow-md backdrop-blur border border-gray-200">
          {languageOptions.map((option) => {
            const active = lang === option.code;
            return (
              <button
                key={option.code}
                onClick={() => setLang(option.code as LangCode)}
                className={`relative px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  active ? "text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-[#4309ac] shadow-md" />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PDF Viewer - Full Screen for both Mobile & Desktop */}
      <div className="w-full h-screen pt-16 sm:pt-20">
        <iframe
          key={lang}
          src={`${brochureMap[lang]}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
          title="Mandi Plus Brochure"
          className="w-full h-full border-0"
          style={{ 
            minHeight: '100vh',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
};

export default ExplorePage;