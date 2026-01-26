/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'admin-primary': '#2563eb',
        'admin-secondary': '#1e40af',
        'model-primary': '#9333ea',
        'model-secondary': '#7e22ce',
      }
    },
  },
  plugins: [],
}
