'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface EnrollixLogoProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

/**
 * Animated Guruverse Logo Component
 * 
 * Modern, professional logo with:
 * - Gradient colors (fresh blue palette)
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
            id="guruverse-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          <filter id="guruverse-shadow">
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
          fill="url(#guruverse-gradient)"
          opacity="0.15"
          filter="url(#guruverse-shadow)"
        />

        {/* Main Shape - Stylized "G" with arrow */}
        <g filter="url(#guruverse-shadow)">
          <path
            d="M28 12.5a10.5 10.5 0 1 0 0 15"
            stroke="url(#guruverse-gradient)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <line
            x1="20"
            y1="20"
            x2="30.5"
            y2="20"
            stroke="url(#guruverse-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M28 16 L32 20 L28 24"
            stroke="url(#guruverse-gradient)"
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
            stroke="url(#guruverse-gradient)"
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
          stroke="url(#guruverse-gradient)"
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
        {'Guruverse'.split('').map((letter, index) => (
          <motion.span
            key={index}
            variants={letterVariants}
            className={`font-bold tracking-tight bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 bg-clip-text text-transparent`}
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
    <div className={className}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="guruverse-compact"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        <circle cx="20" cy="20" r="20" fill="url(#guruverse-compact)" />

        {/* G shape in white */}
        <path
          d="M26.5 12a10 10 0 1 0 0 16"
          stroke="white"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
        <line
          x1="19"
          y1="20"
          x2="29"
          y2="20"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M26 16.5 L29 20 L26 23.5"
          stroke="white"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
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
