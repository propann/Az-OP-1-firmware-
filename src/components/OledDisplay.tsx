import React, { useEffect, useRef } from 'react';
import { 
  SynthEngineType, 
  SynthParams, 
  EnvelopeParams, 
  FxParams, 
  LfoParams, 
  TapeState, 
  FirmwareModState,
  ScreenMode
} from '../types';
import { audioEngine } from '../audio/engine';

interface OledDisplayProps {
  mode: ScreenMode;
  engine: SynthEngineType;
  synthParams: SynthParams;
  envParams: EnvelopeParams;
  fxParams: FxParams;
  lfoParams: LfoParams;
  tapeState: TapeState;
  modState: FirmwareModState;
  activeNotes: number[];
  bpm: number;
  lastDrumHit?: string;
  isEnvelopeTab?: boolean;
  isBooting?: boolean;
  bootProgress?: number;
  bootMessage?: string;
}

export const OledDisplay: React.FC<OledDisplayProps> = ({
  mode,
  engine,
  synthParams,
  envParams,
  fxParams,
  tapeState,
  modState,
  activeNotes,
  bpm,
  lastDrumHit,
  isEnvelopeTab,
  isBooting,
  bootProgress = 100,
  bootMessage
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // Exact Teenage Engineering OP-1 Color Palette
  const OP1_COLORS = {
    bg: '#000000',
    blue: '#0090ff',     // Encoder 1
    green: '#00d659',    // Encoder 2
    white: '#ffffff',    // Encoder 3
    orange: '#ff5500',   // Encoder 4
    dimBlue: '#004080',
    dimGreen: '#005522',
    dimWhite: '#444444',
    dimOrange: '#802b00',
    gray: '#666666',
    darkGray: '#222222',
    grid: 'rgba(255, 255, 255, 0.05)',
    tapeBrown: '#8B4513'
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();

    const render = (time: number) => {
      const elapsed = (time - startTime) * 0.001;
      phaseRef.current += 0.04;

      // Audio waveform data
      const isAudioActive = activeNotes.length > 0 || tapeState.isPlaying;

      // Clear Black OLED Canvas
      ctx.fillStyle = OP1_COLORS.bg;
      ctx.fillRect(0, 0, 320, 240);

      // Render Display Header (Mode, Preset / Engine Name, Metronome, Battery)
      renderOP1Header(ctx, mode, engine, bpm, modState, isAudioActive);

      // Main Screen Content based on Mode
      if (isBooting) {
        renderBootScreen(ctx, modState, bootProgress, bootMessage || 'INITIALISATION MATÉRIELLE ADSP-BF533...');
      } else if (mode === 'teboot') {
        renderTeBootScreen(ctx, modState);
      } else if (isEnvelopeTab) {
        renderEnvelopeScreen(ctx, envParams, isAudioActive);
      } else if (fxParams.type === 'cwo' && mode === 'synth' && fxParams.enabled) {
        renderCwoScreen(ctx, fxParams, elapsed, isAudioActive);
      } else if (mode === 'synth') {
        renderSynthEngine(ctx, engine, synthParams, elapsed, isAudioActive);
      } else if (mode === 'drum') {
        renderDrumScreen(ctx, lastDrumHit, elapsed);
      } else if (mode === 'tape') {
        renderTapeScreen(ctx, tapeState, elapsed);
      } else if (mode === 'mixer') {
        renderMixerScreen(ctx, tapeState);
      } else {
        renderSynthEngine(ctx, engine, synthParams, elapsed, isAudioActive);
      }

      // Render 4 Encoder Parameter Readouts at the bottom (Blue, Green, White, Orange)
      renderEncoderFooter(ctx, mode, engine, synthParams, envParams, fxParams, tapeState);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mode, engine, synthParams, envParams, fxParams, tapeState, modState, activeNotes, bpm, lastDrumHit, isEnvelopeTab, isBooting, bootProgress, bootMessage]);

  // --- HEADER WITH ICONS AND STATUS ---
  const renderOP1Header = (
    ctx: CanvasRenderingContext2D,
    currentMode: ScreenMode,
    currentEngine: SynthEngineType,
    currentBpm: number,
    mod: FirmwareModState,
    isActive: boolean
  ) => {
    // Mode Label (Top Left)
    ctx.fillStyle = OP1_COLORS.white;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${currentMode.toUpperCase()}`, 12, 16);

    ctx.fillStyle = OP1_COLORS.gray;
    ctx.fillText(`// ${currentEngine.toUpperCase()}`, 65, 16);

    // BPM & Metronome Pulse (Center)
    const isBlink = Math.floor(Date.now() / (60000 / currentBpm)) % 2 === 0;
    ctx.fillStyle = isBlink ? OP1_COLORS.orange : OP1_COLORS.gray;
    ctx.beginPath();
    ctx.arc(175, 13, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = OP1_COLORS.white;
    ctx.fillText(`${currentBpm} BPM`, 185, 16);

    // Battery / Firmware Tag (Top Right)
    ctx.fillStyle = mod.unlockIterSynth ? OP1_COLORS.green : OP1_COLORS.gray;
    ctx.textAlign = 'right';
    ctx.fillText(`FW ${mod.baseVersion}`, 308, 16);

    // Top Divider Line
    ctx.strokeStyle = OP1_COLORS.darkGray;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 22);
    ctx.lineTo(310, 22);
    ctx.stroke();
  };

  // --- 4 ENCODER BOTTOM FOOTER ---
  const renderEncoderFooter = (
    ctx: CanvasRenderingContext2D,
    currentMode: ScreenMode,
    currentEngine: SynthEngineType,
    synth: SynthParams,
    env: EnvelopeParams,
    fx: FxParams,
    tape: TapeState
  ) => {
    const y = 228;
    const colW = 75;
    const startX = 12;

    let p1 = { val: synth.blue, label: 'P1' };
    let p2 = { val: synth.green, label: 'P2' };
    let p3 = { val: synth.white, label: 'P3' };
    let p4 = { val: synth.orange, label: 'P4' };

    if (currentMode === 'synth') {
      if (currentEngine === 'drwave') {
        p1 = { val: synth.blue, label: 'FREQ' };
        p2 = { val: synth.green, label: 'FORM' };
        p3 = { val: synth.white, label: 'CHOP' };
        p4 = { val: synth.orange, label: 'WAVE' };
      } else if (currentEngine === 'iter') {
        p1 = { val: synth.blue, label: 'CELL' };
        p2 = { val: synth.green, label: 'FEED' };
        p3 = { val: synth.white, label: 'CUT' };
        p4 = { val: synth.orange, label: 'RES' };
      } else if (currentEngine === 'fm') {
        p1 = { val: synth.blue, label: 'RATIO' };
        p2 = { val: synth.green, label: 'DEPTH' };
        p3 = { val: synth.white, label: 'BRIGHT' };
        p4 = { val: synth.orange, label: 'ENV' };
      } else if (currentEngine === 'string') {
        p1 = { val: synth.blue, label: 'NOISE' };
        p2 = { val: synth.green, label: 'TUNE' };
        p3 = { val: synth.white, label: 'DAMP' };
        p4 = { val: synth.orange, label: 'PLUCK' };
      } else if (currentEngine === 'pulse') {
        p1 = { val: synth.blue, label: 'WIDTH' };
        p2 = { val: synth.green, label: 'DETUNE' };
        p3 = { val: synth.white, label: 'CUT' };
        p4 = { val: synth.orange, label: 'RES' };
      } else if (currentEngine === 'digital') {
        p1 = { val: synth.blue, label: 'CRUSH' };
        p2 = { val: synth.green, label: 'RING' };
        p3 = { val: synth.white, label: 'CUT' };
        p4 = { val: synth.orange, label: 'RES' };
      }
    } else if (currentMode === 'tape' || currentMode === 'mixer') {
      p1 = { val: tape.tracks[0].volume, label: 'TRK 1' };
      p2 = { val: tape.tracks[1].volume, label: 'TRK 2' };
      p3 = { val: tape.tracks[2].volume, label: 'TRK 3' };
      p4 = { val: tape.tracks[3].volume, label: 'TRK 4' };
    }

    // Bottom Divider Line
    ctx.strokeStyle = OP1_COLORS.darkGray;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 205);
    ctx.lineTo(310, 205);
    ctx.stroke();

    const items = [
      { color: OP1_COLORS.blue, ...p1 },
      { color: OP1_COLORS.green, ...p2 },
      { color: OP1_COLORS.white, ...p3 },
      { color: OP1_COLORS.orange, ...p4 },
    ];

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';

    items.forEach((it, i) => {
      const cx = startX + i * colW;
      
      // Color Dot
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(cx + 4, y - 9, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label & Value
      ctx.fillStyle = OP1_COLORS.gray;
      ctx.fillText(it.label, cx + 12, y - 6);

      ctx.fillStyle = it.color;
      ctx.fillText(`${it.val}%`, cx + 12, y + 5);
    });
  };

  // --- SYNTH ENGINE SCREENS ---
  const renderSynthEngine = (
    ctx: CanvasRenderingContext2D,
    currentEngine: SynthEngineType,
    params: SynthParams,
    elapsed: number,
    isActive: boolean
  ) => {
    const cx = 160;
    const cy = 115;

    switch (currentEngine) {
      case 'drwave': {
        // Authentic Dr. Wave: Ocean Waves + Sailor in Boat with Formant Mouth
        ctx.strokeStyle = OP1_COLORS.blue;
        ctx.lineWidth = 2.5;

        // Ocean Wave Horizon
        ctx.beginPath();
        for (let x = 10; x <= 310; x += 5) {
          const waveHeight = 8 + (params.orange / 100) * 14;
          const y = 140 + Math.sin(x * 0.04 + elapsed * 3) * waveHeight * (isActive ? 1.3 : 0.8);
          if (x === 10) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Sailor Boat
        const boatY = 130 + Math.sin(elapsed * 3) * 5;
        ctx.fillStyle = OP1_COLORS.orange;
        ctx.beginPath();
        ctx.moveTo(cx - 28, boatY);
        ctx.lineTo(cx + 28, boatY);
        ctx.lineTo(cx + 18, boatY + 16);
        ctx.lineTo(cx - 18, boatY + 16);
        ctx.closePath();
        ctx.fill();

        // Sailor Body & Head
        ctx.fillStyle = OP1_COLORS.white;
        ctx.beginPath();
        ctx.arc(cx, boatY - 14, 9, 0, Math.PI * 2);
        ctx.fill();

        // Sailor Hat
        ctx.fillStyle = OP1_COLORS.blue;
        ctx.fillRect(cx - 12, boatY - 25, 24, 6);

        // Vocal Formant Mouth opening
        const mouthOpen = 2 + (params.blue / 100) * 6 + (isActive ? 4 : 0);
        ctx.fillStyle = OP1_COLORS.bg;
        ctx.beginPath();
        ctx.ellipse(cx, boatY - 12, 3.5, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sound Waves radiating from mouth
        if (isActive) {
          ctx.strokeStyle = OP1_COLORS.green;
          ctx.lineWidth = 1.5;
          for (let r = 12; r <= 32; r += 8) {
            ctx.beginPath();
            ctx.arc(cx, boatY - 12, r, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
          }
        }
        break;
      }

      case 'iter': {
        // Authentic ITER: Cellular Multi-Bubbles & DNA Helix
        ctx.strokeStyle = OP1_COLORS.green;
        ctx.lineWidth = 2;
        const count = 4 + Math.floor((params.blue / 100) * 6);
        const radius = 25 + (params.white / 100) * 35;

        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + elapsed * (1 + params.green / 50);
          const bx = cx + Math.cos(angle) * radius;
          const by = cy + Math.sin(angle) * (radius * 0.6);
          const bRadius = 6 + (params.orange / 100) * 10 * (isActive ? 1.4 : 1.0);

          ctx.fillStyle = i % 2 === 0 ? OP1_COLORS.blue : OP1_COLORS.orange;
          ctx.beginPath();
          ctx.arc(bx, by, bRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Connective filaments
          ctx.strokeStyle = OP1_COLORS.gray;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        // Center Nucleus
        ctx.fillStyle = OP1_COLORS.white;
        ctx.beginPath();
        ctx.arc(cx, cy, 10 + (isActive ? 4 : 0), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'fm': {
        // Authentic FM: 3D Wireframe Polyhedron
        const vertices = 6;
        const r = 40 + (params.green / 100) * 25;
        ctx.strokeStyle = OP1_COLORS.orange;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= vertices; i++) {
          const a = (i / vertices) * Math.PI * 2 + elapsed * (1 + params.blue / 40);
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * (r * 0.7);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Inner polygon
        ctx.strokeStyle = OP1_COLORS.green;
        ctx.beginPath();
        for (let i = 0; i <= vertices; i++) {
          const a = (i / vertices) * Math.PI * 2 - elapsed * 1.5;
          const px = cx + Math.cos(a) * (r * 0.5);
          const py = cy + Math.sin(a) * (r * 0.35);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      }

      case 'string': {
        // Authentic String: 4 Plucked Strings Vibrating
        for (let s = 0; s < 4; s++) {
          const sy = 65 + s * 28;
          ctx.strokeStyle = [OP1_COLORS.blue, OP1_COLORS.green, OP1_COLORS.white, OP1_COLORS.orange][s];
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(30, sy);
          const damp = params.white / 100;
          const pluckAmp = isActive ? (16 - s * 2) * (1 - damp * 0.5) : 1;
          const freqMultiplier = (s + 1) * 2;
          for (let x = 30; x <= 290; x += 10) {
            const vy = sy + Math.sin((x / 260) * Math.PI * freqMultiplier + elapsed * 14) * pluckAmp * Math.sin((x - 30) / 260 * Math.PI);
            ctx.lineTo(x, vy);
          }
          ctx.stroke();
        }
        break;
      }

      case 'pulse': {
        // Authentic Pulse: Square Wave with Pulse-Width Visualizer
        ctx.strokeStyle = OP1_COLORS.orange;
        ctx.lineWidth = 2.5;
        const duty = 0.1 + (params.blue / 100) * 0.8;
        const period = 50;
        ctx.beginPath();
        for (let x = 20; x <= 300; x += period) {
          const highW = period * duty;
          const lowW = period * (1 - duty);
          ctx.moveTo(x, cy - 30);
          ctx.lineTo(x + highW, cy - 30);
          ctx.lineTo(x + highW, cy + 30);
          ctx.lineTo(x + highW + lowW, cy + 30);
          ctx.lineTo(x + highW + lowW, cy - 30);
        }
        ctx.stroke();
        break;
      }

      case 'digital':
      default: {
        // Digital Wavefolding Staircase
        ctx.strokeStyle = OP1_COLORS.blue;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const steps = 16;
        for (let i = 0; i < steps; i++) {
          const sx = 30 + (i / steps) * 260;
          const fold = (params.blue / 100) * 30;
          const sy = cy + ((i % 2 === 0 ? -1 : 1) * (25 + fold)) * (isActive ? 1.2 : 0.8);
          if (i === 0) ctx.moveTo(sx, sy);
          else {
            ctx.lineTo(sx, sy);
            ctx.lineTo(sx + 260 / steps, sy);
          }
        }
        ctx.stroke();

        ctx.fillStyle = OP1_COLORS.orange;
        ctx.fillRect(cx - 15, cy - 15, 30, 30);
        break;
      }
    }
  };

  // --- ENVELOPE (ADSR) SCREEN ---
  const renderEnvelopeScreen = (
    ctx: CanvasRenderingContext2D,
    env: EnvelopeParams,
    isActive: boolean
  ) => {
    ctx.fillStyle = OP1_COLORS.white;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENVELOPE // ADSR', 160, 48);

    const startX = 35;
    const baseY = 175;
    const peakY = 65;
    const totalW = 250;

    const aW = Math.max(10, (env.attack / 100) * (totalW * 0.25));
    const dW = Math.max(10, (env.decay / 100) * (totalW * 0.3));
    const sW = totalW * 0.25;
    const rW = Math.max(10, (env.release / 100) * (totalW * 0.2));
    const sLevel = baseY - (env.sustain / 100) * (baseY - peakY);

    const pA = { x: startX + aW, y: peakY };
    const pD = { x: pA.x + dW, y: sLevel };
    const pS = { x: pD.x + sW, y: sLevel };
    const pR = { x: pS.x + rW, y: baseY };

    // Solid Fill Area
    ctx.fillStyle = 'rgba(0, 144, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(startX, baseY);
    ctx.lineTo(pA.x, pA.y);
    ctx.lineTo(pD.x, pD.y);
    ctx.lineTo(pS.x, pS.y);
    ctx.lineTo(pR.x, pR.y);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = isActive ? OP1_COLORS.orange : OP1_COLORS.blue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, baseY);
    ctx.lineTo(pA.x, pA.y);
    ctx.lineTo(pD.x, pD.y);
    ctx.lineTo(pS.x, pS.y);
    ctx.lineTo(pR.x, pR.y);
    ctx.stroke();

    // 4 Nodes
    [pA, pD, pS, pR].forEach((pt, idx) => {
      const nodeColors = [OP1_COLORS.blue, OP1_COLORS.green, OP1_COLORS.white, OP1_COLORS.orange];
      ctx.fillStyle = nodeColors[idx];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // --- CWO EFFECT SCREEN (ICONIC COW) ---
  const renderCwoScreen = (
    ctx: CanvasRenderingContext2D,
    fx: FxParams,
    elapsed: number,
    isActive: boolean
  ) => {
    ctx.fillStyle = OP1_COLORS.white;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CWO DELAY EFFECT', 160, 48);

    const cx = 160;
    const cy = 115;
    const chewOffset = Math.sin(elapsed * 8) * (isActive ? 4 : 2);

    // Cable going into cow's mouth
    ctx.strokeStyle = OP1_COLORS.blue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(25, cy + 20);
    ctx.bezierCurveTo(70, cy + 50, 110, cy - 20, cx - 15, cy + 10 + chewOffset);
    ctx.stroke();

    // Cow Body
    ctx.fillStyle = OP1_COLORS.orange;
    ctx.fillRect(cx - 25, cy - 15, 50, 35);

    // Cow Horns
    ctx.fillStyle = OP1_COLORS.white;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 15);
    ctx.lineTo(cx - 30, cy - 28);
    ctx.lineTo(cx - 15, cy - 20);
    ctx.moveTo(cx + 20, cy - 15);
    ctx.lineTo(cx + 30, cy - 28);
    ctx.lineTo(cx + 15, cy - 20);
    ctx.fill();

    // Cow Eyes
    ctx.fillStyle = OP1_COLORS.green;
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 2, 3.5, 0, Math.PI * 2);
    ctx.arc(cx + 10, cy - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Chewing Mouth
    ctx.fillStyle = OP1_COLORS.bg;
    ctx.fillRect(cx - 12, cy + 12 + chewOffset, 24, 6 + Math.abs(chewOffset));
  };

  // --- TAPE SCREEN (2 ROTATING REELS & 4 TRACKS) ---
  const renderTapeScreen = (
    ctx: CanvasRenderingContext2D,
    tape: TapeState,
    elapsed: number
  ) => {
    // 2 Large Rotating Tape Reels
    const reelLeftX = 85;
    const reelRightX = 235;
    const reelY = 85;
    const reelR = 38;

    const rotation = tape.isPlaying ? (elapsed * 2 * tape.speed) : 0;

    [reelLeftX, reelRightX].forEach((rx, idx) => {
      // Outer Rim
      ctx.strokeStyle = OP1_COLORS.white;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(rx, reelY, reelR, 0, Math.PI * 2);
      ctx.stroke();

      // Brown Tape Fill
      ctx.fillStyle = '#6e3c1b';
      ctx.beginPath();
      ctx.arc(rx, reelY, reelR - 5, 0, Math.PI * 2);
      ctx.fill();

      // 3 Center Spokes
      ctx.strokeStyle = OP1_COLORS.white;
      ctx.lineWidth = 2;
      for (let s = 0; s < 3; s++) {
        const spokeAngle = rotation + (s * (Math.PI * 2 / 3));
        ctx.beginPath();
        ctx.moveTo(rx, reelY);
        ctx.lineTo(rx + Math.cos(spokeAngle) * (reelR - 4), reelY + Math.sin(spokeAngle) * (reelR - 4));
        ctx.stroke();
      }

      // Center Hub
      ctx.fillStyle = OP1_COLORS.orange;
      ctx.beginPath();
      ctx.arc(rx, reelY, 9, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4 Tracks Waveform Visualizer
    const trackY = 135;
    const trackH = 14;

    for (let t = 0; t < 4; t++) {
      const ty = trackY + t * (trackH + 3);
      const isSel = tape.selectedTrack === t + 1;

      ctx.fillStyle = isSel ? 'rgba(255, 85, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(15, ty, 290, trackH);

      // Track Number Label
      ctx.fillStyle = isSel ? OP1_COLORS.orange : OP1_COLORS.gray;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`T${t + 1}`, 20, ty + 10);

      // Simulated Waveform Bars
      ctx.fillStyle = isSel ? OP1_COLORS.orange : OP1_COLORS.blue;
      for (let x = 40; x < 290; x += 4) {
        const h = Math.sin((x + t * 20) * 0.1) * 4 + 5;
        ctx.fillRect(x, ty + (trackH - h) / 2, 2, h);
      }
    }

    // Playhead Line
    const playX = 40 + ((tape.playheadPosition % 30) / 30) * 250;
    ctx.strokeStyle = OP1_COLORS.white;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playX, 130);
    ctx.lineTo(playX, 195);
    ctx.stroke();
  };

  // --- MIXER SCREEN (4 FADERS & VU METERS) ---
  const renderMixerScreen = (
    ctx: CanvasRenderingContext2D,
    tape: TapeState
  ) => {
    ctx.fillStyle = OP1_COLORS.white;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('4-TRACK MIXER & GAIN', 160, 42);

    const faderW = 45;
    const startX = 35;

    for (let i = 0; i < 4; i++) {
      const fx = startX + i * 65;
      const vol = tape.tracks[i].volume;
      const colors = [OP1_COLORS.blue, OP1_COLORS.green, OP1_COLORS.white, OP1_COLORS.orange];

      // Fader Track Background
      ctx.fillStyle = OP1_COLORS.darkGray;
      ctx.fillRect(fx + 18, 60, 8, 120);

      // Active Level Fill
      const fillH = (vol / 100) * 120;
      ctx.fillStyle = colors[i];
      ctx.fillRect(fx + 18, 60 + 120 - fillH, 8, fillH);

      // Fader Knob Cap
      ctx.fillStyle = OP1_COLORS.white;
      ctx.fillRect(fx + 12, 60 + 120 - fillH - 4, 20, 8);

      // Label & Vol %
      ctx.fillStyle = OP1_COLORS.gray;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`CH ${i + 1}`, fx + 22, 195);
    }
  };

  // --- DRUM SAMPLER SCREEN ---
  const renderDrumScreen = (
    ctx: CanvasRenderingContext2D,
    lastHit: string | undefined,
    elapsed: number
  ) => {
    ctx.fillStyle = OP1_COLORS.white;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DRUM SAMPLER // 24 SLICES', 160, 48);

    // 24 Slice Grid
    const startX = 30;
    const startY = 70;
    const cellW = 30;
    const cellH = 24;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        const idx = r * 8 + c;
        const x = startX + c * (cellW + 3);
        const y = startY + r * (cellH + 4);

        const isHit = lastHit === `PAD ${idx + 1}`;
        ctx.fillStyle = isHit ? OP1_COLORS.orange : OP1_COLORS.darkGray;
        ctx.fillRect(x, y, cellW, cellH);

        ctx.strokeStyle = isHit ? OP1_COLORS.white : OP1_COLORS.gray;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW, cellH);

        ctx.fillStyle = isHit ? OP1_COLORS.white : OP1_COLORS.gray;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${idx + 1}`, x + cellW / 2, y + 15);
      }
    }
  };

  // --- OFFICIAL BOOT SCREEN ---
  const renderBootScreen = (
    ctx: CanvasRenderingContext2D,
    mod: FirmwareModState,
    progress: number,
    message: string
  ) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 320, 240);

    const cx = 160;
    const cy = 70;

    // Outer Circle
    ctx.strokeStyle = OP1_COLORS.blue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Tape Symbol
    ctx.fillStyle = OP1_COLORS.orange;
    ctx.beginPath();
    ctx.arc(cx - 10, cy, 7, 0, Math.PI * 2);
    ctx.arc(cx + 10, cy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Boot Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TEENAGE ENGINEERING OP-1', cx, 120);

    ctx.fillStyle = OP1_COLORS.green;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`FIRMWARE v${mod.baseVersion}`, cx, 138);

    // Progress Bar
    const barX = 35;
    const barY = 165;
    const barW = 250;
    const barH = 10;

    ctx.strokeStyle = OP1_COLORS.blue;
    ctx.strokeRect(barX, barY, barW, barH);

    const fillW = Math.max(4, Math.min(barW, (progress / 100) * barW));
    ctx.fillStyle = OP1_COLORS.blue;
    ctx.fillRect(barX, barY, fillW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${message} (${Math.round(progress)}%)`, barX, 195);
  };

  // --- TE-BOOT SCREEN ---
  const renderTeBootScreen = (
    ctx: CanvasRenderingContext2D,
    mod: FirmwareModState
  ) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 320, 240);

    ctx.fillStyle = OP1_COLORS.orange;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('[ TE-BOOT v1.02.4 / BOOTLOADER ]', 20, 30);

    ctx.strokeStyle = OP1_COLORS.orange;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 38);
    ctx.lineTo(300, 38);
    ctx.stroke();

    const options = [
      '1. FLASH FIRMWARE (op1_243.op1)',
      '2. VERIFY ANTI-BRICK CHECKSUM CRC32',
      '3. FORMAT INTERNAL FLASH MEMORY',
      '4. RUN ADSP-BF533 DIAGNOSTICS',
      '5. BOOT OP-1 RUNTIME'
    ];

    ctx.fillStyle = OP1_COLORS.white;
    ctx.font = '9px monospace';
    options.forEach((opt, i) => {
      ctx.fillText(opt, 25, 65 + i * 22);
    });

    ctx.fillStyle = OP1_COLORS.green;
    ctx.fillText('PRESS [1-5] OR USE ROTARY ENCODER', 25, 195);
  };

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={240}
      className="w-full h-full block rounded-lg shadow-inner bg-black"
    />
  );
};
