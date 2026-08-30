import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Play, 
  Square, 
  Circle, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  Scissors,
  Mic,
  Activity,
  Layers,
  Sliders,
  Disc,
  Radio,
  HelpCircle,
  Volume2
} from 'lucide-react';
import { OP1Button } from './OP1Button';

export interface HardwareControllerProps {
  onNoteOn: (note: number, velocity?: number) => void;
  onNoteOff: (note: number) => void;
  activeNotes: number[];
  octave: number;
  onOctaveChange: (octave: number) => void;
  onPitchBend?: (semitones: number) => void;
  onKeyMatrixChange?: (keyIndex: number, pressed: boolean) => void;
  onButtonClick?: (buttonName: string) => void;
  activeMode?: 'synth' | 'drum' | 'tape' | 'mixer';
  onModeChange?: (mode: 'synth' | 'drum' | 'tape' | 'mixer') => void;
}

interface OP1KeyDef {
  midiNoteOffset: number;
  noteName: string;
  isBlackKey: boolean;
  code: string;
  fallbackLabel: string;
  gridCol: number;
}

// Physical key maps for AZERTY/QWERTY
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

export const Keyboard: React.FC<HardwareControllerProps> = ({
  onNoteOn,
  onNoteOff,
  activeNotes,
  octave,
  onOctaveChange,
  onPitchBend,
  onKeyMatrixChange,
  onButtonClick,
  activeMode = 'synth',
  onModeChange
}) => {
  const [velocity, setVelocity] = useState(100);
  const [pitchBend, setPitchBend] = useState(0);
  const [layoutLabels, setLayoutLabels] = useState<Record<string, string>>({});
  const [activeT14, setActiveT14] = useState<number>(1);
  const [activePreset18, setActivePreset18] = useState<number>(1);

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

  const handleButton = (name: string, matrixBit: number) => {
    onKeyMatrixChange?.(matrixBit, true);
    setTimeout(() => onKeyMatrixChange?.(matrixBit, false), 80);
    onButtonClick?.(name);
  };

  const whiteKeys = keys.filter((key) => !key.isBlackKey);
  const blackKeys = keys.filter((key) => key.isBlackKey);

  return (
    <div className="flex flex-col gap-3 select-none w-full max-w-6xl mx-auto">
      
      {/* 1. TOP HARDWARE ROW: 4 Core Modes (Synth/Drum/Tape/Mixer), T1-T4 (1-4) & 1-8 Preset Selector Buttons */}
      <div className="p-3 rounded-2xl bg-[#1e2330] border border-[#343e54] shadow-md flex flex-col gap-2.5">
        
        {/* Row A: Sound Modes & Tape Functions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-700/60 pb-2.5">
          
          {/* Main 4 OP-1 Modes */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-neutral-400 uppercase font-mono mr-1">MODES :</span>
            
            <OP1Button
              id="hw-btn-synth"
              label="SYNTH"
              variant={activeMode === 'synth' ? 'blue' : 'white'}
              shape="pill"
              isLedOn={activeMode === 'synth'}
              ledColor="blue"
              onClick={() => {
                onModeChange?.('synth');
                handleButton('synth_mode', 24);
              }}
              className="text-[11px] font-black px-3 py-1"
              title="Mode Synthétiseur (Touche Synth OP-1)"
            />

            <OP1Button
              id="hw-btn-drum"
              label="DRUM"
              variant={activeMode === 'drum' ? 'green' : 'white'}
              shape="pill"
              isLedOn={activeMode === 'drum'}
              ledColor="green"
              onClick={() => {
                onModeChange?.('drum');
                handleButton('drum_mode', 25);
              }}
              className="text-[11px] font-black px-3 py-1"
              title="Mode Percussions (Touche Drum OP-1)"
            />

            <OP1Button
              id="hw-btn-tape"
              label="TAPE"
              variant={activeMode === 'tape' ? 'orange' : 'white'}
              shape="pill"
              isLedOn={activeMode === 'tape'}
              ledColor="orange"
              onClick={() => {
                onModeChange?.('tape');
                handleButton('tape_mode', 26);
              }}
              className="text-[11px] font-black px-3 py-1"
              title="Mode Enregistreur 4 Pistes (Touche Tape OP-1)"
            />

            <OP1Button
              id="hw-btn-mixer"
              label="MIXER"
              variant={activeMode === 'mixer' ? 'dark' : 'white'}
              shape="pill"
              isLedOn={activeMode === 'mixer'}
              ledColor="white"
              onClick={() => {
                onModeChange?.('mixer');
                handleButton('mixer_mode', 27);
              }}
              className="text-[11px] font-black px-3 py-1"
              title="Mode Mixeur & Master FX (Touche Mixer OP-1)"
            />
          </div>

          {/* Sub-modes: Metronome, Sequencer, Lift, Drop, Split */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <OP1Button
              id="hw-btn-tempo"
              label="METRO"
              variant="white"
              shape="rect"
              onClick={() => handleButton('metro_tempo', 28)}
              className="text-[10px] min-h-[30px] px-2.5 py-0.5"
              title="Tempo / Métronome"
            />
            <OP1Button
              id="hw-btn-seq"
              label="SEQ"
              variant="white"
              shape="rect"
              onClick={() => handleButton('sequencer', 29)}
              className="text-[10px] min-h-[30px] px-2.5 py-0.5"
              title="Séquenceurs Arpeggio / Finger / Tombola"
            />
            <OP1Button
              id="hw-btn-mic"
              label="MIC"
              variant="light-gray"
              shape="rect"
              onClick={() => handleButton('microphone', 30)}
              className="text-[10px] min-h-[30px] px-2.5 py-0.5"
              title="Entrée Microphone / Radio / Line"
            />
            <OP1Button
              id="hw-btn-help"
              label="COM"
              variant="light-gray"
              shape="rect"
              onClick={() => handleButton('help_com', 31)}
              className="text-[10px] min-h-[30px] px-2.5 py-0.5"
              title="Menu Communication & Disque USB"
            />
          </div>
        </div>

        {/* Row B: 1-4 Track/Function Buttons (T1..T4) & 1-8 Sound/Preset Keys */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* 1-4 Track & Sub-page Buttons (T1, T2, T3, T4) */}
          <div className="md:col-span-4 flex items-center gap-2 bg-[#151923] p-2 rounded-xl border border-neutral-800">
            <span className="text-[10px] font-bold text-sky-400 font-mono">PISTES 1-4 :</span>
            <div className="grid grid-cols-4 gap-1.5 flex-1">
              {[1, 2, 3, 4].map((num) => (
                <OP1Button
                  key={`btn-1-4-${num}`}
                  id={`hw-btn-t${num}`}
                  label={`T${num}`}
                  variant={activeT14 === num ? 'blue' : 'white'}
                  isActive={activeT14 === num}
                  shape="rect"
                  onClick={() => {
                    setActiveT14(num);
                    handleButton(`track_${num}`, 32 + num - 1);
                  }}
                  className="text-xs font-black min-h-[34px] p-1"
                  title={`Bouton Piste / Page T${num}`}
                />
              ))}
            </div>
          </div>

          {/* 1-8 Sound Selector & Snapshot Preset Buttons */}
          <div className="md:col-span-8 flex items-center gap-2 bg-[#151923] p-2 rounded-xl border border-neutral-800">
            <span className="text-[10px] font-bold text-amber-400 font-mono">PRESETS 1-8 :</span>
            <div className="grid grid-cols-8 gap-1 flex-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <OP1Button
                  key={`btn-1-8-${num}`}
                  id={`hw-btn-preset-${num}`}
                  label={`${num}`}
                  variant={activePreset18 === num ? 'orange' : 'white'}
                  isActive={activePreset18 === num}
                  shape="rect"
                  onClick={() => {
                    setActivePreset18(num);
                    handleButton(`preset_${num}`, 36 + num - 1);
                  }}
                  className="text-xs font-black min-h-[34px] p-1"
                  title={`Bouton Sonore / Snapshot #${num}`}
                />
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 2. CONTROLLER STRIP: Velocity, Pitch Bend, Octave Shifter & Panic */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b8bfcf] bg-[#eef1f6] px-3 py-2 text-[10px] font-bold text-neutral-700">
        
        {/* Octave Shifter */}
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-500 font-mono">OCTAVE :</span>
          <button
            onClick={() => onOctaveChange(Math.max(1, octave - 1))}
            className="w-6 h-6 rounded-lg bg-neutral-300 hover:bg-neutral-400 text-neutral-800 flex items-center justify-center font-black cursor-pointer shadow-sm active:scale-95"
            title="Octave Inférieure"
          >
            -
          </button>
          <span className="w-8 text-center font-mono font-black text-neutral-900 bg-white px-1.5 py-0.5 rounded border border-neutral-300">
            {octave}
          </span>
          <button
            onClick={() => onOctaveChange(Math.min(5, octave + 1))}
            className="w-6 h-6 rounded-lg bg-neutral-300 hover:bg-neutral-400 text-neutral-800 flex items-center justify-center font-black cursor-pointer shadow-sm active:scale-95"
            title="Octave Supérieure"
          >
            +
          </button>
        </div>

        {/* Velocity Slider */}
        <label className="flex items-center gap-2">
          <span className="text-neutral-500 font-mono">VÉLOCITÉ :</span>
          <input 
            aria-label="Vélocité" 
            type="range" 
            min="1" 
            max="127" 
            value={velocity} 
            onChange={(event) => setVelocity(Number(event.target.value))} 
            className="w-20 accent-sky-600 cursor-pointer"
          />
          <span className="font-mono text-neutral-900 w-7 text-right">{velocity}</span>
        </label>

        {/* Pitch Bend Slider */}
        <label className="flex items-center gap-2">
          <span className="text-neutral-500 font-mono">PITCH BEND :</span>
          <input 
            aria-label="Pitch bend" 
            type="range" 
            min="-2" 
            max="2" 
            step="0.1" 
            value={pitchBend} 
            onChange={(event) => { 
              const val = Number(event.target.value); 
              setPitchBend(val); 
              onPitchBend?.(val); 
            }} 
            onPointerUp={() => { 
              setPitchBend(0); 
              onPitchBend?.(0); 
            }} 
            className="w-20 accent-orange-600 cursor-pointer"
          />
          <span className="w-8 font-mono text-neutral-900 text-right">{pitchBend.toFixed(1)}</span>
        </label>

        {/* Panic Button */}
        <button 
          type="button" 
          onClick={panic} 
          className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1 text-white text-[11px] font-black shadow transition active:scale-95 cursor-pointer" 
          title="Arrêt d'urgence de toutes les notes MIDI (Escape)"
        >
          PANIC
        </button>

        <span className="text-emerald-700 hidden lg:inline-block font-mono">
          ● AUDIO SPORT0 + MATRICE C8051 (IVG9)
        </span>
      </div>

      {/* 3. 24-KEY OP-1 PHYSICAL KEYBED */}
      <div className="relative h-44 w-full overflow-hidden rounded-3xl border-2 border-[#b8bfcf] bg-[#d5d9e2] p-2 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] touch-none">
        <svg viewBox="0 0 1400 240" className="h-full w-full" role="group" aria-label="Clavier OP-1 complet 24 touches">
          {whiteKeys.map((key, index) => {
            const keyIndex = keys.indexOf(key); 
            const active = activeNotes.includes(key.midi); 
            const x = index * 100 + 5;
            return (
              <g 
                key={key.code} 
                role="button" 
                tabIndex={0} 
                aria-label={`${key.noteName}, touche ${layoutLabels[key.code] || key.fallbackLabel}`} 
                onPointerDown={(event) => pointerDown(event, key.midi, keyIndex)} 
                onPointerUp={pointerUp} 
                onPointerCancel={pointerUp}
                className="cursor-pointer"
              >
                <rect 
                  x={x} 
                  y="70" 
                  width="90" 
                  height="155" 
                  rx="28" 
                  fill={active ? '#0284c7' : '#fcfdfe'} 
                  stroke={active ? '#0369a1' : '#94a3b8'} 
                  strokeWidth="4" 
                />
                <circle 
                  cx={x + 45} 
                  cy="145" 
                  r="27" 
                  fill={active ? '#38bdf8' : '#e5e7eb'} 
                  stroke="#94a3b8" 
                  strokeWidth="2" 
                />
                <text 
                  x={x + 45} 
                  y="197" 
                  textAnchor="middle" 
                  fontSize="18" 
                  fontWeight="700" 
                  fill={active ? '#fff' : '#1e293b'}
                >
                  {key.noteName}
                </text>
                <text 
                  x={x + 45} 
                  y="218" 
                  textAnchor="middle" 
                  fontSize="13" 
                  fill={active ? '#dbeafe' : '#64748b'}
                >
                  [{layoutLabels[key.code] || key.fallbackLabel}]
                </text>
              </g>
            );
          })}
          {blackKeys.map((key) => {
            const keyIndex = keys.indexOf(key); 
            const active = activeNotes.includes(key.midi); 
            const x = key.gridCol * 100 - 27;
            return (
              <g 
                key={key.code} 
                role="button" 
                tabIndex={0} 
                aria-label={`${key.noteName}, touche ${layoutLabels[key.code] || key.fallbackLabel}`} 
                onPointerDown={(event) => pointerDown(event, key.midi, keyIndex)} 
                onPointerUp={pointerUp} 
                onPointerCancel={pointerUp}
                className="cursor-pointer"
              >
                <rect 
                  x={x} 
                  y="8" 
                  width="54" 
                  height="105" 
                  rx="24" 
                  fill={active ? '#ea580c' : '#242936'} 
                  stroke={active ? '#fb923c' : '#111827'} 
                  strokeWidth="4" 
                />
                <text 
                  x={x + 27} 
                  y="53" 
                  textAnchor="middle" 
                  fontSize="14" 
                  fontWeight="700" 
                  fill="#fff"
                >
                  {key.noteName}
                </text>
                <text 
                  x={x + 27} 
                  y="77" 
                  textAnchor="middle" 
                  fontSize="11" 
                  fill="#cbd5e1"
                >
                  [{layoutLabels[key.code] || key.fallbackLabel}]
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="text-center text-[10px] text-neutral-500">
        Disposition physique AZERTY/QWERTY • Flèches ↑/↓ : octave • Touches 1-4 (Pistes) & 1-8 (Presets) • Échap : panic
      </div>
    </div>
  );
};
