import React, { useEffect, useRef, useState } from 'react';
import { TombolaBall } from '../types';
import { Play, Square, Plus, RotateCw } from 'lucide-react';

interface TombolaSequencerProps {
  onTriggerNote: (note: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const TombolaSequencer: React.FC<TombolaSequencerProps> = ({
  onTriggerNote,
  isOpen,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [gravity, setGravity] = useState(0.25);
  const [rotationSpeed, setRotationSpeed] = useState(0.015);
  const [scaleType, setScaleType] = useState<'pentatonic' | 'minor' | 'dorian'>('pentatonic');
  const ballsRef = useRef<TombolaBall[]>([]);
  const angleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Musical scale note banks (MIDI notes)
  const scales = {
    pentatonic: [60, 62, 64, 67, 69, 72, 74, 76], // C Major Pentatonic
    minor: [60, 62, 63, 65, 67, 68, 70, 72],       // C Natural Minor
    dorian: [60, 62, 63, 65, 67, 69, 70, 72]       // C Dorian
  };

  const ballColors = ['#38bdf8', '#f97316', '#4ade80', '#ec4899', '#eab308'];

  useEffect(() => {
    // Initial balls
    ballsRef.current = [
      { x: 120, y: 100, vx: 2, vy: 0, radius: 8, color: ballColors[0], note: 60 },
      { x: 160, y: 120, vx: -2, vy: 1, radius: 8, color: ballColors[1], note: 64 },
      { x: 140, y: 140, vx: 1, vy: -2, radius: 8, color: ballColors[2], note: 67 }
    ];
  }, []);

  const addBall = () => {
    if (ballsRef.current.length >= 6) return;
    const currentScale = scales[scaleType];
    const note = currentScale[ballsRef.current.length % currentScale.length];
    const newBall: TombolaBall = {
      x: 150 + (Math.random() * 20 - 10),
      y: 130 + (Math.random() * 20 - 10),
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      radius: 8,
      color: ballColors[ballsRef.current.length % ballColors.length],
      note
    };
    ballsRef.current.push(newBall);
  };

  const removeBall = () => {
    if (ballsRef.current.length > 1) {
      ballsRef.current.pop();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const polygonSides = 6;
    const polyRadius = 90;

    const updatePhysics = () => {
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, width, height);

      // Rotate cage
      angleRef.current += rotationSpeed;

      // Draw Rotating Hexagon Cage
      const vertices: { x: number; y: number }[] = [];
      for (let i = 0; i < polygonSides; i++) {
        const a = angleRef.current + (i / polygonSides) * Math.PI * 2;
        vertices.push({
          x: cx + Math.cos(a) * polyRadius,
          y: cy + Math.sin(a) * polyRadius
        });
      }

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Render & update balls
      ballsRef.current.forEach((b) => {
        if (isRunning) {
          b.vy += gravity;
          b.x += b.vx;
          b.y += b.vy;

          // Simple circular/polygon boundary bounce test
          const dx = b.x - cx;
          const dy = b.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist + b.radius > polyRadius - 4) {
            // Collision with cage wall
            const normalX = dx / dist;
            const normalY = dy / dist;
            const dot = b.vx * normalX + b.vy * normalY;

            b.vx = (b.vx - 2 * dot * normalX) * 0.85;
            b.vy = (b.vy - 2 * dot * normalY) * 0.85;

            // Position correction
            b.x = cx + normalX * (polyRadius - 4 - b.radius);
            b.y = cy + normalY * (polyRadius - 4 - b.radius);

            // Add slight rotational impulse
            b.vx += -normalY * rotationSpeed * 30;
            b.vy += normalX * rotationSpeed * 30;

            // Trigger synth note!
            onTriggerNote(b.note);
          }
        }

        // Draw Ball
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRunning, gravity, rotationSpeed, onTriggerNote]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">OP-1 Tombola Physics Sequencer</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xs font-mono">
            ✕ CLOSE
          </button>
        </div>

        {/* Canvas */}
        <div className="p-4 flex flex-col items-center">
          <div className="rounded-lg overflow-hidden border border-neutral-800 shadow-inner">
            <canvas ref={canvasRef} width={300} height={240} className="block bg-[#0a0d14]" />
          </div>

          {/* Controls */}
          <div className="w-full grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-neutral-800/40 border border-neutral-700/50">
              <span className="text-neutral-400">GRAVITY:</span>
              <input
                type="range"
                min={0.05}
                max={0.6}
                step={0.05}
                value={gravity}
                onChange={(e) => setGravity(parseFloat(e.target.value))}
                className="w-24 accent-orange-500"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-neutral-800/40 border border-neutral-700/50">
              <span className="text-neutral-400">ROTATION:</span>
              <input
                type="range"
                min={-0.04}
                max={0.04}
                step={0.005}
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                className="w-24 accent-blue-500"
              />
            </div>
          </div>

          <div className="w-full flex items-center justify-between gap-2 mt-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition ${
                  isRunning
                    ? 'bg-red-600 text-white'
                    : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                {isRunning ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                {isRunning ? 'PAUSE' : 'START BOUNCE'}
              </button>
              <button
                onClick={addBall}
                className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700"
              >
                + Ball ({ballsRef.current.length})
              </button>
              <button
                onClick={removeBall}
                className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-xs font-semibold border border-neutral-700"
              >
                - Ball
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
