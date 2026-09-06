import { useEffect, useRef, useState } from 'react';

// IntersectionObserver-driven fade/rise-in — no animation library needed. `delay` staggers
// siblings (e.g. a row of feature cards) without each one needing its own observer timing.
export default function Reveal({ children, delay = 0, style }) {
    const ref = useRef(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShown(true);
                    io.disconnect();
                }
            },
            { threshold: 0.15 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            style={{
                ...style,
                opacity: shown ? 1 : 0,
                transform: shown ? 'translateY(0)' : 'translateY(28px)',
                transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}
