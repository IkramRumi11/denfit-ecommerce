import React, { useEffect, useRef } from 'react';

const MESSAGE = '📢 Free shipping on orders over ₨5,000';

export default function PromoMarquee(): JSX.Element {
  const textRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement) return;

    let startTime: number | null = null;
    
    // Dynamic duration based on screen size
    const getDuration = () => {
      // Slower for larger screens (20 seconds), faster for mobile (12 seconds)
      return window.innerWidth >= 1024 ? 20000 : 12000;
    };
    
    let duration = getDuration();

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;

      // Map progress to position:
      // 0-0.28: center to right (increased movement)
      // 0.28-0.32: disappear at right (quick fade)
      // 0.32-0.40: hidden (REDUCED from 0.45 to 0.40)
      // 0.40-0.44: emerge from left (quick appear)
      // 0.44-0.72: left to center (increased movement)
      // 0.72-1: hold at center
      
      let left;
      let opacity = 1;

      if (progress < 0.28) {
        // Center to right (0-28%)
        left = 50 + (progress * 178.57); // 50% to 100%+
      } else if (progress < 0.32) {
        // Disappear at right (28-32%)
        left = 100 + ((progress - 0.28) * 250);
        opacity = 1 - ((progress - 0.28) * 25);
      } else if (progress < 0.40) {
        // Hidden (32-40%) - REDUCED from 45% to 40%
        left = -50;
        opacity = 0;
      } else if (progress < 0.44) {
        // Emerge from left (40-44%)
        left = -50 + ((progress - 0.40) * 250);
        opacity = (progress - 0.40) * 25;
      } else if (progress < 0.72) {
        // Left to center (44-72%)
        left = 0 + ((progress - 0.44) * 178.57);
        opacity = 1;
      } else {
        // Hold at center (72-100%)
        left = 50;
        opacity = 1;
      }

      textElement.style.left = `${left}%`;
      textElement.style.opacity = opacity.toString();
      textElement.style.transform = 'translateX(-50%)';

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Update duration on resize
    const handleResize = () => {
      duration = getDuration();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="bg-slate-500 text-white w-full overflow-hidden">
      <div 
        className="relative w-full"
        style={{
          paddingTop: '6px',
          paddingBottom: '6px',
          height: '28px',
        }}
      >
        <div
          ref={textRef}
          className="absolute whitespace-nowrap text-xs sm:text-sm font-medium text-white"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            willChange: 'left, opacity',
          }}
        >
          {MESSAGE}
        </div>
      </div>
    </div>
  );
}