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
  isEnvelopeTab
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // Theme color palettes
  const getThemePalette = () => {
    switch (modState.oledTheme) {
      case 'cyberpunk':
        return {
          bg: '#05070d',
          primary: '#f43f5e',
          secondary: '#eab308',
          accent: '#06b6d4',
          sub: '#a855f7',
          grid: 'rgba(6, 182, 212, 0.15)',
          text: '#f8fafc'
        };
      case 'neon':
        return {
          bg: '#030712',
          primary: '#22c55e',
          secondary: '#ec4899',
          accent: '#38bdf8',
          sub: '#eab308',
          grid: 'rgba(34, 197, 94, 0.15)',
          text: '#f1f5f9'
        };
      case 'solarized':
        return {
          bg: '#002b36',
          primary: '#268bd2',
          secondary: '#b58900',
          accent: '#2aa198',
          sub: '#cb4b16',
          grid: 'rgba(42, 161, 152, 0.15)',
          text: '#93a1a1'
        };
      case 'inverted':
        return {
          bg: '#f1f5f9',
          primary: '#0f172a',
          secondary: '#ea580c',
          accent: '#2563eb',
          sub: '#475569',
          grid: 'rgba(15, 23, 42, 0.1)',
          text: '#0f172a'
        };
      case 'amber':
        return {
          bg: '#140c02',
          primary: '#f59e0b',
          secondary: '#d97706',
          accent: '#fbbf24',
          sub: '#78350f',
          grid: 'rgba(245, 158, 11, 0.15)',
          text: '#fef3c7'
        };
      case 'classic':
      default:
        return {
          bg: '#07090e',
          primary: '#38bdf8',
          secondary: '#f97316',
          accent: '#4ade80',
          sub: '#cbd5e1',
          grid: 'rgba(255, 255, 255, 0.08)',
          text: '#ffffff'
        };
    }
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
      const theme = getThemePalette();

      // Audio waveform data
      const waveData = audioEngine.getWaveformData();
      const isAudioActive = activeNotes.length > 0 || tapeState.isPlaying;

      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle background grid
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 20; x < canvas.width; x += 20) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = 20; y < canvas.height; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // Top Status Bar
      renderStatusBar(ctx, theme, mode, engine, bpm, tapeState, modState);

      // Main Render Modes
      if (isEnvelopeTab) {
        renderEnvelopeScreen(ctx, theme, envParams, isAudioActive);
      } else if (fxParams.type === 'cwo' && mode === 'synth' && fxParams.enabled) {
        renderCwoScreen(ctx, theme, fxParams, modState.cwoGraphic, elapsed, isAudioActive);
      } else if (mode === 'synth') {
        renderSynthEngine(ctx, theme, engine, synthParams, elapsed, isAudioActive, waveData);
      } else if (mode === 'drum') {
        renderDrumScreen(ctx, theme, lastDrumHit, elapsed);
      } else if (mode === 'tape') {
        renderTapeScreen(ctx, theme, tapeState, elapsed, modState.tapeGraphicInvert);
      } else if (mode === 'mixer') {
        renderMixerScreen(ctx, theme, tapeState, elapsed);
      } else {
        renderSynthEngine(ctx, theme, engine, synthParams, elapsed, isAudioActive, waveData);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mode, engine, synthParams, envParams, fxParams, tapeState, modState, activeNotes, bpm, lastDrumHit, isEnvelopeTab]);

  // --- RENDER HELPERS ---

  const renderStatusBar = (
    ctx: CanvasRenderingContext2D,
    theme: ReturnType<typeof getThemePalette>,
    currentMode: ScreenMode,
    currentEngine: SynthEngineType,
    currentBpm: number,
    tape: TapeState,
    mod: FirmwareModState
  ) => {
    ctx.fillStyle = theme.sub;
    ctx.font = 'bold 9px "Space Mono", monospace';
    ctx.fillText(`${currentMode.toUpperCase()} // ${currentEngine.toUpperCase()}`, 10, 14);

    // BPM & Metronome blink
    ctx.fillStyle = (Math.floor(Date.now() / (60000 / currentBpm)) % 2 === 0) ? theme.secondary : theme.sub;
    ctx.fillText(`• ${currentBpm} BPM`, 160, 14);

    // FW Version tag
    ctx.fillStyle = mod.unlockIterSynth ? theme.accent : theme.sub;
    ctx.fillText(`FW ${mod.baseVersion} [AZ-MOD]`, 235, 14);

    // Divider
    ctx.strokeStyle = theme.grid;
    ctx.beginPath();
    ctx.moveTo(10, 19);
    ctx.lineTo(310, 19);
    ctx.stroke();
  };

  const renderSynthEngine = (
    ctx: CanvasRenderingContext2D,
    theme: ReturnType<typeof getThemePalette>,
    currentEngine: SynthEngineType,
    params: SynthParams,
    elapsed: number,
    isActive: boolean,
    waveData: Uint8Array
  ) => {
    const cx = 160;
    const cy = 125;

    switch (currentEngine) {
      case 'iter': {
        // Unlocked Mod: Cellular / Additive Bubbles & DNA Helix
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        const count = 4 + Math.floor((params.blue / 100) * 6);
        const radius = 25 + (params.white / 100) * 35;

        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + elapsed * (1 + params.green / 50);
          const bx = cx + Math.cos(angle) * radius;
          const by = cy + Math.sin(angle) * (radius * 0.6);
          const bRadius = 6 + (params.orange / 100) * 10 * (isActive ? 1.4 : 1.0);

          ctx.fillStyle = i % 2 === 0 ? theme.primary : theme.accent;
          ctx.beginPath();
          ctx.arc(bx, by, bRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Connective cellular filaments
          ctx.strokeStyle = theme.secondary;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        // Center nucleus
        ctx.fillStyle = theme.secondary;
        ctx.beginPath();
        ctx.arc(cx, cy, 10 + (isActive ? 4 : 0), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`CELL DENSITY: ${params.blue}%`, 15, 215);
        ctx.fillText(`FM FEEDBACK: ${params.green}%`, 165, 215);
        break;
      }

      case 'drwave': {
        // Iconic Dr Wave sailor + ocean waves
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2;

        // Ocean Waves
        ctx.beginPath();
        for (let x = 10; x <= 310; x += 5) {
          const waveHeight = 12 + (params.orange / 100) * 16;
          const y = 145 + Math.sin(x * 0.05 + elapsed * 3) * waveHeight * (isActive ? 1.3 : 0.8);
          if (x === 10) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Dr Wave Boat & Sailor
        const boatY = 135 + Math.sin(elapsed * 3) * 6;
        ctx.fillStyle = theme.secondary;
        ctx.beginPath();
        ctx.moveTo(cx - 25, boatY);
        ctx.lineTo(cx + 25, boatY);
        ctx.lineTo(cx + 15, boatY + 14);
        ctx.lineTo(cx - 15, boatY + 14);
        ctx.closePath();
        ctx.fill();

        // Sailor figure
        ctx.fillStyle = theme.text;
        ctx.beginPath();
        ctx.arc(cx, boatY - 14, 8, 0, Math.PI * 2); // Head
        ctx.fill();

        // Sailor Hat
        ctx.fillStyle = theme.primary;
        ctx.fillRect(cx - 10, boatY - 24, 20, 6);

        // Vocal Formant mouth opening
        const mouthOpen = (params.blue / 100) * 6 + (isActive ? 3 : 1);
        ctx.fillStyle = theme.bg;
        ctx.beginPath();
        ctx.ellipse(cx, boatY - 12, 3, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`VOWEL FORM: ${params.blue}%`, 15, 215);
        ctx.fillText(`WAVE CHOP: ${params.orange}%`, 165, 215);
        break;
      }

      case 'digital': {
        // Wavefolding gritty staircase
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const steps = 16;
        for (let i = 0; i < steps; i++) {
          const sx = 30 + (i / steps) * 260;
          const fold = (params.blue / 100) * 30;
          const sy = cy + ((i % 2 === 0 ? -1 : 1) * (30 + fold)) * (isActive ? 1.2 : 0.8);
          if (i === 0) ctx.moveTo(sx, sy);
          else {
            ctx.lineTo(sx, sy);
            ctx.lineTo(sx + 260 / steps, sy);
          }
        }
        ctx.stroke();

        ctx.fillStyle = theme.secondary;
        ctx.fillRect(cx - 15, cy - 15, 30, 30);
        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`RING MOD: ${params.green}%`, 15, 215);
        ctx.fillText(`BIT RES: ${params.white}%`, 165, 215);
        break;
      }

      case 'fm': {
        // 3D wireframe geometric polygon
        const vertices = 6;
        const r = 40 + (params.green / 100) * 25;
        ctx.strokeStyle = theme.accent;
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
        ctx.strokeStyle = theme.secondary;
        ctx.beginPath();
        for (let i = 0; i <= vertices; i++) {
          const a = (i / vertices) * Math.PI * 2 - elapsed * 1.5;
          const px = cx + Math.cos(a) * (r * 0.5);
          const py = cy + Math.sin(a) * (r * 0.35);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`MOD RATIO: ${(0.5 + (params.blue / 100) * 4.5).toFixed(2)}x`, 15, 215);
        ctx.fillText(`FM INDEX: ${params.green}%`, 165, 215);
        break;
      }

      case 'string': {
        // Vibrating physical strings
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2;
        for (let s = 0; s < 5; s++) {
          const sy = 80 + s * 22;
          ctx.beginPath();
          ctx.moveTo(30, sy);
          const damp = params.white / 100;
          const pluckAmp = isActive ? (15 - s * 2) * (1 - damp * 0.5) : 1;
          const freqMultiplier = (s + 1) * 2;
          for (let x = 30; x <= 290; x += 10) {
            const vy = sy + Math.sin((x / 260) * Math.PI * freqMultiplier + elapsed * 12) * pluckAmp * Math.sin((x - 30) / 260 * Math.PI);
            ctx.lineTo(x, vy);
          }
          ctx.stroke();
        }

        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`NOISE BURST: ${params.blue}%`, 15, 215);
        ctx.fillText(`STRING DAMP: ${params.white}%`, 165, 215);
        break;
      }

      case 'pulse': {
        // Pulse width oscillator visual
        ctx.strokeStyle = theme.accent;
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

        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`PULSE WIDTH: ${Math.round(duty * 100)}%`, 15, 215);
        ctx.fillText(`DETUNE: ${params.green}%`, 165, 215);
        break;
      }

      case 'granular': {
        // Granular Cloud Glitch Particles
        ctx.fillStyle = theme.primary;
        const particleCount = 18 + Math.floor((params.blue / 100) * 24);
        for (let i = 0; i < particleCount; i++) {
          const pAngle = (i / particleCount) * Math.PI * 2 + elapsed * (1 + (params.green / 50));
          const pDist = 15 + Math.sin(elapsed * 4 + i) * (20 + (params.white / 100) * 35);
          const px = cx + Math.cos(pAngle) * pDist;
          const py = cy + Math.sin(pAngle) * (pDist * 0.75);
          const pSize = 2 + (i % 3) * 1.5 * (isActive ? 1.5 : 1);

          ctx.fillStyle = i % 2 === 0 ? theme.accent : theme.secondary;
          ctx.fillRect(px - pSize / 2, py - pSize / 2, pSize, pSize);

          if (i % 4 === 0) {
            ctx.strokeStyle = theme.grid;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
        }
        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`GRAIN DENSITY: ${params.blue}%`, 15, 215);
        ctx.fillText(`GRAIN DETUNE: ${params.green}%`, 165, 215);
        break;
      }

      case 'sidchip': {
        // C64 SID Chip 8-Bit Pixel Matrix
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2;
        const gridCols = 8;
        const gridRows = 5;
        const cellW = 20;
        const cellH = 14;
        const startX = cx - (gridCols * cellW) / 2;
        const startY = cy - (gridRows * cellH) / 2;

        for (let r = 0; r < gridRows; r++) {
          for (let c = 0; c < gridCols; c++) {
            const isLit = ((c + r * 3 + Math.floor(elapsed * 10)) % 5 === 0) || (isActive && (c + r) % 2 === 0);
            ctx.fillStyle = isLit ? theme.secondary : 'rgba(255,255,255,0.05)';
            ctx.fillRect(startX + c * cellW + 2, startY + r * cellH + 2, cellW - 4, cellH - 4);
            ctx.strokeStyle = isLit ? theme.accent : theme.grid;
            ctx.strokeRect(startX + c * cellW + 2, startY + r * cellH + 2, cellW - 4, cellH - 4);
          }
        }
        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`PULSE WIDTH: ${params.blue}%`, 15, 215);
        ctx.fillText(`HARD SYNC: ${params.green}%`, 165, 215);
        break;
      }

      case 'acid303': {
        // TB-303 Diode Ladder Resonance Curve & Accent Pulse
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const curveSteps = 32;
        for (let i = 0; i <= curveSteps; i++) {
          const t = i / curveSteps;
          const x = 30 + t * 260;
          const resonancePeak = Math.exp(-Math.pow((t - 0.45) * 8, 2)) * (params.orange / 100) * 55;
          const y = cy + 25 - (1 - Math.pow(t, 2)) * 30 - resonancePeak * (isActive ? 1.4 : 1.0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = theme.secondary;
        ctx.beginPath();
        ctx.arc(cx - 10, cy - (params.orange / 100) * 20, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`ENV MOD: ${params.green}%`, 15, 215);
        ctx.fillText(`RESONANCE: ${params.orange}%`, 165, 215);
        break;
      }

      case 'bellres': {
        // Modal Resonator Chladni Pattern
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 1.5;
        const rings = 4;
        for (let r = 1; r <= rings; r++) {
          const rad = r * 18 + (params.blue / 100) * 10;
          ctx.beginPath();
          for (let a = 0; a <= Math.PI * 2; a += 0.1) {
            const harmonicWarp = Math.sin(a * 4 + elapsed * 3) * (5 + (params.white / 100) * 8) * (isActive ? 1.3 : 0.6);
            const bx = cx + Math.cos(a) * (rad + harmonicWarp);
            const by = cy + Math.sin(a) * (rad * 0.75 + harmonicWarp);
            if (a === 0) ctx.moveTo(bx, by);
            else ctx.lineTo(bx, by);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`INHARMONIC: ${params.blue}%`, 15, 215);
        ctx.fillText(`MODAL DECAY: ${params.orange}%`, 165, 215);
        break;
      }

      case 'cluster':
      case 'phase':
      default: {
        // Multi-ray oscilloscope
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + elapsed * 0.5;
          const len = 30 + (params.green / 100) * 30 * (isActive ? 1.3 : 1.0);
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        }
        ctx.stroke();

        ctx.fillStyle = theme.text;
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillText(`SPREAD: ${params.green}%`, 15, 215);
        ctx.fillText(`CUTOFF: ${params.white}%`, 165, 215);
        break;
      }
    }

    // Bottom parameter color dots
    const colors = [theme.primary, theme.accent, theme.text, theme.secondary];
    const vals = [params.blue, params.green, params.white, params.orange];
    colors.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(30 + idx * 75, 226, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const renderEnvelopeScreen = (
    ctx: CanvasRenderingContext2D,
    theme: ReturnType<typeof getThemePalette>,
    env: EnvelopeParams,
    isActive: boolean
  ) => {
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 10px "Space Mono", monospace';
    ctx.fillText('ENVELOPE (ADSR)', 115, 45);

    const startX = 40;
    const baseY = 175;
    const peakY = 70;
    const totalW = 240;

    const aW = Math.max(10, (env.attack / 100) * 60);
    const dW = Math.max(10, (env.decay / 100) * 60);
    const sLevel = baseY - (env.sustain / 100) * (baseY - peakY);
    const sW = 60;
    const rW = Math.max(10, (env.release / 100) * 60);

    const pA = { x: startX + aW, y: peakY };
    const pD = { x: pA.x + dW, y: sLevel };
    const pS = { x: pD.x + sW, y: sLevel };
    const pR = { x: pS.x + rW, y: baseY };

    // Fill curve
    ctx.fillStyle = theme.grid;
    ctx.beginPath();
    ctx.moveTo(startX, baseY);
    ctx.lineTo(pA.x, pA.y);
    ctx.lineTo(pD.x, pD.y);
    ctx.lineTo(pS.x, pS.y);
    ctx.lineTo(pR.x, pR.y);
    ctx.closePath();
    ctx.fill();

    // Stroke line
    ctx.strokeStyle = isActive ? theme.secondary : theme.primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, baseY);
    ctx.lineTo(pA.x, pA.y);
    ctx.lineTo(pD.x, pD.y);
    ctx.lineTo(pS.x, pS.y);
    ctx.lineTo(pR.x, pR.y);
    ctx.stroke();

    // Node markers
    [pA, pD, pS, pR].forEach((pt, idx) => {
      const nodeColors = [theme.primary, theme.accent, theme.text, theme.secondary];
      ctx.fillStyle = nodeColors[idx];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = theme.text;
    ctx.font = '8px "Space Mono", monospace';
    ctx.fillText(`ATT: ${env.attack}%`, 25, 215);
    ctx.fillText(`DEC: ${env.decay}%`, 95, 215);
    ctx.fillText(`SUS: ${env.sustain}%`, 165, 215);
    ctx.fillText(`REL: ${env.release}%`, 235, 215);
  };

  const renderCwoScreen = (
    ctx: CanvasRenderingContext2D,
    theme: ReturnType<typeof getThemePalette>,
    fx: FxParams,
    animal: 'cow' | 'moose' | 'cat' | 'shiba',
    elapsed: number,
    isActive: boolean
  ) => {
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 10px "Space Mono", monospace';
    ctx.fillText(`CWO EFFECT // [${animal.toUpperCase()}]`, 85, 45);

    const cx = 160;
    const cy = 120;
    const chewOffset = Math.sin(elapsed * 8) * (isActive ? 4 : 2);

    // Frequency cable going into animal mouth
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, cy + 20);
    ctx.bezierCurveTo(70, cy + 50, 110, cy - 20, cx - 15, cy + 10 + chewOffset);
    ctx.stroke();

    // Animal Rendering
    ctx.fillStyle = theme.secondary;
    if (animal === 'moose') {
      // Moose Antlers & Head
      ctx.fillRect(cx - 20, cy - 15, 40, 35);
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 3;
      // Left Antler
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy - 15);
      ctx.lineTo(cx - 35, cy - 35);
      ctx.lineTo(cx - 20, cy - 45);
      ctx.stroke();
      // Right Antler
      ctx.beginPath();
      ctx.moveTo(cx + 15, cy - 15);
      ctx.lineTo(cx + 35, cy - 35);
      ctx.lineTo(cx + 20, cy - 45);
      ctx.stroke();
    } else if (animal === 'cat') {
      // Cyber Cat Head & Ears
      ctx.fillRect(cx - 20, cy - 10, 40, 30);
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy - 10);
      ctx.lineTo(cx - 10, cy - 28);
      ctx.lineTo(cx, cy - 10);
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 10, cy - 28);
      ctx.lineTo(cx + 20, cy - 10);
      ctx.fill();
    } else if (animal === 'shiba') {
      // Shiba Dog Head
      ctx.fillRect(cx - 22, cy - 12, 44, 32);
      ctx.fillStyle = theme.text;
      ctx.beginPath();
      ctx.arc(cx - 10, cy + 2, 7, 0, Math.PI * 2);
      ctx.arc(cx + 10, cy + 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.secondary;
    } else {
      // Classic OP-1 Cow
      ctx.fillRect(cx - 25, cy - 15, 50, 35);
      // Cow Horns
      ctx.fillStyle = theme.sub;
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy - 15);
      ctx.lineTo(cx - 30, cy - 28);
      ctx.lineTo(cx - 15, cy - 20);
      ctx.moveTo(cx + 20, cy - 15);
      ctx.lineTo(cx + 30, cy - 28);
      ctx.lineTo(cx + 15, cy - 20);
      ctx.fill();
    }

    // Animal Eyes (Blinking / Glowing)
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 2, 3.5, 0, Math.PI * 2);
    ctx.arc(cx + 10, cy - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Animal Chewing Mouth
    ctx.fillStyle = theme.bg;
    ctx.fillRect(cx - 12, cy + 12 + chewOffset, 24, 6 + Math.abs(chewOffset));

    ctx.fillStyle = theme.text;
    ctx.font = '8px "Space Mono", monospace';
    ctx.fillText(`FREQ SHIFT: ${fx.blue}%`, 15, 215);
    ctx.fillText(`RESONANCE: ${fx.green}%`, 95, 215);
    ctx.fillText(`DELAY: ${fx.white}%`, 175, 215);
    ctx.fillText(`WET: ${fx.orange}%`, 245, 215);
  };

  const renderTapeScreen = (
    ctx: CanvasRenderingContext2D,
    theme: ReturnType<typeof getThemePalette>,
    tape: TapeState,
    elapsed: number,
    invert: boolean
  ) => {
    // Tape Reels
    const reelLeftX = 80;
    const reelRightX = 240;
    const reelY = 85;
    const reelR = 34;

    const rotation = tape.isPlaying 
      ? (tape.speed * elapsed * 4) 
      : 0;

    [reelLeftX, reelRightX].forEach((rx, idx) => {
      // Outer Reel
      ctx.strokeStyle = invert ? theme.secondary : theme.sub;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rx, reelY, reelR, 0, Math.PI * 2);
      ctx.stroke();

      // Reel Spokes
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 2;
      for (let s = 0; s < 3; s++) {
        const sa = (s / 3) * Math.PI * 2 + (idx === 0 ? rotation : -rotation);
        ctx.beginPath();
        ctx.moveTo(rx, reelY);
        ctx.lineTo(rx + Math.cos(sa) * reelR, reelY + Math.sin(sa) * reelR);
        ctx.stroke();
      }

      // Center Hub
      ctx.fillStyle = invert ? theme.primary : theme.secondary;
      ctx.beginPath();
      ctx.arc(rx, reelY, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Connecting Magnetic Tape Ribbon
    ctx.strokeStyle = theme.sub;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(reelLeftX, reelY + reelR);
    ctx.lineTo(160, 130);
    ctx.lineTo(reelRightX, reelY + reelR);
    ctx.stroke();

    // 4 Tracks Waveform Area
    const trackH = 12;
    const trackStartY = 142;

    tape.tracks.forEach((track, idx) => {
      const ty = trackStartY + idx * (trackH + 3);
      const isSelected = tape.selectedTrack === idx + 1;

      // Track background ribbon
      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(20, ty, 280, trackH);

      // Track Label
      ctx.fillStyle = isSelected ? theme.primary : theme.sub;
      ctx.font = 'bold 8px "Space Mono", monospace';
      ctx.fillText(`T${idx + 1}`, 7, ty + 9);

      // Waveform simulation
      ctx.strokeStyle = isSelected ? theme.accent : theme.sub;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 20; x < 300; x += 6) {
        const h = (Math.sin(x * 0.1 + idx) * 0.5 + 0.5) * (trackH - 4);
        ctx.moveTo(x, ty + trackH / 2 - h / 2);
        ctx.lineTo(x, ty + trackH / 2 + h / 2);
      }
      ctx.stroke();
    });

    // Playhead Scrubber Line
    const playheadX = 20 + (tape.playheadPosition / tape.tapeLength) * 280;
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, trackStartY - 4);
    ctx.lineTo(playheadX, trackStartY + 4 * (trackH + 3));
    ctx.stroke();

    // Playhead triangle flag
    ctx.fillStyle = theme.secondary;
    ctx.beginPath();
    ctx.moveTo(playheadX - 4, trackStartY - 8);
    ctx.lineTo(playheadX + 4, trackStartY - 8);
    ctx.lineTo(playheadX, trackStartY - 3);
    ctx.closePath();
    ctx.fill();

    // Status readout
    ctx.fillStyle = theme.text;
    ctx.font = '8px "Space Mono", monospace';
    ctx.fillText(`PLAYHEAD: ${tape.playheadPosition.toFixed(1)}s / ${tape.tapeLength}s`, 15, 215);
    ctx.fillText(`SPEED: ${tape.speed}x ${tape.isRecording ? '[REC ●]' : ''}`, 190, 215);
  };

  const renderDrumScreen = (
    ctx: CanvasRenderingContext2D,
    theme: ReturnType<typeof getThemePalette>,
    hit: string | undefined,
    elapsed: number
  ) => {
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 10px "Space Mono", monospace';
    ctx.fillText('DRUM SAMPLER // 8 PADS', 95, 45);

    // 8 Slice Matrix
    const padW = 60;
    const padH = 45;
    const padNames = ['KICK', 'SNARE', 'HAT-C', 'HAT-O', 'CLAP', 'COWBELL', 'LASER', 'TOM'];

    padNames.forEach((name, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const px = 25 + col * (padW + 10);
      const py = 65 + row * (padH + 10);
      const isHit = hit === name || (hit === 'KICK' && idx === 0);

      ctx.fillStyle = isHit ? theme.secondary : 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(px, py, padW, padH);

      ctx.strokeStyle = isHit ? theme.primary : theme.grid;
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, padW, padH);

      ctx.fillStyle = isHit ? theme.bg : theme.text;
      ctx.font = 'bold 8px "Space Mono", monospace';
      ctx.fillText(name, px + 8, py + 26);
    });

    // Sample Waveform Bar at bottom
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 20; x <= 300; x += 4) {
      const h = Math.abs(Math.sin(x * 0.08 + elapsed * 2)) * 18;
      ctx.moveTo(x, 190 - h / 2);
      ctx.lineTo(x, 190 + h / 2);
    }
    ctx.stroke();

    ctx.fillStyle = theme.text;
    ctx.font = '8px "Space Mono", monospace';
    ctx.fillText('DYNAMIC MULTI-SAMPLE ENGINE', 75, 215);
  };

  const renderMixerScreen = (
    ctx: CanvasRenderingContext2D,
    theme: ReturnType<typeof getThemePalette>,
    tape: TapeState,
    elapsed: number
  ) => {
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 10px "Space Mono", monospace';
    ctx.fillText('4-CHANNEL MASTER MIXER', 95, 45);

    // 4 channel faders
    const colW = 55;
    tape.tracks.forEach((t, idx) => {
      const cx = 35 + idx * (colW + 15);
      const faderH = 90;
      const faderY = 70;

      // Track fader track
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(cx + 20, faderY, 6, faderH);

      // Fader cap position
      const capY = faderY + faderH - (t.volume / 100) * faderH;
      ctx.fillStyle = theme.primary;
      ctx.fillRect(cx + 10, capY - 4, 26, 8);

      // Track Label & Volume
      ctx.fillStyle = theme.text;
      ctx.font = '8px "Space Mono", monospace';
      ctx.fillText(`CH ${idx + 1}`, cx + 14, faderY + faderH + 15);
      ctx.fillText(`${t.volume}%`, cx + 14, faderY + faderH + 26);
    });

    ctx.fillStyle = theme.text;
    ctx.font = '8px "Space Mono", monospace';
    ctx.fillText('MASTER COMPRESSOR: ACTIVE', 15, 215);
    ctx.fillText('DRIVE: +3.5dB', 200, 215);
  };

  return (
    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border-2 border-neutral-800 oled-screen shadow-2xl">
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="w-full h-full block"
      />
    </div>
  );
};
