"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type LangCode = "en" | "hi" | "kn";

const brochureMap: Record<LangCode, string> = {
  en: "/brochures/Mandi-Plus-brochure-English-compressed.pdf",
  hi: "/brochures/Mandi-Plus-brochure-Hindi-compressed.pdf",
  kn: "/brochures/mandi-plus-brochure-kannada.pdf",
};

const languageOptions = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

const ExplorePage = () => {
  const router = useRouter();
  const [lang, setLang] = useState<LangCode>("hi");
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-open PDF on mobile
  useEffect(() => {
    if (isMobile) {
      window.open(brochureMap[lang], "_blank");
    }
  }, [isMobile, lang]);

  // Avoid rendering until mobile check is done
  if (isMobile === null) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f5f3ff] via-[#faf8ff] to-white">
      {/* Background glow */}
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-[#4309ac]/20 rounded-full blur-[160px]" />
      <div className="absolute -bottom-40 -right-40 w-[560px] h-[560px] bg-[#e65100]/20 rounded-full blur-[180px]" />

      {/* Header */}
      <div className="fixed top-4 sm:top-6 left-0 right-0 z-30 px-2 flex items-center justify-center gap-2">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1 text-[#4309ac] font-medium text-sm px-3 py-2 rounded-full bg-white/90 border border-[#e0d7fc] shadow"
          aria-label="Back"
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

        <div className="flex gap-1 p-1 bg-gray-100/90 rounded-full shadow-inner">
          {languageOptions.map((option) => {
            const active = lang === option.code;
            return (
              <button
                key={option.code}
                onClick={() => setLang(option.code as LangCode)}
                className={`relative px-4 py-2 rounded-full text-sm font-semibold transition ${
                  active ? "text-white" : "text-gray-600"
                }`}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-[#4309ac]" />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 sm:pt-24 w-full h-screen">
        {isMobile ? (
          // Mobile: Nothing to show, PDF auto-opens
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Opening brochure…
          </div>
        ) : (
          // Desktop: Embedded PDF
          <iframe
            key={lang}
            src={`${brochureMap[lang]}#toolbar=0&navpanes=0&view=FitH`}
            title="Brochure Viewer"
            className="w-full h-full border-0"
          />
        )}
      </div>
    </div>
  );
};

export default ExplorePage;