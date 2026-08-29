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

  // Map colors to vibrant OP-1 encoder aesthetics
  const colorMap = {
    blue: {
      ring: '#3b82f6',
      cap: '#2563eb',
      light: '#60a5fa',
      accent: 'border-blue-500 text-blue-400',
      dot: 'bg-blue-400',
    },
    green: {
      ring: '#22c55e',
      cap: '#16a34a',
      light: '#4ade80',
      accent: 'border-green-500 text-green-400',
      dot: 'bg-green-400',
    },
    white: {
      ring: '#e2e8f0',
      cap: '#cbd5e1',
      light: '#ffffff',
      accent: 'border-slate-300 text-slate-200',
      dot: 'bg-white',
    },
    orange: {
      ring: '#f97316',
      cap: '#ea580c',
      light: '#fb923c',
      accent: 'border-orange-500 text-orange-400',
      dot: 'bg-orange-400',
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
      const step = (deltaY / 150) * 100;
      const newVal = Math.min(100, Math.max(0, Math.round(startValRef.current + step)));
      onChange(newVal);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - e.touches[0].clientY;
      const step = (deltaY / 150) * 100;
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
      {/* Rotary Dial */}
      <div
        className="relative w-12 h-12 md:w-14 md:h-14 rounded-full cursor-ns-resize shadow-md flex items-center justify-center p-1"
        style={{
          background: 'radial-gradient(circle, #2d333b 0%, #1c2128 70%, #161b22 100%)',
          boxShadow: isDragging 
            ? `0 0 12px ${currentTheme.ring}88, inset 0 2px 4px rgba(0,0,0,0.6)` 
            : '0 4px 6px -1px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1)'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onWheel={handleWheel}
        title={`${label}: ${value}% (Drag vertically or scroll)`}
      >
        {/* Outer Ring with active gauge notch */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
            strokeDasharray="85 114"
            strokeDashoffset="-14"
          />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke={currentTheme.ring}
            strokeWidth="3.5"
            strokeDasharray={`${(value / 100) * 85} 114`}
            strokeDashoffset="-14"
            strokeLinecap="round"
          />
        </svg>

        {/* Rotating Cap */}
        <div
          className="relative w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            background: `radial-gradient(circle at 35% 35%, #4b5563, #1f2937 75%, #111827 100%)`,
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.8)'
          }}
        >
          {/* Color Indicator Dot */}
          <div
            className={`absolute top-1.5 w-2 h-2 rounded-full ${currentTheme.dot} shadow-sm`}
            style={{ boxShadow: `0 0 6px ${currentTheme.ring}` }}
          />
        </div>
      </div>

      {/* Label and Value */}
      <div className="mt-1.5 text-center leading-tight">
        <div className="text-[10px] md:text-xs font-bold tracking-wider uppercase text-neutral-300">
          {label}
        </div>
        <div className="text-[9px] font-mono font-semibold" style={{ color: currentTheme.ring }}>
          {subLabel ? `${subLabel} ` : ''}{value}
        </div>
      </div>
    </div>
  );
};
