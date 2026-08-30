import React, { useState, useRef, useEffect } from 'react';

interface KnobControlProps {
  color: 'blue' | 'green' | 'white' | 'orange';
  label: string;
  value: number; // 0 - 100
  onChange: (val: number) => void;
  subLabel?: string;
  id?: string;
}

export const KnobControl: React.FC<KnobControlProps> = ({
  color,
  label,
  value,
  onChange,
  subLabel,
  id
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(value);

  // Vibrant, authentic Teenage Engineering color palette
  const colorMap = {
    blue: {
      ring: '#0284c7',
      cap: '#0ea5e9',
      border: '#0369a1',
      shadow: '#0369a1',
      dot: '#ffffff',
      textColor: 'text-sky-500'
    },
    green: {
      ring: '#16a34a',
      cap: '#22c55e',
      border: '#15803d',
      shadow: '#15803d',
      dot: '#ffffff',
      textColor: 'text-emerald-500'
    },
    white: {
      ring: '#e2e8f0',
      cap: '#ffffff',
      border: '#cbd5e1',
      shadow: '#94a3b8',
      dot: '#334155',
      textColor: 'text-neutral-700'
    },
    orange: {
      ring: '#ea580c',
      cap: '#ff6a13',
      border: '#c2410c',
      shadow: '#9a3412',
      dot: '#ffffff',
      textColor: 'text-orange-500'
    },
  };

  const currentTheme = colorMap[color];

  // Rotation: -135deg to +135deg (total 270 degrees)
  const rotationDeg = -135 + (value / 100) * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startValRef.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - e.clientY;
      const step = (deltaY / 140) * 100;
      const newVal = Math.min(100, Math.max(0, Math.round(startValRef.current + step)));
      onChange(newVal);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - e.touches[0].clientY;
      const step = (deltaY / 140) * 100;
      const newVal = Math.min(100, Math.max(0, Math.round(startValRef.current + step)));
      onChange(newVal);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, onChange]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 2 : -2;
    const newVal = Math.min(100, Math.max(0, value + delta));
    onChange(newVal);
  };

  return (
    <div id={id || `knob-${color}`} className="flex flex-col items-center select-none group">
      {/* Physical OP-1 Cylindrical Knob with Outer Recessed Ring */}
      <div
        className="relative w-12 h-12 md:w-14 md:h-14 rounded-full cursor-ns-resize flex items-center justify-center p-1 transition-transform active:scale-95"
        style={{
          backgroundColor: '#d1d6e0',
          boxShadow: isDragging 
            ? `0 0 12px ${currentTheme.ring}88, inset 0 2px 4px rgba(0,0,0,0.35)` 
            : 'inset 0 2px 4px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onWheel={handleWheel}
        title={`${label}: ${value}% (Glisser verticalement ou molette)`}
      >
        {/* Rotating Solid Color Cap with Notch/Indicator */}
        <div
          className="relative w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-transform duration-75 border-2"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            backgroundColor: currentTheme.cap,
            borderColor: currentTheme.border,
            boxShadow: `0 4px 0 ${currentTheme.shadow}, 0 5px 6px rgba(0,0,0,0.25)`
          }}
        >
          {/* Top Indicator Dot / Ridge */}
          <div
            className="absolute top-1.5 w-1.5 h-3 rounded-full"
            style={{
              backgroundColor: currentTheme.dot,
              boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          />

          {/* Center Subtle Dimple */}
          <div className="w-2.5 h-2.5 rounded-full bg-black/10 shadow-inner" />
        </div>
      </div>

      {/* Label and Value */}
      <div className="mt-1 text-center leading-tight">
        <div className="text-[9px] md:text-[10px] font-mono font-bold tracking-tight uppercase text-neutral-600 truncate max-w-[70px]">
          {label}
        </div>
        <div className={`text-[8px] md:text-[9px] font-mono font-black ${currentTheme.textColor}`}>
          {subLabel ? `${subLabel} ` : ''}{value}
        </div>
      </div>
    </div>
  );
};
