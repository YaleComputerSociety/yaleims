/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Ensure this is set to 'class'
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      }, 
      colors: {
        primary_light: "#8DB8EA",
        podium_light: "#7FA9DB",
      }
    },
  },
  plugins: [],
};
