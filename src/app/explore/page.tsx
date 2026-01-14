"use client";
import React from "react";
import { useRouter } from "next/navigation";

type LangCode = "en" | "hi" | "kn";

const brochureMap: Record<LangCode, string> = {
  en: "/brochures/mandi-plus-brochure-english.pdf",
  hi: "/brochures/mandi-plus-brochure-hindi.pdf",
  kn: "/brochures/mandi-plus-brochure-kannada.pdf",
};

const languageOptions = [
  { code: "en", label: "English", icon: "🇬🇧" },
  { code: "hi", label: "हिंदी", icon: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ", icon: "🇮🇳" },
];

const ExplorePage = () => {
  const router = useRouter();

  // Hindi by default
  const [lang, setLang] = React.useState<LangCode>("hi");

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-[#f5f3ff] via-[#faf8ff] to-white">
      {/* Background glow */}
      <div className="absolute -top-32 -left-32 w-130 h-130 bg-[#4309ac]/20 rounded-full blur-[160px]" />
      <div className="absolute -bottom-40 -right-40 w-140 h-140 bg-[#e65100]/20 rounded-full blur-[180px]" />

      {/* Header with back button and language selector */}
      <div className="fixed top-6 left-0 right-0 z-30 px-0 flex items-center justify-center">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="z-30 flex items-center gap-1 text-[#4309ac] hover:text-[#350889] font-medium text-sm px-3 py-2 rounded-full bg-white/90 border border-[#e0d7fc] hover:bg-[#ede7fa] shadow transition mx-2"
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
        </button>

        {/* Language Selector */}
        <div className="relative flex gap-1 p-1 bg-gray-100/90 rounded-full shadow-inner backdrop-blur">
          {languageOptions.map((option) => {
            const active = lang === option.code;
            return (
              <button
                key={option.code}
                onClick={() => setLang(option.code as LangCode)}
                className={`relative px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-all duration-300 ${active
                  ? "text-white"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {active && (
                  <span className="absolute inset-0 z-1 rounded-full bg-[#4309ac] shadow-md" />
                )}
                <span className="z-5">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PDF Viewer – Full Page */}
      <div className="pt-20 px-0 pb-0 w-full mx-0">
        <div className="w-full h-[calc(100vh)] rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-inner">
          <div className="w-full h-full overflow-auto p-0">
            <iframe
              key={lang}
              src={`${brochureMap[lang]}#toolbar=0&navpanes=0&view=FitH`}
              title="Brochure Viewer"
              className="w-full h-full border-0"
              style={{ minHeight: 'calc(100vh - 12rem)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
