/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      maxWidth: { layout: "524px" },
      screens: { "layout-max": "524px" },
      spacing: { header: "50px", "bottom-nav": "84px" },
      fontFamily: {
        default: ["var(--default-font)"],
        number: ["var(--number-font)"],
      },
      colors: {
        bitcoin: "rgb(var(--bitcoin-rgb) / <alpha-value>)",
        up: "rgb(var(--up-rgb) / <alpha-value>)",
        down: "rgb(var(--down-rgb) / <alpha-value>)",
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
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(320%)" },
        },
        auroraFlow: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        gaugePulse: {
          "0%, 100%": { opacity: "0.45", transform: "scaleX(1)" },
          "50%": { opacity: "1", transform: "scaleX(1.35)" },
        },
        blobDriftA: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(6%, 8%, 0) scale(1.15)" },
        },
        blobDriftB: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1.1)" },
          "50%": { transform: "translate3d(-7%, -6%, 0) scale(0.9)" },
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
        shimmer: "shimmer 2.6s ease-in-out infinite",
        "gauge-pulse": "gaugePulse 1.8s ease-in-out infinite",
        "aurora-flow": "auroraFlow 4s linear infinite",
        "blob-drift-a": "blobDriftA 20s ease-in-out infinite",
        "blob-drift-b": "blobDriftB 24s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
