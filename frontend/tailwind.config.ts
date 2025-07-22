import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Ensure this is set to 'class'
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "569px", // Custom screen size for smaller devices
        mg: "930px",
        mp: "1043px",
      },
      colors: {
        primary_light: "#8DB8EA",
        podium_light: "#7FA9DB",
        primary_lightest: "#d0e4fb",
      },
    },
    keyframes: {
      slideDown: {
        "0%": { transform: "translateY(-100%)", opacity: "0" },
        "100%": { transform: "translateY(0)", opacity: "1" },
      },
    },
    animation: {
      slideDown: "slideDown 1s ease-out",
    },
  },
  plugins: [],
};

export default config;
