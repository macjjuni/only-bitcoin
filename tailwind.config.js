/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./shared/**/*.{js,ts,jsx,tsx,mdx}",
    "./views/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./entities/**/*.{js,ts,jsx,tsx,mdx}",
    "./widgets/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      maxWidth: { layout: "524px" },
      screens: { "layout-max": "524px" },
      spacing: { header: "52px", "bottom-nav": "82px" },
      fontFamily: {
        default: ["var(--default-font)"],
        number: ["var(--number-font)"],
      },
      colors: {
        bitcoin: "var(--bitcoin-color)",
        up: "var(--up-color)",
        down: "var(--down-color)",
        background: "hsl(var(--background))",
      },
      height: {
        header: "var(--header-height)",
        navigation: "var(--navigation-height)",
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-1.6deg)" },
          "50%": { transform: "rotate(1.6deg)" },
        },
        blink: {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "1" },
        },
        blinkFade: {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "1" },
        },
        fadeOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        slideInFromRight: {
          "0%": { transform: "translateX(8px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideInFromLeft: {
          "0%": { transform: "translateX(-8px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        firstLoad: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        emberGlow: {
          "0%, 100%": {
            opacity: "0.5",
            transform: "translateX(-50%) translateY(3%) scaleX(1) scaleY(1)",
          },
          "22%": {
            opacity: "0.82",
            transform: "translateX(-51%) translateY(1%) scaleX(1.04) scaleY(1.05)",
          },
          "45%": {
            opacity: "0.62",
            transform: "translateX(-49%) translateY(2%) scaleX(0.98) scaleY(1.02)",
          },
          "68%": {
            opacity: "0.9",
            transform: "translateX(-50.5%) translateY(0) scaleX(1.05) scaleY(1.08)",
          },
        },
        swing: {
          "0%, 50%, 100%": {
            transform: "perspective(1000px) rotateY(0deg)",
            animationTimingFunction: "ease-out",
          },
          "25%": {
            transform: "perspective(1000px) rotateY(-8deg)",
            animationTimingFunction: "ease-in",
          },
          "75%": {
            transform: "perspective(1000px) rotateY(8deg)",
            animationTimingFunction: "ease-in",
          },
        },
      },
      animation: {
        wiggle: "wiggle 0.36s ease-in-out infinite",
        "blink-gold": "blink 1.2s infinite ease-in-out",
        "blink-fade": "blinkFade 1.33s infinite ease-in-out",
        swing: "swing 3.4s linear infinite",
        "view-exit": "fadeOut 0.2s ease-in-out forwards",
        "view-enter-right": "slideInFromRight 0.2s ease-in-out forwards",
        "view-enter-left": "slideInFromLeft 0.2s ease-in-out forwards",
        "view-enter-first": "firstLoad 0.2s ease-in-out forwards",
        "ember-glow": "emberGlow 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
