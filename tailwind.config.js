module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#171717",
      },
    },
  },
  plugins: [],
  // Prevent Tailwind from using oklch for color
  experimental: {
    optimizeUniversalDefaults: true,
  },
};
