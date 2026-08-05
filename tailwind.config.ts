import type { Config } from "tailwindcss";

/**
 * CODFEST tactical theme with esports animations.
 * night  -> dark military-green surfaces (#101511 family)
 * ember  -> neon HUD green accents (#71E000 / #8CFD30)
 * zinc   -> overridden to sage/olive text tones so all existing
 *           text-zinc-* usages pick up the tactical palette
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#050706",
          900: "#181D19",
          850: "#1C211D",
          800: "#262B27",
          700: "#3F4A35",
          600: "#313631",
          page: "#101511",
        },
        ember: {
          400: "#8CFD30",
          500: "#93D873",
          600: "#71E000",
          700: "#377200",
          900: "#183800",
        },
        zinc: {
          100: "#F2F5EF",
          200: "#DFE4DD",
          300: "#BECBB0",
          400: "#BECBB0",
          500: "#89957C",
          600: "#5F6B54",
          700: "#3F4A35",
          800: "#262B27",
          900: "#181D19",
        },
        olive: "#89957C",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(113, 224, 0, 0.3)",
        glowLg: "0 0 35px rgba(113, 224, 0, 0.5)",
        glowSm: "0 0 8px rgba(113, 224, 0, 0.6)",
      },
      keyframes: {
        pulseLive: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.92)" },
        },
        radarScan: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "50%": { opacity: "0.7" },
          "100%": { transform: "translateY(1000%)", opacity: "0" },
        },
        sheen: {
          "0%": { transform: "translateX(-150%)" },
          "100%": { transform: "translateX(150%)" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(113, 224, 0, 0.3)" },
          "50%": { borderColor: "rgba(113, 224, 0, 0.8)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        pulseLive: "pulseLive 1.4s ease-in-out infinite",
        radarScan: "radarScan 6s ease-in-out infinite",
        sheen: "sheen 2.5s ease-in-out infinite",
        borderGlow: "borderGlow 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
