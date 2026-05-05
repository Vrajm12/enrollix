"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Lock, Mail, ShieldCheck, Users } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { clearSession, getToken, getUser, saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hydrateSession = async () => {
      const user = getUser();
      if (!getToken() && !user) return;
      try {
        const me = await api.me();
        saveSession(undefined, me.user);
        router.replace(me.user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
      } catch {
        clearSession();
      }
    };
    void hydrateSession();
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.login(email, password);
      saveSession(response.token, response.user);
      router.push(response.user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Unable to sign in. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <section className="bg-gradient-to-b from-blue-800 to-blue-700 px-6 py-10 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:px-12 lg:py-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex items-center gap-3"
          >
            <span className="text-xl font-semibold tracking-wide">Guruverse CRM</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-10 lg:mt-0"
          >
            <h1 className="text-3xl font-semibold leading-tight lg:text-4xl">Admissions pipeline, simplified for high-performing teams.</h1>
            <p className="mt-4 max-w-md text-sm text-blue-100 lg:text-base">
              Track every lead, secure every interaction, and keep your team focused with a production-ready workflow.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Users, label: "Lead ownership" },
                { icon: CheckCircle2, label: "Follow-up discipline" },
                { icon: ShieldCheck, label: "Role-based security" },
                { icon: Mail, label: "Unified messaging" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl border border-blue-300/30 bg-blue-900/30 px-4 py-3">
                    <Icon size={18} className="text-blue-100" />
                    <p className="mt-2 text-sm font-medium text-white">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </section>

        <section className="flex flex-1 items-center justify-center px-6 py-10 lg:w-1/2 lg:px-12 bg-slate-50">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8"
          >
            <div className="mb-7">
              <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
              <p className="mt-2 text-sm text-slate-600">Access your CRM workspace.</p>
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@company.com"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Enter your password"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-3 text-center text-[11px] uppercase tracking-wide text-slate-500">
              <p>GURUVERSE CRM PLATFORM</p>
              <p className="mt-1 normal-case">secure multi-tenant admissions workspace.</p>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
