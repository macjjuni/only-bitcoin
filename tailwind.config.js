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
        // 한글 본문용. 기본 폰트에 한글 글리프가 없어 시스템 폰트로 폴백되는 것을 막는다.
        pretendard: ["Pretendard", "var(--default-font)"],
        jetbrains: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        bitcoin: "rgb(var(--bitcoin-rgb) / <alpha-value>)",
        up: "rgb(var(--up-rgb) / <alpha-value>)",
        down: "rgb(var(--down-rgb) / <alpha-value>)",
        tether: "rgb(var(--tether-rgb) / <alpha-value>)",
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
        "glow-pulse": {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "1" },
        },
        chatPanelIn: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.92)" },
          "60%": { opacity: "1" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        surgeFlameRise: {
          "0%, 100%": { transform: "translateY(0) scaleX(1) scaleY(1)", opacity: "0.88" },
          "25%": { transform: "translateY(-7%) scaleX(0.9) scaleY(1.2)", opacity: "1" },
          "50%": { transform: "translateY(-2%) scaleX(1.08) scaleY(0.9)", opacity: "0.68" },
          "75%": { transform: "translateY(-9%) scaleX(0.94) scaleY(1.14)", opacity: "0.96" },
        },
        surgeFlameSway: {
          "0%, 100%": { transform: "translateY(0) scaleY(1) skewX(0deg)", opacity: "0.82" },
          "30%": { transform: "translateY(-6%) scaleY(1.24) skewX(-6deg)", opacity: "1" },
          "60%": { transform: "translateY(-1%) scaleY(0.94) skewX(5deg)", opacity: "0.62" },
        },
        surgeFlameLean: {
          "0%, 100%": {
            transform: "translateY(-2%) scaleX(1.04) scaleY(0.96) skewX(3deg)",
            opacity: "0.72",
          },
          "20%": {
            transform: "translateY(-11%) scaleX(0.86) scaleY(1.28) skewX(-5deg)",
            opacity: "1",
          },
          "55%": {
            transform: "translateY(-4%) scaleX(1.12) scaleY(0.86) skewX(7deg)",
            opacity: "0.56",
          },
          "80%": {
            transform: "translateY(-8%) scaleX(0.92) scaleY(1.16) skewX(-2deg)",
            opacity: "0.9",
          },
        },
        surgeEmberRise: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0" },
          "18%": { opacity: "0.95" },
          "100%": { transform: "translateY(-240%) scale(0.35)", opacity: "0" },
        },
        surgeTextFlicker: {
          "0%, 100%": {
            filter: "drop-shadow(0 0 22px rgba(var(--surge-glow-rgb), 0.5))",
          },
          "35%": {
            filter: "drop-shadow(0 0 36px rgba(var(--surge-glow-rgb), 0.95))",
          },
          "65%": {
            filter: "drop-shadow(0 0 26px rgba(var(--surge-glow-rgb), 0.65))",
          },
        },
        chatPanelOut: {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(8px) scale(0.96)" },
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
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "surge-flame": "surgeFlameRise 1.7s ease-in-out infinite",
        "surge-flame-sway": "surgeFlameSway 2s ease-in-out infinite",
        "surge-flame-lean": "surgeFlameLean 2.1s ease-in-out infinite",
        "surge-ember": "surgeEmberRise 2.8s ease-in infinite",
        "surge-text-flicker": "surgeTextFlicker 2.2s ease-in-out infinite",
        "chat-panel-in": "chatPanelIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        "chat-panel-out": "chatPanelOut 0.2s cubic-bezier(0.4, 0, 1, 1) forwards",
        "chat-backdrop-out": "fadeOut 0.2s ease-in-out forwards",
      },
    },
  },
  plugins: [],
};
