"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import Select from "@/shared/components/Select";
import { agentRegister } from "@/features/auth/api";
import { useAuth } from "@/features/auth/context/AuthContext";

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

export default function AgentSignupPage() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    agentName: "",
    phoneNumber: "",
    state: "",
    mandiName: "",
    aadhaarNumber: "",
  });
  const [aadhaarPhoto, setAadhaarPhoto] = useState<File | null>(null);

  // Prefill mobile number if coming from OTP flow
  useEffect(() => {
    const mobile = searchParams.get("mobile");
    if (mobile) {
      setForm((prev) => ({ ...prev, phoneNumber: mobile }));
    }
  }, [searchParams]);

  const isValidPhone = useMemo(() => form.phoneNumber.replace(/\D/g, "").length === 10, [form.phoneNumber]);
  const isValidAadhaar = useMemo(() => form.aadhaarNumber.replace(/\D/g, "").length >= 8, [form.aadhaarNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agentName || !form.phoneNumber || !form.state || !form.mandiName || !form.aadhaarNumber) {
      toast.error("Please fill all fields");
      return;
    }
    if (!isValidPhone) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (!isValidAadhaar) {
      toast.error("Enter a valid Aadhaar number");
      return;
    }
    if (!aadhaarPhoto) {
      toast.error("Please upload Aadhaar photo");
      return;
    }

    try {
      setIsLoading(true);
      const res = await agentRegister({
        ...form,
        phoneNumber: form.phoneNumber.replace(/\D/g, ""),
        aadhaarPhoto,
      });
      if (res?.accessToken) {
        await login(res.accessToken);
        toast.success("Agent account created!");
      } else {
        toast.error("Registration failed: missing access token");
      }
    } catch (err: any) {
      toast.error(err.message || "Agent registration failed");
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
          Agent Signup <span className="text-[#4309ac]">MandiPlus</span>
        </h2>
        <p className="text-gray-800 mb-6">Create your agent account</p>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
          <Input
            className="bg-gray-100/80"
            placeholder="Agent Name"
            value={form.agentName}
            onChange={(e) => setForm({ ...form, agentName: e.target.value })}
          />

          <Input
            className="bg-gray-100/80"
            placeholder="Mobile Number"
            maxLength={10}
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          />

          <Select
            className="bg-gray-200/80"
            placeholder="Select State"
            options={indianStates}
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
          />

          <Input
            className="bg-gray-100/80"
            placeholder="Mandi Name"
            value={form.mandiName}
            onChange={(e) => setForm({ ...form, mandiName: e.target.value })}
          />

          <Input
            className="bg-gray-100/80"
            placeholder="Aadhaar Number"
            value={form.aadhaarNumber}
            onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })}
          />

          <div className="rounded-xl bg-gray-100/80 px-4 py-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aadhaar Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAadhaarPhoto(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700"
            />
            {aadhaarPhoto && (
              <p className="mt-2 text-xs text-gray-600">
                Selected: {aadhaarPhoto.name}
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl text-white ${isLoading ? "bg-gray-400" : "bg-[#4309ac]"}`}
            >
              {isLoading ? "Creating..." : "Create Agent Account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

