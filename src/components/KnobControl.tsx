// ============================================================================
// OP-1 ROTARY ENCODER CONTROLLER - PROGRESSIVE, ULTRA-RESPONSIVE & PHYSICAL
// Continuous high-precision rotation, vertical drag, circular angle tracking,
// velocity acceleration, mouse wheel damping, double-click reset & Shift-fine mode
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface KnobControlProps {
  color: 'blue' | 'green' | 'white' | 'orange';
  label: string;
  value: number; // 0 - 100
  onChange: (val: number) => void;
  subLabel?: string;
  id?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export const KnobControl: React.FC<KnobControlProps> = ({
  color,
  label,
  value,
  onChange,
  subLabel,
  id,
  defaultValue = 50,
  min = 0,
  max = 100,
  step = 1,
  unit = '%'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragMode, setDragMode] = useState<'linear' | 'radial'>('linear');

  const knobRef = useRef<HTMLDivElement | null>(null);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startValueRef = useRef<number>(value);
  const lastAngleRef = useRef<number>(0);
  const rawAccumulatorRef = useRef<number>(value);

  // Vibrant, authentic Teenage Engineering color palette & lighting
  const colorMap = {
    blue: {
      ring: '#0284c7',
      cap: '#0ea5e9',
      border: '#0369a1',
      shadow: '#075985',
      glow: 'rgba(14, 165, 233, 0.45)',
      dot: '#ffffff',
      textColor: 'text-sky-500',
      badgeBg: 'bg-sky-950/80',
      badgeBorder: 'border-sky-500/40',
      accentHex: '#0ea5e9'
    },
    green: {
      ring: '#16a34a',
      cap: '#22c55e',
      border: '#15803d',
      shadow: '#166534',
      glow: 'rgba(34, 197, 94, 0.45)',
      dot: '#ffffff',
      textColor: 'text-emerald-500',
      badgeBg: 'bg-emerald-950/80',
      badgeBorder: 'border-emerald-500/40',
      accentHex: '#22c55e'
    },
    white: {
      ring: '#e2e8f0',
      cap: '#f8fafc',
      border: '#cbd5e1',
      shadow: '#94a3b8',
      glow: 'rgba(255, 255, 255, 0.35)',
      dot: '#1e293b',
      textColor: 'text-neutral-700 dark:text-neutral-300',
      badgeBg: 'bg-neutral-800/80',
      badgeBorder: 'border-neutral-500/40',
      accentHex: '#ffffff'
    },
    orange: {
      ring: '#ea580c',
      cap: '#ff6a13',
      border: '#c2410c',
      shadow: '#9a3412',
      glow: 'rgba(255, 106, 19, 0.45)',
      dot: '#ffffff',
      textColor: 'text-orange-500',
      badgeBg: 'bg-orange-950/80',
      badgeBorder: 'border-orange-500/40',
      accentHex: '#ff6a13'
    },
  };

  const currentTheme = colorMap[color];

  // Normalized value (0.0 to 1.0)
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Continuous Angle: -135deg (min) to +135deg (max) -> 270 degrees total sweep
  const rotationDeg = -135 + normalized * 270;

  // Clamp & quantize helper
  const clampValue = useCallback((raw: number): number => {
    let bounded = Math.max(min, Math.min(max, raw));
    if (step > 0) {
      bounded = Math.round(bounded / step) * step;
    }
    return Math.round(bounded * 10) / 10; // 1 decimal place max for clean float
  }, [min, max, step]);

  // Handle direct Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startValueRef.current = value;
    rawAccumulatorRef.current = value;

    // Check if user clicked on the edge for radial mode, or body for linear mode
    if (e.altKey) {
      setDragMode('radial');
      if (knobRef.current) {
        const rect = knobRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        lastAngleRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      }
    } else {
      setDragMode('linear');
    }
  };

  // Handle Touch Start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragMode('linear');
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      startValueRef.current = value;
      rawAccumulatorRef.current = value;
    }
  };

  // Double click resets to default value
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onChange(defaultValue);
  };

  // Global mousemove/touchmove listener for smooth drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      if (dragMode === 'linear') {
        const deltaY = startPosRef.current.y - e.clientY;
        const deltaX = e.clientX - startPosRef.current.x;

        // Sensitivity modifier (Shift = 10x finer precision, Ctrl/Cmd = 5x faster)
        let sensitivity = 0.55;
        if (e.shiftKey) sensitivity = 0.08;
        if (e.ctrlKey || e.metaKey) sensitivity = 1.8;

        // Combine Y (primary) and X (secondary) drag
        const delta = (deltaY + deltaX * 0.35) * sensitivity;
        const targetVal = startValueRef.current + delta;
        const clamped = clampValue(targetVal);

        if (clamped !== value) {
          onChange(clamped);
        }
      } else if (dragMode === 'radial' && knobRef.current) {
        const rect = knobRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let angleDelta = currentAngle - lastAngleRef.current;

        // Wrap around boundary check
        if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
        if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

        lastAngleRef.current = currentAngle;

        // 270 degrees = (270 * Math.PI / 180) radians = 4.712 rad for 100%
        const valueDelta = (angleDelta / 4.712) * (max - min);
        rawAccumulatorRef.current = Math.max(min, Math.min(max, rawAccumulatorRef.current + valueDelta));
        const clamped = clampValue(rawAccumulatorRef.current);

        if (clamped !== value) {
          onChange(clamped);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaY = startPosRef.current.y - touch.clientY;
      const deltaX = touch.clientX - startPosRef.current.x;

      const sensitivity = 0.5;
      const delta = (deltaY + deltaX * 0.3) * sensitivity;
      const targetVal = startValueRef.current + delta;
      const clamped = clampValue(targetVal);

      if (clamped !== value) {
        onChange(clamped);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('touchcancel', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, dragMode, value, min, max, clampValue, onChange]);

  // Smooth, continuous Wheel event with acceleration & micro-stepping
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Determine wheel delta magnitude
    let stepDelta = 0;
    if (Math.abs(e.deltaY) > 0) {
      // Damped fractional step proportional to wheel velocity
      const velocity = Math.min(Math.abs(e.deltaY), 80) / 30;
      const sign = e.deltaY < 0 ? 1 : -1;
      
      let mult = 1.0;
      if (e.shiftKey) mult = 0.1; // Fine mode
      if (e.ctrlKey || e.metaKey) mult = 4.0; // Fast mode

      stepDelta = sign * (1.2 * velocity * mult);
    }

    const newVal = clampValue(value + stepDelta);
    if (newVal !== value) {
      onChange(newVal);
    }
  };

  return (
    <div 
      id={id || `knob-${color}`} 
      className="flex flex-col items-center select-none group touch-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Physical OP-1 Cylindrical Knob Base with Outer Recessed Socket */}
      <div
        ref={knobRef}
        className="relative w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-full cursor-ns-resize flex items-center justify-center p-1 transition-all active:scale-95 select-none"
        style={{
          backgroundColor: '#cdd3df',
          boxShadow: isDragging 
            ? `0 0 14px ${currentTheme.glow}, inset 0 2px 4px rgba(0,0,0,0.4)` 
            : isHovered
            ? `0 0 8px ${currentTheme.glow}, inset 0 2px 3px rgba(0,0,0,0.25)`
            : 'inset 0 2px 4px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        title={`${label}: ${value}${unit} (Glisser ↕ ou molette, Shift pour précision, double-clic pour réinitialiser)`}
      >
        {/* Circular LED Arc Track around Knob */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-0.5">
          <circle
            cx="50%"
            cy="50%"
            r="44%"
            fill="none"
            stroke="#9ba5b7"
            strokeWidth="1.5"
            strokeDasharray="210"
            strokeDashoffset="52"
            strokeLinecap="round"
            opacity={0.5}
          />
          <circle
            cx="50%"
            cy="50%"
            r="44%"
            fill="none"
            stroke={currentTheme.accentHex}
            strokeWidth="2.5"
            strokeDasharray="210"
            strokeDashoffset={210 - (normalized * 158)}
            strokeLinecap="round"
            className="transition-all duration-75"
            opacity={isDragging || isHovered ? 1 : 0.85}
          />
        </svg>

        {/* Rotating Solid Color Cap with Machined Knurled Bevel */}
        <div
          className="relative w-10 h-10 sm:w-10.5 sm:h-10.5 md:w-11 md:h-11 rounded-full flex items-center justify-center border-2 transition-transform duration-75 will-change-transform"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            backgroundColor: currentTheme.cap,
            borderColor: currentTheme.border,
            boxShadow: `0 3.5px 0 ${currentTheme.shadow}, 0 4px 6px rgba(0,0,0,0.3)`
          }}
        >
          {/* Top Indicator Pip / High-Contrast Optical Marker */}
          <div
            className="absolute top-1 w-1.5 h-3 rounded-full"
            style={{
              backgroundColor: currentTheme.dot,
              boxShadow: '0 1px 2px rgba(0,0,0,0.45)'
            }}
          />

          {/* Center OP-1 Tactile Dimple */}
          <div className="w-2.5 h-2.5 rounded-full bg-black/15 shadow-inner border border-black/5" />
        </div>
      </div>

      {/* Label and Live Dynamic Value */}
      <div className="mt-1 text-center leading-tight flex flex-col items-center">
        <div className="text-[9px] md:text-[10px] font-mono font-bold tracking-tight uppercase text-neutral-600 dark:text-neutral-400 truncate max-w-[76px]">
          {label}
        </div>
        <div className={`text-[8px] md:text-[9px] font-mono font-black ${currentTheme.textColor} flex items-center gap-0.5`}>
          <span>{subLabel ? `${subLabel} ` : ''}{value}</span>
          <span className="text-[7px] opacity-70">{unit}</span>
        </div>
      </div>
    </div>
  );
};
