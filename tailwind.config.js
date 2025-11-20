/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'google-sans': ['"Google Sans Flex"', 'sans-serif'],
        'plus-jakarta': ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      maxWidth: {
        '8xl': '90rem', // 1440px
      },
      backgroundColor: {
        'page': '#f0f1f2',
      },
    },
  },
  plugins: [],
}

