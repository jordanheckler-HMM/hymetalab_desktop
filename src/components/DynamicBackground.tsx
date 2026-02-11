import { useEffect, useRef } from 'react';
import { useStore } from '../store';

const DynamicBackground = () => {
    const dynamicBackground = useStore((s) => s.visualSettings.dynamicBackground);
    const reactiveRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!dynamicBackground) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (reactiveRef.current) {
                const x = ((e.clientX / window.innerWidth) * 100).toFixed(1);
                const y = ((e.clientY / window.innerHeight) * 100).toFixed(1);
                reactiveRef.current.style.setProperty('--mouse-x', `${x}%`);
                reactiveRef.current.style.setProperty('--mouse-y', `${y}%`);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [dynamicBackground]);

    if (!dynamicBackground) return null;

    return (
        <div className="mesh-gradient-bg" aria-hidden="true">
            <div ref={reactiveRef} className="mesh-mouse-reactive" />
        </div>
    );
};

export default DynamicBackground;
