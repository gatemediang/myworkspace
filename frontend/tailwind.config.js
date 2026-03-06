/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00a862',
          'green-dark': '#007a47',
          'green-light': '#00d47a',
          blue: '#0d2137',
          'blue-mid': '#0a3d62',
          'blue-light': '#1565c0',
          cyan: '#00c8ff',
          'cyan-dark': '#0099cc',
        },
      },
      fontFamily: {
        display: ['var(--font-orbitron)', 'monospace'],
        body: ['var(--font-rajdhani)', 'sans-serif'],
        mono: ['var(--font-fira-code)', 'monospace'],
      },
      backgroundImage: {
        'circuit': "url('/images/landing_page.png')",
        'grid-pattern': "linear-gradient(rgba(0,168,98,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,168,98,0.05) 1px, transparent 1px)",
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'typing': 'typing 3.5s steps(40, end)',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        glow: { '0%': { boxShadow: '0 0 5px #00a862' }, '100%': { boxShadow: '0 0 20px #00a862, 0 0 40px #00a862' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
}
