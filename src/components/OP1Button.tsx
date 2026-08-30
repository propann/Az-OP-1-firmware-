import React from 'react';

export interface OP1ButtonProps {
  id?: string;
  label?: string;
  subLabel?: string;
  variant?: 'white' | 'light-gray' | 'dark' | 'orange' | 'blue' | 'green' | 'red' | 'wood';
  shape?: 'round' | 'rect' | 'small-round' | 'pill';
  isActive?: boolean;
  isLedOn?: boolean;
  ledColor?: 'orange' | 'green' | 'blue' | 'red' | 'white';
  icon?: React.ReactNode;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  title?: string;
  className?: string;
  disabled?: boolean;
  keyBadge?: string;
}

export const OP1Button: React.FC<OP1ButtonProps> = ({
  id,
  label,
  subLabel,
  variant = 'white',
  shape = 'rect',
  isActive = false,
  isLedOn = false,
  ledColor = 'orange',
  icon,
  onClick,
  onMouseDown,
  onMouseUp,
  onTouchStart,
  onTouchEnd,
  title,
  className = '',
  disabled = false,
  keyBadge
}) => {
  // Styles based on physical OP-1 button types
  const getVariantStyles = () => {
    switch (variant) {
      case 'orange':
        return isActive
          ? 'bg-[#ea580c] text-white border-[#c2410c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] translate-y-0.5'
          : 'bg-[#ff6a13] text-white hover:bg-[#ff7b2e] border-[#d85507] shadow-[0_3px_0_#9a3412,0_4px_6px_rgba(0,0,0,0.25)]';
      case 'blue':
        return isActive
          ? 'bg-[#0284c7] text-white border-[#0369a1] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] translate-y-0.5'
          : 'bg-[#0ea5e9] text-white hover:bg-[#38bdf8] border-[#0284c7] shadow-[0_3px_0_#075985,0_4px_6px_rgba(0,0,0,0.25)]';
      case 'green':
        return isActive
          ? 'bg-[#16a34a] text-white border-[#15803d] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] translate-y-0.5'
          : 'bg-[#22c55e] text-white hover:bg-[#4ade80] border-[#16a34a] shadow-[0_3px_0_#166534,0_4px_6px_rgba(0,0,0,0.25)]';
      case 'red':
        return isActive
          ? 'bg-[#dc2626] text-white border-[#b91c1c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] translate-y-0.5'
          : 'bg-[#ef4444] text-white hover:bg-[#f87171] border-[#dc2626] shadow-[0_3px_0_#991b1b,0_4px_6px_rgba(0,0,0,0.25)]';
      case 'dark':
        return isActive
          ? 'bg-[#1f232b] text-[#f8fafc] border-[#111317] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] translate-y-0.5'
          : 'bg-[#2e3440] text-[#d8dee9] hover:bg-[#3b4252] border-[#242933] shadow-[0_3px_0_#14171d,0_4px_6px_rgba(0,0,0,0.3)]';
      case 'light-gray':
        return isActive
          ? 'bg-[#c5c9d4] text-[#111827] border-[#9ca3af] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] translate-y-0.5'
          : 'bg-[#d8dce6] text-[#2e3440] hover:bg-[#e4e7ef] border-[#b0b7c3] shadow-[0_3px_0_#8b93a3,0_4px_5px_rgba(0,0,0,0.15)]';
      case 'white':
      default:
        return isActive
          ? 'bg-[#e2e5eb] text-[#0f172a] border-[#94a3b8] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] translate-y-0.5'
          : 'bg-[#fcfdfe] text-[#1e293b] hover:bg-white border-[#cbd5e1] shadow-[0_3px_0_#94a3b8,0_4px_6px_rgba(0,0,0,0.18)]';
    }
  };

  const getShapeStyles = () => {
    switch (shape) {
      case 'round':
        return 'w-10 h-10 rounded-full flex flex-col items-center justify-center';
      case 'small-round':
        return 'w-7 h-7 rounded-full flex flex-col items-center justify-center text-[10px]';
      case 'pill':
        return 'px-3 py-1.5 rounded-full flex items-center justify-center gap-1.5';
      case 'rect':
      default:
        return 'rounded-xl flex flex-col items-center justify-center p-2 min-h-[38px]';
    }
  };

  const getLedStyle = () => {
    if (!isLedOn) return 'bg-[#3b4252] opacity-40 shadow-none';
    switch (ledColor) {
      case 'green': return 'bg-[#22c55e] shadow-[0_0_8px_#22c55e]';
      case 'blue': return 'bg-[#0ea5e9] shadow-[0_0_8px_#0ea5e9]';
      case 'red': return 'bg-[#ef4444] shadow-[0_0_8px_#ef4444]';
      case 'white': return 'bg-white shadow-[0_0_8px_#ffffff]';
      case 'orange':
      default:
        return 'bg-[#ff6a13] shadow-[0_0_8px_#ff6a13]';
    }
  };

  return (
    <button
      id={id}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      title={title}
      disabled={disabled}
      className={`relative select-none font-mono font-bold transition-all duration-75 active:scale-95 cursor-pointer border ${getShapeStyles()} ${getVariantStyles()} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {/* Optional Integrated LED status dot */}
      {isLedOn !== undefined && (
        <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full transition-all duration-150 ${getLedStyle()}`} />
      )}

      {/* Button Icon or Content */}
      {icon && <div className="pointer-events-none flex items-center justify-center">{icon}</div>}
      
      {/* Main Label */}
      {label && (
        <span className="leading-tight text-center pointer-events-none">
          {label}
        </span>
      )}

      {/* Sub Label */}
      {subLabel && (
        <span className="text-[8px] opacity-70 tracking-tighter leading-none pointer-events-none">
          {subLabel}
        </span>
      )}

      {/* PC Keyboard Shortcut Badge */}
      {keyBadge && (
        <span className="absolute bottom-0.5 right-1 text-[7px] text-neutral-400 opacity-60 font-mono pointer-events-none">
          {keyBadge}
        </span>
      )}
    </button>
  );
};
