import React, { useState } from 'react';
import { 
  HardDrive, 
  ShieldCheck, 
  Upload, 
  Download, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  FileCode, 
  Layers, 
  Archive,
  RefreshCw,
  Copy,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { OfficialFirmwareInfo, FirmwareModState } from '../types';
import { OFFICIAL_FIRMWARES } from '../data/firmwareData';
import { audioEngine } from '../audio/engine';

interface FirmwareManagerPanelProps {
  modState: FirmwareModState;
  setModState: React.Dispatch<React.SetStateAction<FirmwareModState>>;
  onOpenWorkshop: () => void;
  onOpenPipeline: () => void;
}

interface BackupItem {
  id: string;
  name: string;
  date: string;
  version: string;
  sizeMb: number;
  sha256: string;
}

export const FirmwareManagerPanel: React.FC<FirmwareManagerPanelProps> = ({
  modState,
  setModState,
  onOpenWorkshop,
  onOpenPipeline
}) => {
  const [selectedFirmwareId, setSelectedFirmwareId] = useState<string>(OFFICIAL_FIRMWARES[0].id);
  const [backups, setBackups] = useState<BackupItem[]>([
    {
      id: 'bak-1',
      name: 'op1_factory_v243_clean.op1.bak',
      date: '2024-10-12 11:42',
      version: 'v243-STOCK',
      sizeMb: 14.21,
      sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0'
    },
    {
      id: 'bak-2',
      name: 'op1_backup_pre_mod_v246.op1.bak',
      date: '2024-11-18 09:15',
      version: 'v246-ENG-LAB',
      sizeMb: 14.82,
      sha256: '9f83a21b4c5e6d7890123456789abcdef0123456789abcdef0123456789abcde'
    }
  ]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [customFileLoaded, setCustomFileLoaded] = useState<string | null>(null);

  const currentFw = OFFICIAL_FIRMWARES.find(f => f.id === selectedFirmwareId) || OFFICIAL_FIRMWARES[0];

  const handleSelectFirmware = (fw: OfficialFirmwareInfo) => {
    setSelectedFirmwareId(fw.id);
    setModState(prev => ({
      ...prev,
      firmwareVersion: fw.version,
      baseVersion: fw.version,
      buildDate: fw.buildDate,
      unlockIterSynth: fw.isModded ? true : prev.unlockIterSynth,
      unlockFilterEffect: fw.isModded ? true : prev.unlockFilterEffect,
      customDspEnginesUnlocked: fw.isModded ? true : prev.customDspEnginesUnlocked
    }));
  };

  const handleCreateBackup = () => {
    setIsCreatingBackup(true);
    setTimeout(() => {
      const newBackup: BackupItem = {
        id: `bak-${Date.now()}`,
        name: `${currentFw.fileName.replace('.op1', '')}_snapshot_${new Date().toISOString().slice(0, 10)}.op1.bak`,
        date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        version: currentFw.version,
        sizeMb: currentFw.sizeMb,
        sha256: currentFw.sha256
      };
      setBackups(prev => [newBackup, ...prev]);
      setIsCreatingBackup(false);
      audioEngine.playChime('save');
    }, 600);
  };

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomFileLoaded(file.name);
      setModState(prev => ({
        ...prev,
        firmwareVersion: `CUSTOM-${file.name.replace('.op1', '').slice(0, 8).toUpperCase()}`,
        buildDate: new Date().toISOString().slice(0, 10)
      }));
      audioEngine.playChime('boot');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setCustomFileLoaded(file.name);
      setModState(prev => ({
        ...prev,
        firmwareVersion: `CUSTOM-${file.name.replace('.op1', '').slice(0, 8).toUpperCase()}`,
        buildDate: new Date().toISOString().slice(0, 10)
      }));
      audioEngine.playChime('boot');
    }
  };

  return (
    <div id="firmware-manager-panel" className="space-y-6">
      {/* Top Banner / Hero Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                op1repacker v2.4 Certified
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Anti-Brick Protection 100%
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Target: Analog Devices ADSP-BF533 @ 400 MHz
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
              Gestionnaire de Firmware OP-1
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Point d'entrée de votre chaîne de modification : chargez un firmware officiel ou personnalisé, examinez l'architecture mémoire du Blackfin DSP, créez des sauvegardes de sécurité et décompressez les conteneurs LZMA-TAR.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-create-backup"
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium font-mono flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Archive className={`w-4 h-4 text-cyan-400 ${isCreatingBackup ? 'animate-spin' : ''}`} />
              {isCreatingBackup ? 'Sauvegarde en cours...' : 'Créer une Sauvegarde (.op1.bak)'}
            </button>
            <button
              id="btn-goto-workshop"
              onClick={onOpenWorkshop}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg text-xs font-semibold font-mono flex items-center gap-2 transition-all shadow-md shadow-cyan-900/30 cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              Ouvrir l'Atelier de Mods
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Firmware Catalog & Uploader */}
        <div className="lg:col-span-5 space-y-6">
          {/* Drag & Drop Upload Card */}
          <div 
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              dragActive 
                ? 'border-cyan-500 bg-cyan-950/20' 
                : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-cyan-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  {customFileLoaded ? `Fichier chargé : ${customFileLoaded}` : 'Charger un fichier .op1 officiel ou custom'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Glissez-déposez une archive .op1, .tar.lzma ou .zip ici
                </p>
              </div>
              <label 
                htmlFor="firmware-file-input"
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono rounded-lg border border-zinc-700 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                Parcourir les fichiers...
              </label>
              <input
                id="firmware-file-input"
                type="file"
                accept=".op1,.lzma,.tar,.zip,.ldr"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Firmware Archive Selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Versions Disponibles ({OFFICIAL_FIRMWARES.length})
              </h2>
              <span className="text-xs text-zinc-400 font-mono">Archive Officielle</span>
            </div>

            <div className="space-y-2">
              {OFFICIAL_FIRMWARES.map((fw) => {
                const isSelected = fw.id === selectedFirmwareId;
                return (
                  <div
                    key={fw.id}
                    onClick={() => handleSelectFirmware(fw)}
                    className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500/80 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold font-mono ${isSelected ? 'text-cyan-400' : 'text-zinc-200'}`}>
                            {fw.version}
                          </span>
                          {fw.isModded && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-400 border border-amber-800/50">
                              MOD LAB
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-mono">
                          {fw.fileName} • {fw.sizeMb} MB
                        </p>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {fw.buildDate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Firmware Inspection & Memory Layout */}
        <div className="lg:col-span-7 space-y-6">
          {/* Detailed Info Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-xs text-cyan-400 font-mono uppercase font-semibold">
                  Fiche Technique Binaire
                </span>
                <h3 className="text-xl font-bold text-zinc-100 font-mono">
                  {currentFw.version} — {currentFw.fileName}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400 block font-mono">Date de Build</span>
                <span className="text-xs text-zinc-200 font-mono font-medium">{currentFw.buildDate}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {currentFw.description}
            </p>

            {/* Technical Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
                <span className="text-[11px] text-zinc-400 block">Bootloader</span>
                <span className="text-zinc-200 font-semibold">{currentFw.bootloaderVer}</span>
              </div>
              <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
                <span className="text-[11px] text-zinc-400 block">Taille Binaire</span>
                <span className="text-cyan-400 font-semibold">{currentFw.sizeMb} MB</span>
              </div>
              <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
                <span className="text-[11px] text-zinc-400 block">CRC32 Checksum</span>
                <span className="text-emerald-400 font-semibold">0x{currentFw.crc32}</span>
              </div>
              <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
                <span className="text-[11px] text-zinc-400 block">Compression</span>
                <span className="text-amber-400 font-semibold">LZMA Level 9</span>
              </div>
            </div>

            {/* Checksums Cryptographiques */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-medium text-zinc-400 block">
                Empreintes Cryptographiques (Vérification d'Intégrité Anti-Brick)
              </span>
              <div className="p-3 bg-zinc-950/90 rounded-lg border border-zinc-800 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-[11px]">SHA-256:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 text-[11px] truncate max-w-xs sm:max-w-md">
                      {currentFw.sha256}
                    </span>
                    <button
                      onClick={() => handleCopyHash(currentFw.sha256)}
                      className="text-zinc-400 hover:text-cyan-400 transition-colors"
                      title="Copier le hash SHA-256"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                  <span className="text-zinc-400 text-[11px]">MD5:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 text-[11px] font-mono">
                      {currentFw.md5}
                    </span>
                    <button
                      onClick={() => handleCopyHash(currentFw.md5)}
                      className="text-zinc-400 hover:text-cyan-400 transition-colors"
                      title="Copier le hash MD5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              {copiedHash && (
                <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Hash copié dans le presse-papier !
                </span>
              )}
            </div>

            {/* Features List */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-medium text-zinc-400 block">
                Fonctionnalités Incluses dans cette Version :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentFw.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Historical Backups Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                <Archive className="w-4 h-4 text-cyan-400" />
                Sauvegardes de Sécurité (.op1.bak)
              </h4>
              <span className="text-[11px] text-zinc-400 font-mono">{backups.length} snapshots</span>
            </div>

            <div className="space-y-2">
              {backups.map((bak) => (
                <div 
                  key={bak.id}
                  className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg flex items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="space-y-0.5 truncate">
                    <span className="text-zinc-200 font-medium block truncate">
                      {bak.name}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {bak.version} • {bak.sizeMb} MB • Créé le {bak.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setModState(prev => ({
                          ...prev,
                          firmwareVersion: bak.version
                        }));
                        audioEngine.playChime('boot');
                      }}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 rounded text-[11px] border border-zinc-700 transition-colors"
                    >
                      Restaurer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
