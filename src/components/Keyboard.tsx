import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface KeyboardProps {
  onNoteOn: (note: number, velocity?: number) => void;
  onNoteOff: (note: number) => void;
  activeNotes: number[];
  octave: number;
  onOctaveChange: (octave: number) => void;
  onPitchBend?: (semitones: number) => void;
  onKeyMatrixChange?: (keyIndex: number, pressed: boolean) => void;
}

interface OP1KeyDef {
  midiNoteOffset: number;
  noteName: string;
  isBlackKey: boolean;
  code: string;
  fallbackLabel: string;
  gridCol: number;
}

// Adapté du clavier avancé de propann/Engineering-Studio. event.code désigne
// une position physique : le jeu reste cohérent en AZERTY comme en QWERTY.
const WHITE_CODES = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'KeyQ', 'KeyW', 'KeyE', 'KeyR'];
const BLACK_CODES = ['KeyS', 'KeyD', 'KeyG', 'KeyH', 'KeyJ', 'KeyL', 'Semicolon', 'Digit2', 'Digit3', 'Digit5'];
const WHITE_OFFSETS = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23];
const BLACK_OFFSETS = [1, 3, 5, 8, 10, 13, 15, 17, 20, 22];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const KEYS: OP1KeyDef[] = [
  ...WHITE_OFFSETS.map((offset, index) => ({
    midiNoteOffset: offset,
    noteName: NOTE_NAMES[(5 + offset) % 12],
    isBlackKey: false,
    code: WHITE_CODES[index],
    fallbackLabel: WHITE_CODES[index].replace('Key', '').replace('Comma', ',').replace('Period', '.').replace('Slash', '/'),
    gridCol: index + 1,
  })),
  ...BLACK_OFFSETS.map((offset, index) => ({
    midiNoteOffset: offset,
    noteName: NOTE_NAMES[(5 + offset) % 12],
    isBlackKey: true,
    code: BLACK_CODES[index],
    fallbackLabel: BLACK_CODES[index].replace('Key', '').replace('Digit', '').replace('Semicolon', ';'),
    gridCol: WHITE_OFFSETS.indexOf(offset - 1) + 1,
  })),
];

export const Keyboard: React.FC<KeyboardProps> = ({
  onNoteOn, onNoteOff, activeNotes, octave, onOctaveChange,
  onPitchBend, onKeyMatrixChange,
}) => {
  const [velocity, setVelocity] = useState(100);
  const [pitchBend, setPitchBend] = useState(0);
  const [layoutLabels, setLayoutLabels] = useState<Record<string, string>>({});
  const heldCodes = useRef(new Map<string, { note: number; keyIndex: number }>());
  const heldPointers = useRef(new Map<number, { note: number; keyIndex: number }>());
  const rootMidi = 53 + (octave - 3) * 12;
  const keys = useMemo(() => KEYS.map((key) => ({ ...key, midi: rootMidi + key.midiNoteOffset })), [rootMidi]);
  const byCode = useMemo(() => new Map(keys.map((key, index) => [key.code, { ...key, keyIndex: index }])), [keys]);

  const noteOn = useCallback((note: number, keyIndex: number, eventVelocity = velocity) => {
    onNoteOn(note, Math.max(1, Math.min(127, Math.round(eventVelocity))));
    onKeyMatrixChange?.(keyIndex, true);
  }, [onKeyMatrixChange, onNoteOn, velocity]);

  const noteOff = useCallback((note: number, keyIndex: number) => {
    onNoteOff(note);
    onKeyMatrixChange?.(keyIndex, false);
  }, [onKeyMatrixChange, onNoteOff]);

  const panic = useCallback(() => {
    const released = new Set<number>();
    for (const held of [...heldCodes.current.values(), ...heldPointers.current.values()]) {
      if (!released.has(held.keyIndex)) noteOff(held.note, held.keyIndex);
      released.add(held.keyIndex);
    }
    for (const note of activeNotes) onNoteOff(note);
    heldCodes.current.clear();
    heldPointers.current.clear();
    onPitchBend?.(0);
    setPitchBend(0);
  }, [activeNotes, noteOff, onNoteOff, onPitchBend]);

  useEffect(() => {
    const keyboard = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
    if (!keyboard?.getLayoutMap) return;
    let active = true;
    void keyboard.getLayoutMap().then((map) => {
      if (!active) return;
      const labels: Record<string, string> = {};
      for (const key of KEYS) labels[key.code] = (map.get(key.code) || key.fallbackLabel).toUpperCase();
      setLayoutLabels(labels);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const key = byCode.get(event.code);
      if (key && !heldCodes.current.has(event.code)) {
        event.preventDefault();
        heldCodes.current.set(event.code, { note: key.midi, keyIndex: key.keyIndex });
        noteOn(key.midi, key.keyIndex);
      } else if (event.code === 'ArrowUp') {
        event.preventDefault(); onOctaveChange(Math.min(5, octave + 1));
      } else if (event.code === 'ArrowDown') {
        event.preventDefault(); onOctaveChange(Math.max(1, octave - 1));
      } else if (event.code === 'Escape') panic();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const held = heldCodes.current.get(event.code);
      if (!held) return;
      heldCodes.current.delete(event.code);
      noteOff(held.note, held.keyIndex);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', panic);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', panic);
    };
  }, [byCode, noteOff, noteOn, octave, onOctaveChange, panic]);

  const pointerDown = (event: React.PointerEvent<SVGGElement>, note: number, keyIndex: number) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pressureVelocity = event.pressure > 0 ? 1 + event.pressure * 126 : velocity;
    heldPointers.current.set(event.pointerId, { note, keyIndex });
    noteOn(note, keyIndex, pressureVelocity);
  };
  const pointerUp = (event: React.PointerEvent<SVGGElement>) => {
    const held = heldPointers.current.get(event.pointerId);
    if (!held) return;
    heldPointers.current.delete(event.pointerId);
    noteOff(held.note, held.keyIndex);
  };

  const whiteKeys = keys.filter((key) => !key.isBlackKey);
  const blackKeys = keys.filter((key) => key.isBlackKey);

  return (
    <div className="flex flex-col gap-2 select-none w-full max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#b8bfcf] bg-[#eef1f6] px-3 py-2 text-[10px] font-bold text-neutral-600">
        <label className="flex items-center gap-2">VÉLOCITÉ
          <input aria-label="Vélocité" type="range" min="1" max="127" value={velocity} onChange={(event) => setVelocity(Number(event.target.value))} />
          <span className="font-mono text-neutral-900">{velocity}</span>
        </label>
        <label className="flex items-center gap-2">PITCH
          <input aria-label="Pitch bend" type="range" min="-2" max="2" step="0.1" value={pitchBend} onChange={(event) => { const value = Number(event.target.value); setPitchBend(value); onPitchBend?.(value); }} onPointerUp={() => { setPitchBend(0); onPitchBend?.(0); }} />
          <span className="w-8 font-mono text-neutral-900">{pitchBend.toFixed(1)}</span>
        </label>
        <button type="button" onClick={panic} className="rounded-lg bg-red-600 px-3 py-1 text-white shadow" title="Escape">PANIC</button>
        <span className="ml-auto text-emerald-700">● AUDIO + MATRICE BF524</span>
      </div>

      <div className="relative h-44 w-full overflow-hidden rounded-3xl border-2 border-[#b8bfcf] bg-[#d5d9e2] p-2 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] touch-none">
        <svg viewBox="0 0 1400 240" className="h-full w-full" role="group" aria-label="Clavier OP-1 avancé 24 touches">
          {whiteKeys.map((key, index) => {
            const keyIndex = keys.indexOf(key); const active = activeNotes.includes(key.midi); const x = index * 100 + 5;
            return <g key={key.code} role="button" tabIndex={0} aria-label={`${key.noteName}, touche ${layoutLabels[key.code] || key.fallbackLabel}`} onPointerDown={(event) => pointerDown(event, key.midi, keyIndex)} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
              <rect x={x} y="70" width="90" height="155" rx="28" fill={active ? '#0284c7' : '#fcfdfe'} stroke={active ? '#0369a1' : '#94a3b8'} strokeWidth="4" />
              <circle cx={x + 45} cy="145" r="27" fill={active ? '#38bdf8' : '#e5e7eb'} stroke="#94a3b8" strokeWidth="2" />
              <text x={x + 45} y="197" textAnchor="middle" fontSize="18" fontWeight="700" fill={active ? '#fff' : '#1e293b'}>{key.noteName}</text>
              <text x={x + 45} y="218" textAnchor="middle" fontSize="13" fill={active ? '#dbeafe' : '#64748b'}>[{layoutLabels[key.code] || key.fallbackLabel}]</text>
            </g>;
          })}
          {blackKeys.map((key) => {
            const keyIndex = keys.indexOf(key); const active = activeNotes.includes(key.midi); const x = key.gridCol * 100 - 27;
            return <g key={key.code} role="button" tabIndex={0} aria-label={`${key.noteName}, touche ${layoutLabels[key.code] || key.fallbackLabel}`} onPointerDown={(event) => pointerDown(event, key.midi, keyIndex)} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
              <rect x={x} y="8" width="54" height="105" rx="24" fill={active ? '#ea580c' : '#242936'} stroke={active ? '#fb923c' : '#111827'} strokeWidth="4" />
              <text x={x + 27} y="53" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">{key.noteName}</text>
              <text x={x + 27} y="77" textAnchor="middle" fontSize="11" fill="#cbd5e1">[{layoutLabels[key.code] || key.fallbackLabel}]</text>
            </g>;
          })}
        </svg>
      </div>
      <div className="text-center text-[10px] text-neutral-500">Positions physiques AZERTY/QWERTY · flèches ↑/↓ : octave · Échap : panic</div>
    </div>
  );
};
