'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { EnrollixLogoLoading } from '@/components/EnrollixLogo';

interface EnrollixSplashProps {
  duration?: number;
  onComplete?: () => void;
}

/**
 * Enrollix Splash Screen / Loading Component
 * 
 * Shows animated Enrollix logo with loading spinner
 * Perfect for initial page load, authentication, etc.
 */
export function EnrollixSplash({ 
  duration = 3000,
  onComplete 
}: EnrollixSplashProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900"
    >
      {/* Background gradient animation */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        style={{
          background: 'linear-gradient(45deg, #3b82f6, #7c3aed, #3b82f6)',
          backgroundSize: '200% 200%',
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        {/* Logo */}
        <EnrollixLogoLoading size={80} />

        {/* Text */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Enrollix
          </h1>
          <p className="text-slate-300 text-sm font-medium">
            Admission Management Platform
          </p>
        </motion.div>

        {/* Loading dots */}
        <motion.div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-blue-400"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </motion.div>

        {/* Status text */}
        <motion.p
          className="text-xs text-slate-400 font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export default EnrollixSplash;
