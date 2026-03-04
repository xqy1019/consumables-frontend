/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: { preflight: false }, // 关键：避免与 AntD 冲突
  theme: { extend: {} },
  plugins: [],
}
