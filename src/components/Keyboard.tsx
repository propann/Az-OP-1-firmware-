import React, { useEffect, useState, useRef } from 'react';

interface KeyboardProps {
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  activeNotes: number[];
  octave: number;
  onOctaveChange: (oct: number) => void;
  onPitchBend: (semitones: number) => void;
}

interface WhiteKeyDef {
  name: string;
  semitone: number; // offset from F
  key: string;
  hasSharp?: boolean;
  sharpName?: string;
  sharpSemitone?: number;
  sharpKey?: string;
}

export const Keyboard: React.FC<KeyboardProps> = ({
  onNoteOn,
  onNoteOff,
  activeNotes,
  octave,
  onOctaveChange,
  onPitchBend
}) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // 14 White keys spanning F3 to E5
  const whiteKeyDefs: WhiteKeyDef[] = [
    // Octave 1
    { name: 'F', semitone: 0, key: 'a', hasSharp: true, sharpName: 'F#', sharpSemitone: 1, sharpKey: 'w' },
    { name: 'G', semitone: 2, key: 's', hasSharp: true, sharpName: 'G#', sharpSemitone: 3, sharpKey: 'e' },
    { name: 'A', semitone: 4, key: 'd', hasSharp: true, sharpName: 'A#', sharpSemitone: 5, sharpKey: 'r' },
    { name: 'B', semitone: 6, key: 'f', hasSharp: false },
    { name: 'C', semitone: 7, key: 'g', hasSharp: true, sharpName: 'C#', sharpSemitone: 8, sharpKey: 'y' },
    { name: 'D', semitone: 9, key: 'h', hasSharp: true, sharpName: 'D#', sharpSemitone: 10, sharpKey: 'u' },
    { name: 'E', semitone: 11, key: 'j', hasSharp: false },
    // Octave 2
    { name: 'F', semitone: 12, key: 'k', hasSharp: true, sharpName: 'F#', sharpSemitone: 13, sharpKey: 'o' },
    { name: 'G', semitone: 14, key: 'l', hasSharp: true, sharpName: 'G#', sharpSemitone: 15, sharpKey: 'p' },
    { name: 'A', semitone: 16, key: ';', hasSharp: true, sharpName: 'A#', sharpSemitone: 17, sharpKey: '[' },
    { name: 'B', semitone: 18, key: "'", hasSharp: false },
    { name: 'C', semitone: 19, key: 'z', hasSharp: true, sharpName: 'C#', sharpSemitone: 20, sharpKey: 'x' },
    { name: 'D', semitone: 21, key: 'c', hasSharp: true, sharpName: 'D#', sharpSemitone: 22, sharpKey: 'v' },
    { name: 'E', semitone: 23, key: 'b', hasSharp: false },
  ];

  const rootMidi = 53 + (octave - 3) * 12;

  // Build keyboard map for quick keydown lookup
  const keyToMidiMap: { [key: string]: number } = {};
  whiteKeyDefs.forEach((w) => {
    keyToMidiMap[w.key.toLowerCase()] = rootMidi + w.semitone;
    if (w.hasSharp && w.sharpKey && w.sharpSemitone !== undefined) {
      keyToMidiMap[w.sharpKey.toLowerCase()] = rootMidi + w.sharpSemitone;
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      const midi = keyToMidiMap[k];
      if (midi !== undefined && !pressedKeysRef.current.has(k)) {
        pressedKeysRef.current.add(k);
        onNoteOn(midi);
      } else if (e.key === 'ArrowUp') {
        onOctaveChange(Math.min(5, octave + 1));
      } else if (e.key === 'ArrowDown') {
        onOctaveChange(Math.max(1, octave - 1));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const midi = keyToMidiMap[k];
      if (midi !== undefined && pressedKeysRef.current.has(k)) {
        pressedKeysRef.current.delete(k);
        onNoteOff(midi);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyToMidiMap, octave, onNoteOn, onNoteOff, onOctaveChange]);

  const handleMouseDownOnKey = (midi: number) => {
    setIsMouseDown(true);
    onNoteOn(midi);
  };

  const handleMouseUpOnKey = (midi: number) => {
    onNoteOff(midi);
  };

  const handleMouseEnterKey = (midi: number) => {
    if (isMouseDown) {
      onNoteOn(midi);
    }
  };

  const handleMouseLeaveKey = (midi: number) => {
    if (isMouseDown) {
      onNoteOff(midi);
    }
  };

  return (
    <div 
      className="flex flex-col gap-2 select-none w-full max-w-4xl mx-auto"
      onMouseUp={() => setIsMouseDown(false)}
      onMouseLeave={() => setIsMouseDown(false)}
    >
      {/* Octave & Pitch Bend Controls */}
      <div className="flex items-center justify-between px-3 py-1 bg-neutral-800/60 rounded-md border border-neutral-700/50 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">OCTAVE:</span>
          <button
            id="octave-down"
            onClick={() => onOctaveChange(Math.max(1, octave - 1))}
            className="w-7 h-6 flex items-center justify-center rounded bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-neutral-200 border border-neutral-600 font-bold"
          >
            -
          </button>
          <span className="text-orange-400 font-bold px-1">{octave}</span>
          <button
            id="octave-up"
            onClick={() => onOctaveChange(Math.min(5, octave + 1))}
            className="w-7 h-6 flex items-center justify-center rounded bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-neutral-200 border border-neutral-600 font-bold"
          >
            +
          </button>
          <span className="text-neutral-500 text-[10px] ml-2 hidden sm:inline">(Arrow keys / Keyboard keys: A-W-S-E-D-F...)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="pitch-down"
            onMouseDown={() => onPitchBend(-2)}
            onMouseUp={() => onPitchBend(0)}
            onTouchStart={(e) => { e.preventDefault(); onPitchBend(-2); }}
            onTouchEnd={(e) => { e.preventDefault(); onPitchBend(0); }}
            className="px-2 py-1 rounded bg-neutral-700 active:bg-blue-600 text-neutral-300 border border-neutral-600 font-bold text-[10px]"
          >
            BEND -
          </button>
          <button
            id="pitch-up"
            onMouseDown={() => onPitchBend(2)}
            onMouseUp={() => onPitchBend(0)}
            onTouchStart={(e) => { e.preventDefault(); onPitchBend(2); }}
            onTouchEnd={(e) => { e.preventDefault(); onPitchBend(0); }}
            className="px-2 py-1 rounded bg-neutral-700 active:bg-blue-600 text-neutral-300 border border-neutral-600 font-bold text-[10px]"
          >
            BEND +
          </button>
        </div>
      </div>

      {/* 24-Key Piano Ribbon with Accurate Black Keys Overlay */}
      <div className="relative flex justify-center w-full overflow-x-auto py-1 px-1">
        <div className="relative flex">
          {whiteKeyDefs.map((w, idx) => {
            const whiteMidi = rootMidi + w.semitone;
            const isWhiteActive = activeNotes.includes(whiteMidi);

            const sharpMidi = w.hasSharp && w.sharpSemitone !== undefined ? rootMidi + w.sharpSemitone : null;
            const isSharpActive = sharpMidi !== null && activeNotes.includes(sharpMidi);

            return (
              <div key={idx} className="relative flex">
                {/* White Key */}
                <div
                  id={`white-key-${whiteMidi}`}
                  onMouseDown={() => handleMouseDownOnKey(whiteMidi)}
                  onMouseUp={() => handleMouseUpOnKey(whiteMidi)}
                  onMouseEnter={() => handleMouseEnterKey(whiteMidi)}
                  onMouseLeave={() => handleMouseLeaveKey(whiteMidi)}
                  onTouchStart={(e) => { e.preventDefault(); onNoteOn(whiteMidi); }}
                  onTouchEnd={(e) => { e.preventDefault(); onNoteOff(whiteMidi); }}
                  className={`w-7 sm:w-8 md:w-9 lg:w-10 h-28 sm:h-32 rounded-b-md cursor-pointer flex flex-col justify-between items-center pb-2 pt-1 border-r border-neutral-300 op1-white-key select-none ${
                    idx === 0 ? 'rounded-tl-sm' : ''
                  } ${idx === whiteKeyDefs.length - 1 ? 'rounded-tr-sm' : ''} ${
                    isWhiteActive ? 'is-active !bg-blue-300' : ''
                  }`}
                >
                  <span className="text-[9px] font-mono text-neutral-400 font-bold">
                    {w.key.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-700 font-bold">
                    {w.name}
                  </span>
                </div>

                {/* Overlaid Sharp/Flat Black Key */}
                {w.hasSharp && sharpMidi !== null && w.sharpKey && (
                  <div
                    id={`black-key-${sharpMidi}`}
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDownOnKey(sharpMidi); }}
                    onMouseUp={(e) => { e.stopPropagation(); handleMouseUpOnKey(sharpMidi); }}
                    onMouseEnter={(e) => { e.stopPropagation(); handleMouseEnterKey(sharpMidi); }}
                    onMouseLeave={(e) => { e.stopPropagation(); handleMouseLeaveKey(sharpMidi); }}
                    onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onNoteOn(sharpMidi); }}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onNoteOff(sharpMidi); }}
                    className={`absolute z-20 w-4 sm:w-5 md:w-6 h-18 sm:h-20 rounded-b-md cursor-pointer flex flex-col justify-between items-center pb-1 pt-1 border border-neutral-700 op1-black-key ${
                      isSharpActive ? 'is-active !bg-orange-500' : ''
                    }`}
                    style={{
                      right: 'calc(-1 * (var(--black-key-width, 1.25rem) / 2))',
                      zIndex: 20
                    }}
                  >
                    <span className="text-[8px] font-mono text-neutral-400 font-bold">
                      {w.sharpKey.toUpperCase()}
                    </span>
                    <span className="text-[8px] font-mono text-neutral-200 font-bold">
                      {w.sharpName}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
