import React from 'react';
import { TapeState } from '../types';
import { 
  Play, 
  Square, 
  Circle, 
  Rewind, 
  FastForward, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Trash2,
  Gauge
} from 'lucide-react';

interface TapeControlsProps {
  tapeState: TapeState;
  onPlay: () => void;
  onStop: () => void;
  onRecordToggle: () => void;
  onTrackSelect: (trackNum: number) => void;
  onTrackVolumeChange: (trackNum: number, vol: number) => void;
  onTrackMuteToggle: (trackNum: number) => void;
  onSpeedChange: (speed: number) => void;
  onLoopToggle: () => void;
  onClearTrack: (trackNum: number) => void;
  onScrub: (seconds: number) => void;
}

export const TapeControls: React.FC<TapeControlsProps> = ({
  tapeState,
  onPlay,
  onStop,
  onRecordToggle,
  onTrackSelect,
  onTrackMuteToggle,
  onSpeedChange,
  onLoopToggle,
  onClearTrack,
  onScrub
}) => {
  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs font-mono select-none">
      {/* Top Bar: Play, Stop, Rec, Rewind, FF, Loop */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Main Transport */}
        <div className="flex items-center gap-1.5">
          <button
            id="tape-rec-btn"
            onClick={onRecordToggle}
            className={`flex items-center gap-1 px-3 py-1.5 rounded font-bold border transition ${
              tapeState.isRecording
                ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-600/40 animate-pulse'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-red-400'
            }`}
            title="Record (Space + R or click)"
          >
            <Circle className={`w-3.5 h-3.5 ${tapeState.isRecording ? 'fill-white' : 'fill-red-400'}`} />
            REC
          </button>

          <button
            id="tape-play-btn"
            onClick={onPlay}
            className={`flex items-center gap-1 px-3 py-1.5 rounded font-bold border transition ${
              tapeState.isPlaying
                ? 'bg-green-600 border-green-500 text-white shadow-md shadow-green-600/40'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-green-400'
            }`}
            title="Play / Pause"
          >
            <Play className={`w-3.5 h-3.5 ${tapeState.isPlaying ? 'fill-white' : 'fill-green-400'}`} />
            PLAY
          </button>

          <button
            id="tape-stop-btn"
            onClick={onStop}
            className="flex items-center gap-1 px-3 py-1.5 rounded font-bold bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition"
            title="Stop & Return to Start"
          >
            <Square className="w-3.5 h-3.5 fill-neutral-300" />
            STOP
          </button>
        </div>

        {/* Speed & Direction */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSpeedChange(tapeState.speed === -1 ? 1 : -1)}
            className={`px-2 py-1 rounded border text-[10px] font-bold transition ${
              tapeState.speed < 0
                ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            REV
          </button>
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 rounded border text-[10px] font-bold transition ${
                tapeState.speed === s
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {s}x
            </button>
          ))}
          <button
            onClick={onLoopToggle}
            className={`p-1.5 rounded border transition ${
              tapeState.isLooping
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}
            title="Toggle Tape Loop"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4-Track Select & Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {tapeState.tracks.map((t, idx) => {
          const isSelected = tapeState.selectedTrack === idx + 1;
          return (
            <div
              key={idx}
              className={`p-2 rounded-lg border flex flex-col gap-1.5 transition ${
                isSelected
                  ? 'bg-blue-950/40 border-blue-500/60 shadow-sm'
                  : 'bg-neutral-950/60 border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onTrackSelect(idx + 1)}
                  className={`text-xs font-bold px-1.5 py-0.5 rounded transition ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  TRACK {idx + 1}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onTrackMuteToggle(idx + 1)}
                    className={`p-1 rounded transition ${
                      t.muted
                        ? 'text-red-400 bg-red-950/40'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title={t.muted ? 'Unmute' : 'Mute'}
                  >
                    {t.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => onClearTrack(idx + 1)}
                    className="p-1 rounded text-neutral-500 hover:text-red-400 transition"
                    title="Clear recorded track buffer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Waveform status */}
              <div className="h-4 w-full rounded bg-black/50 border border-neutral-800 flex items-center justify-center overflow-hidden">
                {t.recordedBuffer ? (
                  <span className="text-[9px] text-green-400 font-mono">RECORDED ({t.recordedLength.toFixed(1)}s)</span>
                ) : (
                  <span className="text-[9px] text-neutral-600 font-mono">EMPTY</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
