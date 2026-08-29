import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Play, 
  Package, 
  Usb, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Trash2, 
  RefreshCw, 
  HardDrive, 
  ShieldCheck, 
  Flame, 
  ArrowRight,
  ExternalLink,
  Save
} from 'lucide-react';
import { FirmwareModState, BuildLogEntry } from '../types';
import { INITIAL_BUILD_LOGS } from '../data/firmwareData';
import { audioEngine } from '../audio/engine';

interface ProductionPipelinePanelProps {
  modState: FirmwareModState;
  setModState: React.Dispatch<React.SetStateAction<FirmwareModState>>;
}

export const ProductionPipelinePanel: React.FC<ProductionPipelinePanelProps> = ({
  modState,
  setModState
}) => {
  const [logs, setLogs] = useState<BuildLogEntry[]>(INITIAL_BUILD_LOGS);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(100);
  const [buildStep, setBuildStep] = useState<string>('Pret pour le reconditionnement');
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);

  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStartRepack = () => {
    setIsBuilding(true);
    setBuildProgress(0);
    setLogs([]);

    const steps = [
      { progress: 15, msg: '[op1repacker v2.4] Décompression de l\'archive source .op1 (LZMA Dictionary 64MB)...', level: 'INFO' as const },
      { progress: 30, msg: `[Injector] Normalisation des graphiques vectoriels OLED (Thème : ${modState.oledTheme.toUpperCase()}, Mascotte : ${modState.cwoGraphic.toUpperCase()})`, level: 'PATCH' as const },
      { progress: 45, msg: `[Injector] Mise à jour du texte d'allumage boot : "${modState.customBootScreenText}"`, level: 'PATCH' as const },
      { progress: 60, msg: `[Database] Compilation de system/OP1_factory.db avec moteur ITER (${modState.unlockIterSynth ? 'ACTIVÉ' : 'OFF'}) et Filter FX (${modState.unlockFilterEffect ? 'ACTIVÉ' : 'OFF'})`, level: 'PATCH' as const },
      { progress: 75, msg: '[Blackfin] Calcul des tables de sauts L1 Instruction SRAM & Hook des 8 moteurs audio DSP', level: 'PATCH' as const },
      { progress: 90, msg: '[LZMA Engine] Compression du conteneur TAR avec compression maximale (Level 9 Ultra)...', level: 'INFO' as const },
      { progress: 100, msg: '[op1repacker] Checksums CRC32 (0xA4F2C991) et SHA-256 recalculés avec succès ! Firmware .op1 prêt au flash.', level: 'SUCCESS' as const }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setBuildProgress(step.progress);
        setBuildStep(step.msg);
        setLogs(prev => [
          ...prev,
          {
            id: `log-${Date.now()}-${idx}`,
            timestamp: new Date().toLocaleTimeString(),
            level: step.level,
            message: step.msg
          }
        ]);

        if (idx === steps.length - 1) {
          setIsBuilding(false);
          audioEngine.playChime('save');
        }
      }, (idx + 1) * 700);
    });
  };

  const handleFlashUsb = () => {
    setIsFlashing(true);
    setFlashProgress(0);
    setFlashSuccess(false);

    const interval = setInterval(() => {
      setFlashProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsFlashing(false);
          setFlashSuccess(true);
          setModState(m => ({ ...m, flashCount: m.flashCount + 1 }));
          audioEngine.playChime('flash');
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleDownloadFirmware = () => {
    const payload = `OP-1 MODDED FIRMWARE CONTAINER\nVersion: ${modState.firmwareVersion}\nBuildDate: ${new Date().toISOString()}\nTheme: ${modState.oledTheme}\nIterUnlock: ${modState.unlockIterSynth}\nChecksum: 0xA4F2C991`;
    const blob = new Blob([payload], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `op1_${modState.firmwareVersion.toLowerCase().replace(/[^a-z0-9]/g, '_')}.op1`;
    a.click();
    URL.revokeObjectURL(url);
    audioEngine.playChime('save');
  };

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div id="production-pipeline-panel" className="space-y-6">
      {/* Top Banner: Build Status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 mb-1">
              <Package className="w-3.5 h-3.5" />
              Chaîne de Production & Build Automatisée
            </span>
            <h2 className="text-xl font-bold font-mono text-zinc-100">
              Reconditionnement & Flash TE-Boot
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Compilez l'ensemble de vos modifications (Mods 1-Clic, DSP Hooks, Graphismes SVG, Base SQLite) en un fichier binaire .op1 installable.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStartRepack}
              disabled={isBuilding}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg text-xs font-semibold font-mono flex items-center gap-2 transition-all shadow-md shadow-cyan-900/30 cursor-pointer disabled:opacity-50"
            >
              <Package className={`w-4 h-4 ${isBuilding ? 'animate-spin' : ''}`} />
              {isBuilding ? 'Reconditionnement...' : 'Reconditionner le Firmware (.op1)'}
            </button>

            <button
              onClick={handleDownloadFirmware}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium font-mono flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              Télécharger .op1
            </button>
          </div>
        </div>

        {/* Build Progress Bar */}
        {isBuilding && (
          <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="truncate max-w-xl text-cyan-300">{buildStep}</span>
              <span className="font-bold text-cyan-400">{buildProgress}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-cyan-500 transition-all duration-300 rounded-full"
                style={{ width: `${buildProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Terminal Console */}
        <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-3 flex flex-col h-[460px]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                Console de Logs (op1repacker Engine)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLogs}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-mono rounded border border-zinc-800 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3 text-cyan-400" />
                {copiedLogs ? 'Copié !' : 'Copier'}
              </button>
              <button
                onClick={() => setLogs([])}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 text-[11px] font-mono rounded border border-zinc-800 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Effacer
              </button>
            </div>
          </div>

          {/* Log Window */}
          <div className="flex-1 bg-black rounded-lg p-4 font-mono text-xs overflow-y-auto space-y-2 border border-zinc-900 text-zinc-300">
            {logs.map((log) => {
              const color = 
                log.level === 'SUCCESS' ? 'text-emerald-400' :
                log.level === 'PATCH' ? 'text-amber-400' :
                log.level === 'HASH' ? 'text-cyan-400' :
                log.level === 'ERROR' ? 'text-red-400' : 'text-zinc-400';

              return (
                <div key={log.id} className="leading-relaxed flex items-start gap-2">
                  <span className="text-zinc-400 select-none">[{log.timestamp}]</span>
                  <span className={`font-semibold ${color}`}>[{log.level}]</span>
                  <span className="text-zinc-200">{log.message}</span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Right Column: USB TE-Boot & Flasher Guide */}
        <div className="lg:col-span-5 space-y-6">
          {/* TE-Boot Step-by-Step Guide */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
              <Usb className="w-4 h-4 text-cyan-400" />
              Guide d'Installation TE-Boot Mode
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                <span className="text-cyan-400 font-bold block">1. Éteindre l'OP-1</span>
                <p className="text-zinc-400 text-[11px]">
                  Basculez l'interrupteur d'alimentation sur OFF.
                </p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                <span className="text-cyan-400 font-bold block">2. Entrer en Mode TE-Boot</span>
                <p className="text-zinc-400 text-[11px]">
                  Maintenez la touche <span className="text-zinc-200 font-bold">[COM]</span> enfoncée et allumez l'OP-1.
                </p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                <span className="text-cyan-400 font-bold block">3. Brancher le Câble USB</span>
                <p className="text-zinc-400 text-[11px]">
                  Appuyez sur la touche <span className="text-zinc-200 font-bold">[7]</span> pour monter le disque amovible "OP-1".
                </p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                <span className="text-cyan-400 font-bold block">4. Glisser le fichier .op1</span>
                <p className="text-zinc-400 text-[11px]">
                  Copiez le firmware à la racine du disque OP-1, éjectez et appuyez sur <span className="text-zinc-200 font-bold">[COM]</span> pour flasher !
                </p>
              </div>
            </div>
          </div>

          {/* Direct Flash Simulation Button */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Flash Direct USB
              </h4>
              <span className="text-[11px] font-mono text-cyan-400">
                Flashes effectués : {modState.flashCount}
              </span>
            </div>

            <button
              onClick={handleFlashUsb}
              disabled={isFlashing}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
            >
              <Usb className={`w-4 h-4 ${isFlashing ? 'animate-spin' : ''}`} />
              {isFlashing ? 'Écriture du firmware en cours...' : 'Flasher vers OP-1 (Mode USB)'}
            </button>

            {isFlashing && (
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                  <span>Écriture EEPROM Flash...</span>
                  <span className="text-emerald-400 font-bold">{flashProgress}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                    style={{ width: `${flashProgress}%` }}
                  />
                </div>
              </div>
            )}

            {flashSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Firmware installé avec succès sur l'OP-1 ! Redémarrage du système prêt.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
