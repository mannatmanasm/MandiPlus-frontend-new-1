"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import Select from "@/shared/components/Select";
import { register, verifyRegisterOtp } from "@/features/auth/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import Image from "next/image";

interface FormData {
  name: string;
  mobileNumber: string;
  state: string;
  otp: string;
  showOtpField: boolean;
}

const indianStates = [
  { value: "ANDHRA_PRADESH", label: "Andhra Pradesh" },
  { value: "ARUNACHAL_PRADESH", label: "Arunachal Pradesh" },
  { value: "ASSAM", label: "Assam" },
  { value: "BIHAR", label: "Bihar" },
  { value: "CHHATTISGARH", label: "Chhattisgarh" },
  { value: "GOA", label: "Goa" },
  { value: "GUJARAT", label: "Gujarat" },
  { value: "HARYANA", label: "Haryana" },
  { value: "HIMACHAL_PRADESH", label: "Himachal Pradesh" },
  { value: "JHARKHAND", label: "Jharkhand" },
  { value: "KARNATAKA", label: "Karnataka" },
  { value: "KERALA", label: "Kerala" },
  { value: "MADHYA_PRADESH", label: "Madhya Pradesh" },
  { value: "MAHARASHTRA", label: "Maharashtra" },
  { value: "MANIPUR", label: "Manipur" },
  { value: "MEGHALAYA", label: "Meghalaya" },
  { value: "MIZORAM", label: "Mizoram" },
  { value: "NAGALAND", label: "Nagaland" },
  { value: "ODISHA", label: "Odisha" },
  { value: "PUNJAB", label: "Punjab" },
  { value: "RAJASTHAN", label: "Rajasthan" },
  { value: "SIKKIM", label: "Sikkim" },
  { value: "TAMIL_NADU", label: "Tamil Nadu" },
  { value: "TELANGANA", label: "Telangana" },
  { value: "TRIPURA", label: "Tripura" },
  { value: "UTTAR_PRADESH", label: "Uttar Pradesh" },
  { value: "UTTARAKHAND", label: "Uttarakhand" },
  { value: "WEST_BENGAL", label: "West Bengal" },
  { value: "DELHI", label: "Delhi" },
];

const RegisterPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    mobileNumber: "",
    state: "",
    otp: "",
    showOtpField: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.showOtpField) {
        const { mobileNumber, name, state } = formData;

        if (!mobileNumber || !name || !state) {
          toast.error("Please fill in all required fields");
          return;
        }

        if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
          toast.error("Please enter a valid 10-digit Indian mobile number");
          return;
        }

        await register({ name, mobileNumber, state });
        setFormData((prev) => ({ ...prev, showOtpField: true }));
        toast.success("OTP sent successfully!");
      } else {
        if (!formData.otp || formData.otp.length !== 6) {
          toast.error("Enter valid 6-digit OTP");
          return;
        }

        const response = await verifyRegisterOtp({
          mobileNumber: formData.mobileNumber,
          otp: formData.otp,
        });

        if (response.accessToken) {
          toast.success("Registration successful!");
          router.push("/home");
          router.refresh();
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-300 flex flex-col relative overflow-hidden">

      {/* FIXED: Added min-h-[350px] to ensure truck is always visible */}
      <div className="w-full h-[50vh] min-h-[350px] relative flex-shrink-0">
        <Image
          src="/images/truck-img.jpg"
          alt="Truck on the road"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="flex-1 bg-white -mt-10 rounded-t-3xl px-6 py-8 shadow-2xl relative z-10 flex flex-col">
        <h2
          className="text-2xl font-bold mb-1 text-gray-800"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          Welcome to <span className="text-[#4309ac]">MandiPlus</span>
        </h2>

        <p className="text-gray-800 mb-6">Create your account</p>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
          {!formData.showOtpField ? (
            <>
              <Input
                className="bg-gray-100/80"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <Input
                className="bg-gray-100/80"
                placeholder="Mobile Number"
                maxLength={10}
                value={formData.mobileNumber}
                onChange={(e) =>
                  setFormData({ ...formData, mobileNumber: e.target.value })
                }
              />

              <Select
                className="bg-gray-200/80"
                placeholder="Select State"
                options={indianStates}
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
              />
            </>
          ) : (
            <>
              <p className="text-center text-sm text-gray-700">
                Enter OTP sent to {formData.mobileNumber}
              </p>

              <Input
                className="bg-gray-100/80 text-center tracking-widest"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={formData.otp}
                onChange={(e) =>
                  setFormData({ ...formData, otp: e.target.value })
                }
              />
            </>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl text-white ${isLoading ? "bg-gray-400" : "bg-[#4309ac]"
                }`}
            >
              {isLoading
                ? "Processing..."
                : formData.showOtpField
                  ? "Verify OTP"
                  : "Continue"}
            </Button>
          </div>

          <div className="text-center text-sm">
            {formData.showOtpField ? (
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, showOtpField: false }))
                }
                className="text-[#4309ac]"
              >
                Back to edit details
              </button>
            ) : (
              <p className="text-slate-900">
                Already have an account?{" "}
                <Link href="/login" className="text-[#4309ac]">
                  Login
                </Link>
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center pt-2 mt-auto">
            By continuing, I agree to Terms of Use & Privacy Policy
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;