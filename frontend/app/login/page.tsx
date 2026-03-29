"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { getToken, saveSession } from "@/lib/auth";
import { EnrollixLogo } from "@/components/EnrollixLogo";
import { motion } from "framer-motion";
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  CheckCircle,
  ArrowRight,
  Mail,
  Lock
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@crm.local");
  const [password, setPassword] = useState("Password@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.login(email, password);
      saveSession(response.token, response.user);
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unable to login. Try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Users,
      label: "Manage Leads",
      color: "from-blue-400 to-blue-600"
    },
    {
      icon: TrendingUp,
      label: "Track Progress",
      color: "from-violet-400 to-violet-600"
    },
    {
      icon: Calendar,
      label: "Schedule Follow-ups",
      color: "from-pink-400 to-pink-600"
    },
    {
      icon: CheckCircle,
      label: "Close Enrolments",
      color: "from-orange-400 to-orange-600"
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const floatingVariants = {
    float: {
      y: [0, -20, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <main className="min-h-screen flex bg-slate-950 overflow-hidden relative">
      {/* Animated Background Elements */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute -top-40 -left-40 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"
      />

      {/* Left Side - Premium Feature Panel */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center p-12 bg-gradient-to-br from-blue-600 via-slate-900 to-slate-950"
      >
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 0, 0, .05) 25%, rgba(255, 0, 0, .05) 26%, transparent 27%, transparent 74%, rgba(255, 0, 0, .05) 75%, rgba(255, 0, 0, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 0, 0, .05) 25%, rgba(255, 0, 0, .05) 26%, transparent 27%, transparent 74%, rgba(255, 0, 0, .05) 75%, rgba(255, 0, 0, .05) 76%, transparent 77%, transparent)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative z-10 max-w-md">
          {/* Heading */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center mb-16"
          >
            <motion.h2 variants={itemVariants} className="text-5xl font-bold text-white mb-3">
              Enrollix
            </motion.h2>
            <motion.p variants={itemVariants} className="text-lg text-blue-200 font-medium">
              Modern Admission Management
            </motion.p>
            <motion.div
              variants={itemVariants}
              className="h-1 w-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mx-auto mt-4"
            />
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4 mb-8"
          >
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  whileHover={{ y: -8, scale: 1.05 }}
                  className={`p-5 rounded-2xl bg-gradient-to-br ${feature.color} backdrop-blur-sm border border-white/10 shadow-lg hover:shadow-2xl transition-shadow duration-300 group cursor-pointer`}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="mb-3"
                  >
                    <Icon className="w-8 h-8 text-white group-hover:scale-125 transition-transform" />
                  </motion.div>
                  <p className="text-sm font-semibold text-white group-hover:translate-x-1 transition-transform">
                    {feature.label}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {[
              "Manage unlimited leads",
              "Advanced analytics & reports",
              "Automated follow-ups",
              "Close more enrolments",
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="flex items-center text-blue-100 hover:text-white transition-colors"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                  className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 mr-3"
                />
                <span className="text-sm font-medium">{stat}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Premium Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-8 relative">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/0 to-slate-900/0 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Premium Card */}
          <motion.div
            whileHover={{ boxShadow: "0 25px 50px -12px rgba(139, 92, 246, 0.3)" }}
            className="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 backdrop-blur-2xl p-10 shadow-2xl relative overflow-hidden"
          >
            {/* Card Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Logo Container */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="flex justify-center mb-8 relative z-20"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="p-5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-lg rounded-3xl border border-blue-400/30 shadow-xl"
              >
                <EnrollixLogo size="lg" animated={true} />
              </motion.div>
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-8 relative z-20"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 bg-clip-text text-transparent mb-3">
                Welcome Back
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                Sign in to your admission dashboard
              </p>
            </motion.div>

            {/* Form */}
            <form className="space-y-6 relative z-20" onSubmit={onSubmit}>
              {/* Email Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="group"
              >
                <label className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2 ml-1">
                  <Mail className="w-4 h-4 text-blue-400" />
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 hover:bg-slate-900/70 px-5 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-300 focus:border-blue-500/50 focus:bg-slate-900/80 focus:ring-1 focus:ring-blue-500/20 group-hover:border-slate-600/80"
                    placeholder="you@admission.edu"
                  />
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/0 via-blue-600/0 to-purple-600/0 group-focus-within:from-blue-600/10 group-focus-within:via-blue-600/10 group-focus-within:to-purple-600/10 pointer-events-none transition-all duration-300"
                  />
                </div>
              </motion.div>

              {/* Password Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="group"
              >
                <label className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2 ml-1">
                  <Lock className="w-4 h-4 text-blue-400" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 hover:bg-slate-900/70 px-5 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-300 focus:border-blue-500/50 focus:bg-slate-900/80 focus:ring-1 focus:ring-blue-500/20 group-hover:border-slate-600/80"
                    placeholder="••••••••"
                  />
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/0 via-blue-600/0 to-purple-600/0 group-focus-within:from-blue-600/10 group-focus-within:via-blue-600/10 group-focus-within:to-purple-600/10 pointer-events-none transition-all duration-300"
                  />
                </div>
              </motion.div>

              {/* Remember & Forgot */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex items-center justify-between text-sm"
              >
                <label className="flex items-center text-slate-400 cursor-pointer hover:text-slate-300 transition-colors group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-600 text-blue-600 bg-slate-900/50 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  />
                  <span className="ml-2 font-medium">Remember me</span>
                </label>
                <motion.a
                  href="#"
                  whileHover={{ x: 3 }}
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center gap-1"
                >
                  Forgot password?
                </motion.a>
              </motion.div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-red-950/40 border border-red-800/50 px-4 py-3 text-sm text-red-300 font-medium flex items-center gap-3"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                  {error}
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity" />
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-lg"
                        >
                          →
                        </motion.span>
                      </>
                    )}
                  </div>
                </motion.button>
              </motion.div>
            </form>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.55 }}
              className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-6 relative z-20"
            />

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center space-y-3 relative z-20"
            >
              <p className="text-xs text-slate-500">
                Demo credentials are prefilled. Or use{" "}
                <span className="font-bold text-blue-400">counselor@crm.local</span>
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-slate-600">
                <span>Secure platform by</span>
                <span className="font-bold text-blue-400">Enrollix</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500"
          >
            <motion.div whileHover={{ scale: 1.1 }} className="flex items-center gap-1 hover:text-slate-400 transition-colors">
              <div className="w-2 h-2 rounded-full bg-green-500/60" />
              <span>Enterprise</span>
            </motion.div>
            <div className="w-px h-4 bg-slate-700" />
            <motion.div whileHover={{ scale: 1.1 }} className="flex items-center gap-1 hover:text-slate-400 transition-colors">
              <div className="w-2 h-2 rounded-full bg-green-500/60" />
              <span>Secure</span>
            </motion.div>
            <div className="w-px h-4 bg-slate-700" />
            <motion.div whileHover={{ scale: 1.1 }} className="flex items-center gap-1 hover:text-slate-400 transition-colors">
              <div className="w-2 h-2 rounded-full bg-green-500/60" />
              <span>24/7 Support</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Mobile Left Panel Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="lg:hidden absolute bottom-6 left-6 right-6 text-center text-sm text-slate-400"
      >
        <p><span className="font-semibold text-blue-400">Enrollix</span> - Modern Admission Management</p>
      </motion.div>
    </main>
  );
}
