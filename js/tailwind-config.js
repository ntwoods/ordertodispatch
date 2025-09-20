tailwind.config = {
    theme: {
        extend: {
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 2s infinite',
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.6s ease-out',
                'scale-in': 'scaleIn 0.4s ease-out'
            },
            keyframes: {
                float: {
                    '0%, 100': { transform: 'translateY(0px)' },
                    '50': { transform: 'translateY(-10px)' }
                },
                glow: {
                    '0': { boxShadow: '0 0 5px #3b82f6, 0 0 10px #3b82f6, 0 0 15px #3b82f6' },
                    '100': { boxShadow: '0 0 10px #3b82f6, 0 0 20px #3b82f6, 0 0 30px #3b82f6' }
                },
                fadeIn: {
                    '0': { opacity: '0' },
                    '100': { opacity: '1' }
                },
                slideUp: {
                    '0': { transform: 'translateY(20px)', opacity: '0' },
                    '100': { transform: 'translateY(0)', opacity: '1' }
                },
                scaleIn: {
                    '0': { transform: 'scale(0.9)', opacity: '0' },
                    '100': { transform: 'scale(1)', opacity: '1' }
                }
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            }
        }
    }
};
