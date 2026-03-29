'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface EnrollixLogoProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

/**
 * Animated Enrollix Logo Component
 * 
 * Modern, professional logo with:
 * - Gradient colors (blue to violet)
 * - Animated entrance effect
 * - Responsive sizing
 * - Accessibility support
 */
export function EnrollixLogo({ 
  size = 'md', 
  animated = true,
  className = '' 
}: EnrollixLogoProps) {
  const sizeMap = {
    sm: { width: 32, height: 32, fontSize: 14 },
    md: { width: 40, height: 40, fontSize: 16 },
    lg: { width: 48, height: 48, fontSize: 18 },
  };

  const { width, height, fontSize } = sizeMap[size];

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

  const letterVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
      },
    },
  };

  const gradientVariants = {
    animate: {
      backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 15,
      },
    },
    hover: {
      scale: 1.1,
      rotate: 360,
      transition: {
        duration: 0.6,
        type: 'spring' as const,
      },
    },
  };

  return (
    <motion.div
      className={`flex items-center gap-2 ${className}`}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      whileHover="hover"
    >
      {/* Logo Icon */}
      <motion.svg
        width={width}
        height={height}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        variants={iconVariants}
      >
        <defs>
          <linearGradient
            id="enrollix-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>

          <filter id="enrollix-shadow">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="3"
              floodOpacity="0.2"
            />
          </filter>
        </defs>

        {/* Outer Circle */}
        <circle
          cx="20"
          cy="20"
          r="19"
          fill="url(#enrollix-gradient)"
          opacity="0.15"
          filter="url(#enrollix-shadow)"
        />

        {/* Main Shape - Stylized "E" with arrow */}
        <g filter="url(#enrollix-shadow)">
          {/* Vertical bar of E */}
          <rect x="10" y="8" width="3" height="24" fill="url(#enrollix-gradient)" />

          {/* Horizontal bars */}
          <rect x="13" y="8" width="12" height="3" fill="url(#enrollix-gradient)" />
          <rect x="13" y="17" width="10" height="3" fill="url(#enrollix-gradient)" />
          <rect x="13" y="26" width="12" height="3" fill="url(#enrollix-gradient)" />

          {/* Arrow accent */}
          <path
            d="M28 16 L32 20 L28 24"
            stroke="url(#enrollix-gradient)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="24"
            y1="20"
            x2="31"
            y2="20"
            stroke="url(#enrollix-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* Pulse animation element */}
        <motion.circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="url(#enrollix-gradient)"
          strokeWidth="1"
          opacity="0.3"
          animate={{
            r: animated ? [15, 22, 15] : 18,
            opacity: animated ? [0.5, 0, 0.5] : 0.3,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.svg>

      {/* Logo Text */}
      <motion.div
        className="flex items-baseline gap-0.5"
        initial="hidden"
        animate="visible"
      >
        {'Enrollix'.split('').map((letter, index) => (
          <motion.span
            key={index}
            variants={letterVariants}
            className={`font-bold tracking-tight bg-gradient-to-r from-blue-600 via-blue-600 to-violet-600 bg-clip-text text-transparent`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {letter}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}

/**
 * Compact Logo - for favicon/avatar use
 */
export function EnrollixLogoCompact({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200 }}
      className={className}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="enrollix-compact"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>

        <circle cx="20" cy="20" r="20" fill="url(#enrollix-compact)" />

        {/* E shape in white */}
        <g fill="white">
          <rect x="10" y="10" width="3" height="20" />
          <rect x="13" y="10" width="10" height="2.5" />
          <rect x="13" y="17.5" width="8" height="2.5" />
          <rect x="13" y="25" width="10" height="2.5" />
        </g>

        {/* Arrow accent */}
        <path
          d="M26 16.5 L29 20 L26 23.5"
          stroke="white"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

/**
 * Loading Spinner Logo
 */
export function EnrollixLogoLoading({ size = 40 }: { size?: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
    >
      <EnrollixLogoCompact size={size} />
    </motion.div>
  );
}

export default EnrollixLogo;
