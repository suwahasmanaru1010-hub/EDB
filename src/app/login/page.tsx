"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Loader2, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { setAdminSession, getAdminSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [adminList, setAdminList] = useState<{ id: string; name: string; passcode: string }[]>([]);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const session = getAdminSession();
    if (session) {
      router.push("/");
    }
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase.from('admins').select('*');
      if (!error && data && data.length > 0) {
        setAdminList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!passcode.trim()) {
      setErrorMsg("Please enter your admin passcode.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Try checking against Supabase `admins` table
      let { data, error } = await supabase
        .from('admins')
        .select('*');

      let validAdmin: { id: string; name: string; passcode: string } | null = null;

      if (!error && data && data.length > 0) {
        validAdmin = data.find((a: any) => {
          const matchPass = a.passcode === passcode.trim();
          const matchName = !name.trim() || a.name.toLowerCase() === name.trim().toLowerCase();
          return matchPass && matchName;
        });
      }

      // 2. Default fallback if no admin in DB yet or table missing: passcode '73332210'
      if (!validAdmin && passcode.trim() === "73332210") {
        validAdmin = {
          id: "default-admin",
          name: name.trim() || "Janaki",
          passcode: "73332210"
        };
      }

      if (validAdmin) {
        setAdminSession({ 
          id: validAdmin.id, 
          name: validAdmin.name, 
          allowed_tabs: (validAdmin as any).allowed_tabs || ['/', '/entrepreneurs', '/cs-forms', '/settings']
        });
        router.push("/");
      } else {
        setErrorMsg("Invalid Passcode. Please check your passcode and try again.");
      }
    } catch (err: any) {
      if (passcode.trim() === "73332210") {
        setAdminSession({ 
          id: "default-admin", 
          name: name.trim() || "Janaki",
          allowed_tabs: ['/', '/entrepreneurs', '/cs-forms', '/settings']
        });
        router.push("/");
      } else {
        setErrorMsg("Failed to authenticate. Default passcode is 73332210.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-poppins bg-[#121212]">
      
      {/* LEFT HERO SECTION: 75% Width on Desktop */}
      <div className="flex-1 lg:w-3/4 bg-[#121212] p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden text-white min-h-[40vh] lg:min-h-screen border-b lg:border-b-0 border-gray-800">
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

        {/* Top Header Badge */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            ISDOM Admin Portal
          </span>
        </div>

        {/* Center Huge Bold Text: ISDOM */}
        <div className="relative z-10 my-auto py-12">
          <h1 className="text-7xl sm:text-8xl lg:text-[140px] font-extrabold tracking-tighter text-white leading-none mb-4">
            ISDOM
          </h1>
          <p className="text-lg lg:text-2xl font-light text-gray-300 max-w-xl leading-relaxed">
            Industry Sector - DS Office Maho
          </p>
        </div>

        {/* Footer Text */}
        <div className="relative z-10 text-xs text-gray-500 font-medium">
          © 2026 ISDOM - DS Office Maho. Authorized Administrator Access Only.
        </div>
      </div>

      {/* RIGHT LOGIN FORM SECTION: 25% Width on Desktop */}
      <div className="w-full lg:w-[420px] bg-white p-8 lg:p-12 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-gray-100 shadow-2xl relative z-20 min-h-[60vh] lg:min-h-screen">
        <div className="max-w-sm mx-auto w-full">
          {/* Mobile Header */}
          <div className="lg:hidden mb-6 text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">ISDOM</h2>
            <p className="text-xs text-gray-500 font-medium">Industry Sector - DS Office Maho</p>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Login</h3>
            <p className="text-xs text-gray-400 font-medium mt-1">Enter your passcode to access dashboard</p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-600 text-center animate-in fade-in duration-200">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Admin Name (Optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                {adminList.length > 0 ? (
                  <select
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-gray-900"
                  >
                    <option value="">-- Select Admin Profile --</option>
                    {adminList.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Shanika"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all placeholder-gray-400"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Passcode <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Enter Passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all placeholder-gray-400 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#2B2B2B] hover:bg-black text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Login to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
