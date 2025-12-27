"use client";

import { useRouter } from "next/navigation";

const LandingPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative">
      {/* Phone-style Card */}
      <div className="w-full max-w-md h-[95vh] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Center Text Logo */}
        <div className="w-[90%] max-w-sm aspect-square bg-white flex flex-col items-center justify-center text-center rounded-3xl">
          <h2
            className="text-5xl font-bold tracking-tight"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            <span className="text-slate-800">Mandi</span>
            <span className="text-[#4309ac]">Plus</span>
          </h2>

          <p className="mt-3 text-base font-medium">
            <span className="text-black">Risk Humara, </span>
            <span className="text-[#4309ac]">Munafa Aapka</span>
          </p>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-12 flex items-center gap-2 text-xs text-white">
          <img
            src="/images/india-flag.jpg"
            alt="India"
            className="w-8 h-8 object-contain rounded-full"
          />
          <span className="text-[15px] text-[#4309ac]">
            Proudly Made in India
          </span>
        </div>
      </div>

      {/* Floating CTA Button */}
      <button
        onClick={() => router.push("/register")}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-[#4309ac] text-white shadow-xl flex items-center justify-center"
        aria-label="Register"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </button>
    </div>
  );
};

export default LandingPage;
