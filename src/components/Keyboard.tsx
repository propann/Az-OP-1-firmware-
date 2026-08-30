import React, { useEffect, useState, useRef } from 'react';

interface KeyboardProps {
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  activeNotes: number[];
  octave: number;
  onOctaveChange: (oct: number) => void;
  onPitchBend?: (semitones: number) => void;
}

interface OP1KeyDef {
  midiNoteOffset: number; // 0 to 23 (2 octaves, F3 to E5)
  noteName: string;
  isBlackKey: boolean;
  pcKey: string;
  gridCol: number; // 1 to 14
}

export const Keyboard: React.FC<KeyboardProps> = ({
  onNoteOn,
  onNoteOff,
  activeNotes,
  octave,
  onOctaveChange
}) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // OP-1 Keybed has 24 keys: 14 circular white keys and 10 raised circular/pill black keys
  // Range: F to E across 2 octaves (24 notes)
  // Root note F3 is MIDI 53 when octave=3, F4 is 65 when octave=4
  const rootMidi = 53 + (octave - 3) * 12;

  // Exact 24 physical circular keys layout mapping
  const keys: OP1KeyDef[] = [
    // Octave 1 (F to E)
    { midiNoteOffset: 0, noteName: 'F', isBlackKey: false, pcKey: 'a', gridCol: 1 },
    { midiNoteOffset: 1, noteName: 'F#', isBlackKey: true, pcKey: 'w', gridCol: 1 },
    { midiNoteOffset: 2, noteName: 'G', isBlackKey: false, pcKey: 's', gridCol: 2 },
    { midiNoteOffset: 3, noteName: 'G#', isBlackKey: true, pcKey: 'e', gridCol: 2 },
    { midiNoteOffset: 4, noteName: 'A', isBlackKey: false, pcKey: 'd', gridCol: 3 },
    { midiNoteOffset: 5, noteName: 'A#', isBlackKey: true, pcKey: 'r', gridCol: 3 },
    { midiNoteOffset: 6, noteName: 'B', isBlackKey: false, pcKey: 'f', gridCol: 4 },
    { midiNoteOffset: 7, noteName: 'C', isBlackKey: false, pcKey: 'g', gridCol: 5 },
    { midiNoteOffset: 8, noteName: 'C#', isBlackKey: true, pcKey: 'y', gridCol: 5 },
    { midiNoteOffset: 9, noteName: 'D', isBlackKey: false, pcKey: 'h', gridCol: 6 },
    { midiNoteOffset: 10, noteName: 'D#', isBlackKey: true, pcKey: 'u', gridCol: 6 },
    { midiNoteOffset: 11, noteName: 'E', isBlackKey: false, pcKey: 'j', gridCol: 7 },

    // Octave 2 (F to E)
    { midiNoteOffset: 12, noteName: 'F', isBlackKey: false, pcKey: 'k', gridCol: 8 },
    { midiNoteOffset: 13, noteName: 'F#', isBlackKey: true, pcKey: 'o', gridCol: 8 },
    { midiNoteOffset: 14, noteName: 'G', isBlackKey: false, pcKey: 'l', gridCol: 9 },
    { midiNoteOffset: 15, noteName: 'G#', isBlackKey: true, pcKey: 'p', gridCol: 9 },
    { midiNoteOffset: 16, noteName: 'A', isBlackKey: false, pcKey: ';', gridCol: 10 },
    { midiNoteOffset: 17, noteName: 'A#', isBlackKey: true, pcKey: '[', gridCol: 10 },
    { midiNoteOffset: 18, noteName: 'B', isBlackKey: false, pcKey: "'", gridCol: 11 },
    { midiNoteOffset: 19, noteName: 'C', isBlackKey: false, pcKey: 'z', gridCol: 12 },
    { midiNoteOffset: 20, noteName: 'C#', isBlackKey: true, pcKey: 'x', gridCol: 12 },
    { midiNoteOffset: 21, noteName: 'D', isBlackKey: false, pcKey: 'c', gridCol: 13 },
    { midiNoteOffset: 22, noteName: 'D#', isBlackKey: true, pcKey: 'v', gridCol: 13 },
    { midiNoteOffset: 23, noteName: 'E', isBlackKey: false, pcKey: 'b', gridCol: 14 }
  ];

  // Map PC keyboard keys to MIDI notes
  const keyToMidiMap: { [key: string]: number } = {};
  keys.forEach(k => {
    keyToMidiMap[k.pcKey.toLowerCase()] = rootMidi + k.midiNoteOffset;
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

  const handleKeyTrigger = (midi: number) => {
    onNoteOn(midi);
  };

  const handleKeyRelease = (midi: number) => {
    onNoteOff(midi);
  };

  const whiteKeys = keys.filter(k => !k.isBlackKey);
  const blackKeys = keys.filter(k => k.isBlackKey);

  return (
    <div 
      className="flex flex-col items-center select-none w-full max-w-5xl mx-auto"
      onMouseUp={() => setIsMouseDown(false)}
      onMouseLeave={() => setIsMouseDown(false)}
    >
      {/* Authentic OP-1 24 Circular Keys Bed Container */}
      <div className="relative w-full px-2 py-4 rounded-3xl bg-[#d5d9e2] border-2 border-[#b8bfcf] shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] flex flex-col justify-center">
        
        {/* Top Row: 10 Raised Black Keys */}
        <div className="relative h-12 w-full flex justify-center items-center mb-1">
          <div className="w-full max-w-4xl flex justify-between relative px-6">
            {whiteKeys.map((wk, colIdx) => {
              const matchingBlack = blackKeys.find(bk => bk.gridCol === wk.gridCol);
              if (!matchingBlack) {
                // Gap where B/E natural notes have no sharps
                return <div key={`spacer-${colIdx}`} className="w-9 sm:w-11 md:w-13 h-10 pointer-events-none opacity-0" />;
              }

              const midiNote = rootMidi + matchingBlack.midiNoteOffset;
              const isActive = activeNotes.includes(midiNote);

              return (
                <div key={`black-${matchingBlack.midiNoteOffset}`} className="relative flex justify-center w-9 sm:w-11 md:w-13">
                  <button
                    id={`key-black-${midiNote}`}
                    onMouseDown={() => {
                      setIsMouseDown(true);
                      handleKeyTrigger(midiNote);
                    }}
                    onMouseUp={() => handleKeyRelease(midiNote)}
                    onMouseEnter={() => {
                      if (isMouseDown) handleKeyTrigger(midiNote);
                    }}
                    onMouseLeave={() => {
                      if (isMouseDown) handleKeyRelease(midiNote);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleKeyTrigger(midiNote);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleKeyRelease(midiNote);
                    }}
                    className={`w-8 sm:w-10 md:w-11 h-10 sm:h-11 rounded-full flex flex-col items-center justify-center transition-all duration-75 border cursor-pointer active:scale-95 z-20 ${
                      isActive
                        ? 'bg-[#ea580c] text-white border-[#c2410c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_0_12px_#ea580c] translate-y-0.5'
                        : 'bg-[#2b303c] text-[#d8dee9] hover:bg-[#3b4252] border-[#181a20] shadow-[0_4px_0_#14171d,0_5px_8px_rgba(0,0,0,0.35)]'
                    }`}
                    title={`${matchingBlack.noteName} (Touche ${matchingBlack.pcKey.toUpperCase()})`}
                  >
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold leading-tight pointer-events-none">
                      {matchingBlack.noteName}
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-mono text-neutral-400 opacity-60 leading-none pointer-events-none">
                      [{matchingBlack.pcKey.toUpperCase()}]
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Row: 14 White Circular Keys */}
        <div className="relative w-full flex justify-center items-center">
          <div className="w-full max-w-4xl flex justify-between relative px-2">
            {whiteKeys.map((wk) => {
              const midiNote = rootMidi + wk.midiNoteOffset;
              const isActive = activeNotes.includes(midiNote);

              return (
                <div key={`white-${wk.midiNoteOffset}`} className="relative flex justify-center w-9 sm:w-11 md:w-13">
                  <button
                    id={`key-white-${midiNote}`}
                    onMouseDown={() => {
                      setIsMouseDown(true);
                      handleKeyTrigger(midiNote);
                    }}
                    onMouseUp={() => handleKeyRelease(midiNote)}
                    onMouseEnter={() => {
                      if (isMouseDown) handleKeyTrigger(midiNote);
                    }}
                    onMouseLeave={() => {
                      if (isMouseDown) handleKeyRelease(midiNote);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleKeyTrigger(midiNote);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleKeyRelease(midiNote);
                    }}
                    className={`w-9 sm:w-11 md:w-12 h-11 sm:h-13 rounded-full flex flex-col items-center justify-center transition-all duration-75 border cursor-pointer active:scale-95 z-10 ${
                      isActive
                        ? 'bg-[#0284c7] text-white border-[#0369a1] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_0_12px_#0284c7] translate-y-0.5'
                        : 'bg-[#fcfdfe] text-[#1e293b] hover:bg-white border-[#cbd5e1] shadow-[0_4px_0_#94a3b8,0_5px_7px_rgba(0,0,0,0.18)]'
                    }`}
                    title={`${wk.noteName} (Touche ${wk.pcKey.toUpperCase()})`}
                  >
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold leading-tight pointer-events-none">
                      {wk.noteName}
                    </span>
                    <span className="text-[8px] font-mono text-neutral-400 opacity-60 leading-none pointer-events-none">
                      [{wk.pcKey.toUpperCase()}]
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
