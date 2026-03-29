import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-google-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        // Brand colors
        primary: "#1a1a1a",
        "primary-light": "#f5f5f5",
        
        // Status colors
        "status-cold": "#3b82f6",
        "status-warm": "#f59e0b",
        "status-hot": "#ef4444",
        
        // UI colors
        "ui-border": "#e5e7eb",
        "ui-bg": "#f9fafb",
        "ui-hover": "#f3f4f6",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.08)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },
    }
  },
  plugins: []
};

export default config;
