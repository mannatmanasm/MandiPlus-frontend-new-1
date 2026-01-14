"use client";
import React from 'react';
import { useRouter } from "next/navigation";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { FaWhatsapp } from "react-icons/fa";

const SupportPage = () => {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#e0d7fc] px-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full flex flex-col items-center relative">
        <button
          onClick={() => router.push("/")}
          className="absolute left-4 top-4 flex items-center gap-1 text-[#4309ac] hover:text-[#350889] font-medium text-sm px-2 py-1 rounded-lg bg-[#f3f0fa] border border-[#e0d7fc] hover:bg-[#ede7fa] transition"
          aria-label="Back to Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-3xl font-bold text-[#4309ac] mb-4">Support</h1>
        <p className="text-gray-700 text-lg mb-6 text-center">
          <span className="font-semibold text-[#4309ac]">
            All Insurance & Claim-related communication.
            <br />
            WhatsApp "Hi" to get started
          </span>
        </p>
        <div className="flex flex-col items-center gap-4 w-full">
          <a
            href="tel:+919900186757"
            className="flex items-center gap-3 bg-[#f3f0fa] border border-[#e0d7fc] rounded-xl px-4 py-3 w-full justify-center hover:bg-[#ede7fa] transition"
          >
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-[#4309ac] flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.494a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.494 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <FaWhatsapp className="h-5 w-5 text-[#25D366] flex-shrink-0" />
            </div>
            <span className="text-[#4309ac] font-medium">+91 99001 86757</span>
          </a>
          <a
            href="mailto:support@mandiplus.com"
            className="flex items-center gap-3 bg-[#f3f0fa] border border-[#e0d7fc] rounded-xl px-4 py-3 w-full justify-center hover:bg-[#ede7fa] transition"
          >
            <EnvelopeIcon className="h-5 w-5 text-[#4309ac] flex-shrink-0" />
            <span className="text-[#4309ac] font-medium">support@mandiplus.com</span>
          </a>
        </div>
        <p className="text-gray-500 text-xs mt-6 text-center">
          We are here to help you with your claims and support queries.
        </p>
      </div>
    </div>
  );
};

export default SupportPage;