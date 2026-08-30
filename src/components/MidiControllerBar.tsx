import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Sliders, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Play, 
  RefreshCw, 
  Volume2,
  Cpu,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { webMidi } from '../midi/midiManager';
import { MidiDeviceInfo, MidiMessageLog } from '../types';
import { audioEngine } from '../audio/engine';

interface MidiControllerBarProps {
  onNoteTrigger?: (note: number) => void;
  onKnobChange?: (color: 'blue' | 'green' | 'white' | 'orange', value: number) => void;
  compact?: boolean;
}

export const MidiControllerBar: React.FC<MidiControllerBarProps> = ({
  onNoteTrigger,
  onKnobChange,
  compact = false
}) => {
  const [isSupported, setIsSupported] = useState(true);
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [activeDevice, setActiveDevice] = useState<MidiDeviceInfo | null>(null);
  const [logs, setLogs] = useState<MidiMessageLog[]>([]);
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [isActivityFlashing, setIsActivityFlashing] = useState(false);

  useEffect(() => {
    const supported = webMidi.checkSupport();
    setIsSupported(supported);

    // Initialize MIDI on mount
    webMidi.init().then(() => {
      setDevices(webMidi.getDevices());
      setActiveDevice(webMidi.getActiveDevice());
    });

    const unsubDevices = webMidi.onDeviceChange((devs, active) => {
      setDevices(devs);
      setActiveDevice(active);
    });

    const unsubLog = webMidi.onLog((log) => {
      setLogs([...webMidi.getLogs()]);
      setLastActivity(log.formatted);
      setIsActivityFlashing(true);
      setTimeout(() => setIsActivityFlashing(false), 150);
    });

    const unsubCC = webMidi.onCC((cc, val) => {
      const normalized = Math.round((val / 127) * 100);
      if (cc === webMidi.mapping.blueKnobCC || cc === 16) {
        onKnobChange?.('blue', normalized);
      } else if (cc === webMidi.mapping.greenKnobCC || cc === 17) {
        onKnobChange?.('green', normalized);
      } else if (cc === webMidi.mapping.whiteKnobCC || cc === 18) {
        onKnobChange?.('white', normalized);
      } else if (cc === webMidi.mapping.orangeKnobCC || cc === 19) {
        onKnobChange?.('orange', normalized);
      }
    });

    return () => {
      unsubDevices();
      unsubLog();
      unsubCC();
    };
  }, [onKnobChange]);

  const handleDeviceSelect = (id: string) => {
    webMidi.setActiveDevice(id);
    setActiveDevice(webMidi.getActiveDevice());
    audioEngine.playChime('save');
  };

  const handleTestNote = (note: number) => {
    webMidi.triggerVirtualNote(note, 100, 350);
    onNoteTrigger?.(note);
    audioEngine.playChime('save');
  };

  const handleTestCC = (color: 'blue' | 'green' | 'white' | 'orange', cc: number, val: number) => {
    webMidi.triggerVirtualCC(cc, val);
    const normalized = Math.round((val / 127) * 100);
    onKnobChange?.(color, normalized);
    audioEngine.playChime('save');
  };

  return (
    <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5 sm:p-3 shadow-md font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Device Selector & Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                activeDevice
                  ? isActivityFlashing
                    ? 'bg-emerald-300 shadow-sm shadow-emerald-400'
                    : 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span className="font-bold text-neutral-200">
              {activeDevice ? (
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>MIDI: <strong className="text-emerald-400">{activeDevice.name}</strong></span>
                  {activeDevice.isOP1Device && (
                    <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/40">
                      OP-1 HW
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>MIDI En Attente (Mode Virtuel Actif)</span>
                </span>
              )}
            </span>
          </div>

          {/* Device Dropdown if multiple */}
          {devices.length > 0 && (
            <select
              value={activeDevice?.id || ''}
              onChange={(e) => handleDeviceSelect(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-lg px-2.5 py-1 text-xs font-mono focus:border-cyan-500 focus:outline-none"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.isOP1Device ? '★ (TE OP-1)' : ''}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => webMidi.init()}
            title="Rafraîchir les périphériques USB/MIDI"
            className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Live CC Quick Mappings Badge */}
        {!compact && (
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-neutral-400">
            <span className="text-neutral-400">Contrôle Émulateur :</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-600/40 text-blue-400">
              Bleu = CC{webMidi.mapping.blueKnobCC}/16
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-600/40 text-emerald-400">
              Vert = CC{webMidi.mapping.greenKnobCC}/17
            </span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200">
              Blanc = CC{webMidi.mapping.whiteKnobCC}/18
            </span>
            <span className="px-1.5 py-0.5 rounded bg-orange-950/60 border border-orange-600/40 text-orange-400">
              Orange = CC{webMidi.mapping.orangeKnobCC}/19
            </span>
          </div>
        )}

        {/* Right: Quick Virtual Test Buttons & Monitor Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleTestNote(60)} // C4
            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-mono flex items-center gap-1 transition active:scale-95 cursor-pointer"
            title="Tester Note C4 (MIDI #60)"
          >
            <Play className="w-3 h-3 text-cyan-400" />
            <span>Test C4</span>
          </button>

          <button
            onClick={() => handleTestCC('blue', 1, 90)}
            className="px-2 py-1 rounded bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-300 text-[11px] font-mono flex items-center gap-1 transition active:scale-95 cursor-pointer"
            title="Tester rotation encodeur Bleu"
          >
            <span>CC1 Bleu 70%</span>
          </button>

          <button
            onClick={() => setIsMonitorOpen(!isMonitorOpen)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition cursor-pointer ${
              isMonitorOpen
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Moniteur MIDI</span>
            {isMonitorOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expandable Live MIDI Monitor Drawer */}
      {isMonitorOpen && (
        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5 font-bold text-neutral-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Journal des Événements MIDI Entrants en Temps Réel (Latence &lt; 1.5ms)
            </span>
            <span className="text-[10px] text-neutral-500">
              Buffer : {logs.length} messages
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-black border border-neutral-800 font-mono text-[11px] max-h-36 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <div className="text-neutral-600 italic py-2 text-center">
                En attente d'événements MIDI... Jouez sur votre OP-1 matériel ou contrôleur MIDI.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between px-2 py-0.5 rounded ${
                    log.type === 'noteOn'
                      ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500'
                      : log.type === 'noteOff'
                      ? 'bg-neutral-900/40 text-neutral-400 border-l-2 border-neutral-700'
                      : log.type === 'cc'
                      ? 'bg-cyan-950/40 text-cyan-300 border-l-2 border-cyan-500'
                      : 'bg-purple-950/40 text-purple-300 border-l-2 border-purple-500'
                  }`}
                >
                  <span className="text-[10px] text-neutral-500">{log.timestamp}</span>
                  <span className="font-semibold">{log.formatted}</span>
                  <span className="text-[10px] text-neutral-400">Canal {log.channel}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
