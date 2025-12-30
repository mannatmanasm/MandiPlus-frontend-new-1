"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import Select from "@/shared/components/Select";
import { register } from "@/features/auth/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext"; // Import useAuth
import Image from "next/image";

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
  const searchParams = useSearchParams();
  const { login } = useAuth(); // Get login function
  const [isLoading, setIsLoading] = useState(false);

  const initialMobile = searchParams.get('mobile') || "";

  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: initialMobile,
    state: "",
  });

  useEffect(() => {
    if (initialMobile) {
      setFormData(prev => ({ ...prev, mobileNumber: initialMobile }));
    }
  }, [initialMobile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { name, mobileNumber, state } = formData;

    if (!name || !mobileNumber || !state) {
      toast.error("Please fill all fields");
      setIsLoading(false);
      return;
    }

    try {
      const response = await register({ name, mobileNumber, state });

      // ----------------------------------------------------
      // CRITICAL FIX: Update Context BEFORE redirecting
      // ----------------------------------------------------
      if (response.accessToken) {
        await login(response.accessToken, response.user);
        toast.success("Account created successfully!");
        router.push("/home");
      }

    } catch (error: any) {
      toast.error(error.message || "Registration failed");
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
        <p className="text-gray-800 mb-6">Complete your profile</p>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
          <Input
            className="bg-gray-100/80"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            className="bg-gray-100/80 opacity-70"
            placeholder="Mobile Number"
            value={formData.mobileNumber}
            readOnly
          />

          <Select
            className="bg-gray-200/80"
            placeholder="Select State"
            options={indianStates}
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          />

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl text-white ${isLoading ? "bg-gray-400" : "bg-[#4309ac]"}`}
            >
              {isLoading ? "Creating Account..." : "Register"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;