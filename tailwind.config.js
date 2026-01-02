/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
        "./shared/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            maxWidth: { 'layout': '524px' },
            screens: { 'layout-max': '524px' },
            spacing: { 'header': '52px', 'bottom-nav': '82px' },
            fontFamily: {
                default: ['var(--default-font)'],
                number: ['var(--number-font)'],
            },
            colors: {
                bitcoin: 'var(--bitcoin-color)',
                background: "hsl(var(--background))",
            },
            height: {
                header: "var(--header-height)",
                navigation: "var(--navigation-height)",
            },
            keyframes: {
                wiggle: {
                    '0%, 100%': { transform: 'rotate(-1.6deg)' },
                    '50%': { transform: 'rotate(1.6deg)' },
                },
                blink: {
                    '0%, 100%': { opacity: '0' },
                    '50%': { opacity: '1' },
                },
                slideInFromRight: {
                    '0%': { transform: 'translateX(8px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideInFromLeft: {
                    '0%': { transform: 'translateX(-8px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                firstLoad: {
                    'from': { opacity: '0' },
                    'to': { opacity: '1' },
                },
                swing: {
                    '0%, 100%': { transform: 'perspective(1000px) rotateY(-8deg)' },
                    '50%': { transform: 'perspective(1000px) rotateY(8deg)' },
                },
            },
            animation: {
                wiggle: 'wiggle 0.36s ease-in-out infinite',
                'blink-gold': 'blink 1.2s infinite ease-in-out',
                "enter-right": "slideInFromRight 0.24s ease-in-out forwards",
                "enter-left": "slideInFromLeft 0.24s ease-in-out forwards",
                "enter-first": "firstLoad 0.24s ease-in-out forwards",
                swing: 'swing 3.2s ease-in-out infinite',
            }
        },
    },
    plugins: [],
}

