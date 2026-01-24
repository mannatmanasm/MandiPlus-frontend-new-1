"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import { sendOtp, verifyOtp } from "@/features/auth/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext"; // Import useAuth
import Image from "next/image";

const LoginPage = () => {
    const router = useRouter();
    const { login } = useAuth(); // Get the login function from context

    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const [mobileNumber, setMobileNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [showRegistrationChoice, setShowRegistrationChoice] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (step === 'PHONE') {
                if (!mobileNumber || mobileNumber.length !== 10) {
                    toast.error("Enter a valid 10-digit number");
                    setIsLoading(false);
                    return;
                }
                const res = await sendOtp({ mobileNumber });

                // If backend already tells us this is a new user, we can remember that
                if (res?.next === 'REGISTER') {
                    toast.info("New number detected. Please verify OTP to register.");
                }

                setStep('OTP');
                setShowRegistrationChoice(false);
                toast.success(`OTP sent to ${mobileNumber}`);

            } else {
                if (!otp || otp.length !== 6) {
                    toast.error("Enter a valid 6-digit OTP");
                    setIsLoading(false);
                    return;
                }

                const response = await verifyOtp({ mobileNumber, otp });

                if (response.next === 'REGISTER') {
                    // New user: ask how they want to register (Normal vs Agent)
                    toast.info("New user detected. Choose how you want to register.");
                    setShowRegistrationChoice(true);
                }
                else if (response.next === 'HOME') {
                    // ----------------------------------------------------
                    // CRITICAL FIX: Update Context BEFORE redirecting
                    // ----------------------------------------------------
                    if (response.accessToken) {
                        // Pass token and user (if available) to AuthContext
                        await login(response.accessToken, response.user);
                        toast.success("Login successful!");
                    } else {
                        toast.error("Login failed: Missing access token");
                    }
                }
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-300 flex flex-col relative overflow-hidden">
            <div className="w-full relative bg-gray-200 pb-8">
                <Image
                    src="/images/truck-img.png"
                    alt="MandiPlus Truck"
                    width={1200}
                    height={800}
                    className="w-full h-auto block"
                    priority
                />
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/5 to-transparent" />
            </div>

            <div className="flex-1 bg-white -mt-8 px-6 py-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-10 flex flex-col">
                <h2 className="text-2xl font-bold mb-1 text-gray-800" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Welcome to <span className="text-[#4309ac]">MandiPlus</span>
                </h2>
                <p className="text-gray-800 mb-6">Sign in to your account</p>

                <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
                    {step === 'PHONE' ? (
                        <Input
                            className="bg-gray-100/80"
                            placeholder="Mobile Number"
                            maxLength={10}
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                        />
                    ) : (
                        <>
                            <p className="text-center text-sm text-gray-700">OTP sent to {mobileNumber}</p>
                            <Input
                                className="bg-gray-100/80 text-center tracking-widest"
                                placeholder="Enter 6-digit OTP"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                        </>
                    )}

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 rounded-xl text-white ${isLoading ? "bg-gray-400" : "bg-[#4309ac]"}`}
                        >
                            {isLoading ? "Processing..." : step === 'PHONE' ? "Get OTP" : "Verify & Login"}
                        </Button>
                    </div>

                    {step === 'OTP' && (
                        <>
                            <div className="text-center text-sm">
                                <button type="button" onClick={() => { setStep('PHONE'); setShowRegistrationChoice(false); }} className="text-[#4309ac]">
                                    Change Mobile Number
                                </button>
                            </div>

                            {showRegistrationChoice && (
                                <div className="mt-4 border border-purple-100 rounded-xl p-4 bg-purple-50/60">
                                    <p className="text-sm font-medium text-gray-800 mb-2">
                                        Aap kaise register karna chahte hain?
                                    </p>
                                    <p className="text-xs text-gray-600 mb-3">
                                        Choose whether you are a normal user or an agent.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/register?mobile=${mobileNumber}`)}
                                            className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 bg-white hover:bg-gray-50"
                                        >
                                            Normal User
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/agent/signup?mobile=${mobileNumber}`)}
                                            className="w-full py-2.5 rounded-lg border border-[#4309ac] text-sm font-semibold text-white bg-[#4309ac] hover:bg-[#340b85]"
                                        >
                                            Agent
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default LoginPage;