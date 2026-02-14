"use client";

import React from "react";
import Link from "next/link";

const plans = [
  {
    price: "200",
    label: "3 vehicles/month",
    description: "Realtime truck tracking",
  },
  {
    price: "210",
    label: "7 vehicles/month",
    description: "Realtime truck tracking",
  },
  {
    price: "250",
    label: "Unlimited vehicles/month",
    description: "Realtime truck tracking",
  },
];

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-[#e0d7fc] px-4 py-8 pb-24" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-lg mx-auto">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-[#4309ac] hover:text-[#350889] font-medium text-sm px-2 py-1 rounded-lg bg-white/80 border border-[#e0d7fc] hover:bg-white transition mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <h1 className="text-2xl font-bold text-slate-800 mb-4">
          <span className="text-[#4309ac]">Pricing</span>
        </h1>

        {/* Plans */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.price}
              className="bg-white rounded-3xl shadow-sm p-5 border border-[#e0d7fc]/50 hover:border-[#4309ac]/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-slate-500 text-sm font-medium">{plan.label}</p>
                  <p className="text-slate-800 font-semibold mt-0.5">{plan.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-bold text-[#4309ac]">₹{plan.price}</span>
                  <span className="text-slate-500 text-sm">/lakh</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
