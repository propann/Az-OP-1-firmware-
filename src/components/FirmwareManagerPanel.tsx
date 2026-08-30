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
  FolderOpen,
  Search,
  Terminal,
  Play,
  Scissors,
  Image as ImageIcon,
  Key,
  Binary,
  ArrowLeftRight,
  ExternalLink,
  Code2,
  FileText
} from 'lucide-react';
import { OfficialFirmwareInfo, FirmwareModState, PythonDevToolDef } from '../types';
import { OFFICIAL_FIRMWARES, PYTHON_DEV_STACK_TOOLS } from '../data/firmwareData';
import { audioEngine } from '../audio/engine';
import { WorkspacesAndExtractionView } from './WorkspacesAndExtractionView';

interface FirmwareManagerPanelProps {
  modState: FirmwareModState;
  setModState: React.Dispatch<React.SetStateAction<FirmwareModState>>;
  onOpenWorkshop: () => void;
  onOpenPipeline: () => void;
  onOpenEmulator?: () => void;
}

interface BackupItem {
  id: string;
  name: string;
  date: string;
  version: string;
  sizeMb: number;
  sha256: string;
}

type SubView = 'workspaces' | 'archive' | 'python-rack' | 'diff-comparator';

export const FirmwareManagerPanel: React.FC<FirmwareManagerPanelProps> = ({
  modState,
  setModState,
  onOpenWorkshop,
  onOpenPipeline,
  onOpenEmulator
}) => {
  const [subView, setSubView] = useState<SubView>('workspaces');
  const [selectedFirmwareId, setSelectedFirmwareId] = useState<string>(OFFICIAL_FIRMWARES[0].id);
  const [diffTargetId, setDiffTargetId] = useState<string>(OFFICIAL_FIRMWARES[2].id); // v243
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'STOCK' | 'MOD' | 'LEGACY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Python Rack Interactive Terminal State
  const [selectedToolId, setSelectedToolId] = useState<string>(PYTHON_DEV_STACK_TOOLS[0].id);
  const [terminalCommand, setTerminalCommand] = useState<string>('op1repacker unpack op1_243.op1');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);

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
  const diffFw = OFFICIAL_FIRMWARES.find(f => f.id === diffTargetId) || OFFICIAL_FIRMWARES[2];
  const activeTool = PYTHON_DEV_STACK_TOOLS.find(t => t.id === selectedToolId) || PYTHON_DEV_STACK_TOOLS[0];

  const filteredFirmwares = OFFICIAL_FIRMWARES.filter(fw => {
    const matchesSearch = fw.version.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          fw.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          fw.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterCategory === 'STOCK') return !fw.isModded;
    if (filterCategory === 'MOD') return fw.isModded;
    if (filterCategory === 'LEGACY') {
      const vNum = parseInt(fw.version.replace(/[^0-9]/g, ''), 10);
      return vNum < 200;
    }
    return true;
  });

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
    audioEngine.playChime('save');
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

  const handleDownloadFw = (fw: OfficialFirmwareInfo) => {
    const payload = `TEENAGE ENGINEERING OP-1 FIRMWARE BINARY\nVersion: ${fw.version}\nFile: ${fw.fileName}\nTarget: ADSP-BF533 (Blackfin)\nBootloader: ${fw.bootloaderVer}\nCRC32: 0x${fw.crc32}\nSHA-256: ${fw.sha256}`;
    const blob = new Blob([payload], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fw.fileName;
    a.click();
    URL.revokeObjectURL(url);
    audioEngine.playChime('save');
  };

  const handleRunCommand = (cmd: string) => {
    setIsExecutingCommand(true);
    setTerminalCommand(cmd);
    audioEngine.playChime('save');

    const lines: string[] = [
      `$ ${cmd}`,
      `[python3.11] Loading runtime environment...`
    ];

    setTimeout(() => {
      if (cmd.includes('pip3 install')) {
        lines.push('Collecting op1repacker (>=2.4.0)');
        lines.push('  Downloading op1repacker-2.4.1-py3-none-any.whl (42 kB)');
        lines.push('Installing collected packages: op1repacker, lzma, capstone');
        lines.push('Successfully installed op1repacker-2.4.1 opie-1.2.0 op1svg-1.0.4');
      } else if (cmd.includes('unpack')) {
        lines.push(`Reading container: ${currentFw.fileName}`);
        lines.push('Decompressing LZMA stream (Dict: 64MB, Level: 9)...');
        lines.push('Extracting files to directory ./op1_unpacked_root:');
        lines.push('  -> /synth (14 presets, 8 engine definitions)');
        lines.push('  -> /drum (dink_electro.aif, analog_808.aif)');
        lines.push('  -> /gfx (cwo_cow_vector.svg, boot_logo.svg)');
        lines.push('  -> /system (OP1_factory.db, firmware.ldr)');
        lines.push('Extraction complete. 15.5 MB unpacked.');
      } else if (cmd.includes('modify')) {
        lines.push(`Applying modifications to ./op1_unpacked_root:`);
        lines.push('  [MOD] Unlocking hidden ITER Cellular FM synth engine in OP1_factory.db');
        lines.push('  [MOD] Activating Nitro/Filter subtle-FX processing table');
        lines.push('  [MOD] Hooking 8 new Blackfin DSP engine entry points into L1 SRAM');
        lines.push('Patches applied successfully. Zero collision detected.');
      } else if (cmd.includes('repack')) {
        lines.push('Compressing ./op1_unpacked_root with LZMA Level 9...');
        lines.push('Recalculating CRC32 header: 0xA4F2C991');
        lines.push('Generated package: op1_246_modded.op1 (14.82 MB)');
        lines.push('[SUCCESS] Firmware repacked and validated anti-brick ready.');
      } else if (cmd.includes('opie')) {
        lines.push('[opie] Scanning sample buffer: 44.1kHz 16-bit Mono');
        lines.push('Transient detection: 24 slices identified.');
        lines.push('Injecting OP-1 metadata header chunk into .aif container.');
        lines.push('Drum kit patch generated: kit_24_slices.aif');
      } else if (cmd.includes('op1svg')) {
        lines.push('[op1svg] Parsing SVG paths for OLED 320x160 viewport...');
        lines.push('Stripping unsupported CSS styling & bezier smoothing...');
        lines.push('Path count: 4 | Vertices: 64 | Clamped to 320x160.');
        lines.push('Asset normalized: compliant with TE OLED graphics processor.');
      } else if (cmd.includes('decrypt')) {
        lines.push('[op1-decryptor] Loading AES-256 OTP Key (0x9C2B88FF...)');
        lines.push('Decrypting section OP1_vdk.ldr.enc...');
        lines.push('Validating Blackfin ADSP-BF533 binary header: 0xAD50BF53');
        lines.push('Decryption SUCCESS: Output saved to OP1_vdk.ldr.dec');
      } else if (cmd.includes('parse_bfin_ldr')) {
        lines.push('[parse_bfin_ldr.py] Reading Blackfin LDR stream...');
        lines.push('  Block 0: Addr 0xFFA00000 | Count 4096 bytes | L1 Instruction SRAM');
        lines.push('  Block 1: Addr 0xFF800000 | Count 16384 bytes | L1 Data Bank A');
        lines.push('  Block 2: Addr 0x00000000 | Count 14500000 bytes | SDRAM 64MB');
        lines.push('Disassembly hook table verified.');
      } else {
        lines.push(`Executed: ${cmd}`);
        lines.push('Command completed with return code 0.');
      }

      setTerminalOutput(lines);
      setIsExecutingCommand(false);
    }, 500);
  };

  return (
    <div id="firmware-manager-panel" className="space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Phase 1 : Les Fondations & Outils
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                13 Firmwares Officiels OP-1 Original
              </span>
              <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                Target: ADSP-BF533 (Non-Field)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">
              Le "Rack" Logiciel & Bibliothèque Complète des Firmwares
            </h1>
            <p className="text-sm text-zinc-400 max-w-3xl">
              Votre colonne vertébrale de développement : explorez l'archive exhaustive des firmwares officiels sortis pour l'OP-1 Original (de la v061 de 2011 à la v246 Mod Lab), maîtrisez la suite d'outils Python (<code className="text-cyan-300 font-mono">op1repacker</code>, <code className="text-cyan-300 font-mono">opie</code>, <code className="text-cyan-300 font-mono">op1svg</code>, <code className="text-cyan-300 font-mono">op1-decryptor</code>) et sécurisez vos builds avec les sauvegardes snapshot.
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
              {isCreatingBackup ? 'Sauvegarde en cours...' : 'Créer Sauvegarde (.op1.bak)'}
            </button>
            <button
              id="btn-goto-workshop"
              onClick={onOpenWorkshop}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg text-xs font-semibold font-mono flex items-center gap-2 transition-all shadow-md shadow-cyan-900/30 cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              Phase 2 : Atelier de Mods
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Switcher between Workspaces, Archive, Python Dev Rack & Diff Comparator */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-zinc-900/90 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSubView('workspaces')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer ${
              subView === 'workspaces'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-orange-400" />
            Dossiers de Travail & Extraction LZMA
          </button>

          <button
            onClick={() => setSubView('archive')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer ${
              subView === 'archive'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Archive Officielle ({OFFICIAL_FIRMWARES.length} Firmwares)
          </button>

          <button
            onClick={() => setSubView('python-rack')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer ${
              subView === 'python-rack'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            Rack Logiciel Python (op1repacker)
          </button>

          <button
            onClick={() => setSubView('diff-comparator')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer ${
              subView === 'diff-comparator'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            Comparateur Diff
          </button>
        </div>

        <span className="text-xs text-zinc-400 font-mono hidden md:inline">
          OP-1 Original (Non-Field) uniquement
        </span>
      </div>

      {/* VIEW 0: WORKSPACES & BATCH ARCHIVE UNPACKER */}
      {subView === 'workspaces' && (
        <WorkspacesAndExtractionView
          modState={modState}
          setModState={setModState}
          onOpenEmulator={onOpenEmulator || onOpenWorkshop}
          onOpenWorkshop={onOpenWorkshop}
        />
      )}

      {/* VIEW 1: COMPLETE OFFICIAL FIRMWARE ARCHIVE */}
      {subView === 'archive' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Upload & Firmware List */}
          <div className="lg:col-span-5 space-y-6">
            {/* Drag & Drop Upload Card */}
            <div 
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                dragActive 
                  ? 'border-cyan-500 bg-cyan-950/20' 
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-cyan-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200">
                    {customFileLoaded ? `Fichier chargé : ${customFileLoaded}` : 'Charger un firmware .op1 / .lzma'}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Glissez-déposez une archive .op1 originale ici
                  </p>
                </div>
                <label 
                  htmlFor="firmware-file-input"
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono rounded-lg border border-zinc-700 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                  Parcourir...
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

            {/* Filter Tabs & Search Bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                  Catalogue Officiel ({filteredFirmwares.length} / {OFFICIAL_FIRMWARES.length})
                </h2>
                <div className="flex items-center gap-1">
                  {(['ALL', 'STOCK', 'MOD', 'LEGACY'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded transition cursor-pointer ${
                        filterCategory === cat
                          ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
                          : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher par version (ex: v243, v218, v061)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* List */}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredFirmwares.map((fw) => {
                  const isSelected = fw.id === selectedFirmwareId;
                  return (
                    <div
                      key={fw.id}
                      onClick={() => handleSelectFirmware(fw)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/40'
                          : 'bg-zinc-950/70 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold font-mono ${isSelected ? 'text-cyan-400' : 'text-zinc-200'}`}>
                              {fw.version}
                            </span>
                            {fw.isModded ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-950 text-amber-400 border border-amber-800/60">
                                MOD LAB
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400">
                                FACTORY
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 font-mono">
                            {fw.fileName} • {fw.sizeMb} MB
                          </p>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <span className="text-xs text-cyan-400 font-mono uppercase font-semibold">
                    Fiche Technique Binaire
                  </span>
                  <h3 className="text-xl font-bold text-zinc-100 font-mono">
                    {currentFw.version} — {currentFw.fileName}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const verNum = currentFw.version.replace('v', '');
                      setModState(prev => ({
                        ...prev,
                        baseVersion: verNum,
                        targetChecksum: currentFw.crc32
                      }));
                      audioEngine.playChime('boot');
                      onOpenEmulator?.();
                    }}
                    className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-orange-900/30"
                    title="Exécuter et émuler ce firmware sur l'écran matériel OP-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Tester dans l'Émulateur
                  </button>
                  <button
                    onClick={() => handleDownloadFw(currentFw)}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger .op1
                  </button>
                  <button
                    onClick={onOpenWorkshop}
                    className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-cyan-900/30"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Modifier ce FW
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-mono">
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
                  Fonctionnalités & Évolutions de cette version :
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
                  Sauvegardes de Sécurité Snapshot (.op1.bak)
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
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 rounded text-[11px] border border-zinc-700 transition-colors cursor-pointer"
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
      )}

      {/* VIEW 2: PYTHON DEV RACK & CLI CONSOLE */}
      {subView === 'python-rack' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Python Tools Catalog */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                    Outils Compagnons Python ({PYTHON_DEV_STACK_TOOLS.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">pip3 ready</span>
              </div>

              <div className="space-y-2.5">
                {PYTHON_DEV_STACK_TOOLS.map(tool => {
                  const isSelected = tool.id === selectedToolId;
                  return (
                    <div
                      key={tool.id}
                      onClick={() => {
                        setSelectedToolId(tool.id);
                        setTerminalCommand(tool.exampleUsage.split('\n')[0]);
                      }}
                      className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-zinc-950/70 border-zinc-800/80 hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold font-mono ${isSelected ? 'text-emerald-400' : 'text-zinc-200'}`}>
                          {tool.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400">
                          {tool.category.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono mt-1 line-clamp-2">
                        {tool.description}
                      </p>
                      <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                        <code className="text-[10px] text-zinc-400 font-mono">{tool.installCommand}</code>
                        <span className="text-[10px] text-emerald-400 font-mono font-semibold">Tester &gt;</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Python Terminal & Command Runner */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl flex flex-col h-[560px]">
              {/* Terminal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="text-xs font-bold font-mono text-zinc-300 ml-2">
                    Python Dev Rack Shell — {activeTool.command}
                  </span>
                </div>

                <button
                  onClick={() => setTerminalOutput([])}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 font-mono px-2 py-1 bg-zinc-900 rounded border border-zinc-800"
                >
                  Effacer
                </button>
              </div>

              {/* Quick Command Launcher Chips */}
              <div className="space-y-1.5 mb-3">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Commandes Rapides ({activeTool.name}) :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleRunCommand(activeTool.installCommand)}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded text-[10px] font-mono border border-zinc-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    {activeTool.installCommand}
                  </button>
                  {activeTool.exampleUsage.split('\n').map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRunCommand(cmd)}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 rounded text-[10px] font-mono border border-zinc-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Terminal Output Window */}
              <div className="flex-1 bg-black rounded-lg p-4 font-mono text-xs overflow-y-auto space-y-1.5 border border-zinc-900 text-zinc-300">
                <div className="text-zinc-400">
                  Engineering Studio Python Rack v2.4 (ADSP-BF533 Toolchain)
                </div>
                <div className="text-zinc-400">
                  Tapez une commande ou cliquez sur les suggestions ci-dessus.
                </div>
                <div className="border-b border-zinc-900 my-2" />

                {terminalOutput.map((line, idx) => (
                  <div 
                    key={idx} 
                    className={
                      line.startsWith('$') ? 'text-cyan-400 font-bold' :
                      line.includes('[SUCCESS]') || line.includes('Successfully') ? 'text-emerald-400' :
                      line.includes('[MOD]') ? 'text-amber-300' :
                      line.includes('Error') ? 'text-red-400' : 'text-zinc-300'
                    }
                  >
                    {line}
                  </div>
                ))}

                {isExecutingCommand && (
                  <div className="text-cyan-400 flex items-center gap-2 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Exécution de la commande...
                  </div>
                )}
              </div>

              {/* Command Input Bar */}
              <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2">
                <span className="text-emerald-400 font-mono font-bold">$</span>
                <input
                  type="text"
                  value={terminalCommand}
                  onChange={e => setTerminalCommand(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && terminalCommand.trim()) {
                      handleRunCommand(terminalCommand.trim());
                    }
                  }}
                  placeholder="ex: op1repacker unpack op1_243.op1"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => terminalCommand.trim() && handleRunCommand(terminalCommand.trim())}
                  disabled={isExecutingCommand}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  Exécuter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: SIDE-BY-SIDE DIFF COMPARATOR */}
      {subView === 'diff-comparator' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-100 font-mono flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-400" />
                Comparateur de Firmware Diff (Side-by-Side)
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Comparez l'évolution des fonctionnalités, bootloaders, et empreintes cryptographiques entre 2 versions officielles.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-mono block">Version A</span>
                <select
                  value={selectedFirmwareId}
                  onChange={e => setSelectedFirmwareId(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-400"
                >
                  {OFFICIAL_FIRMWARES.map(fw => (
                    <option key={fw.id} value={fw.id}>{fw.version} ({fw.buildDate})</option>
                  ))}
                </select>
              </div>

              <span className="text-zinc-500 font-mono mt-4">VS</span>

              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-mono block">Version B</span>
                <select
                  value={diffTargetId}
                  onChange={e => setDiffTargetId(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-amber-400"
                >
                  {OFFICIAL_FIRMWARES.map(fw => (
                    <option key={fw.id} value={fw.id}>{fw.version} ({fw.buildDate})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Version A Details */}
            <div className="p-5 bg-zinc-950 rounded-xl border border-cyan-500/40 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-sm font-bold font-mono text-cyan-400">{currentFw.version}</span>
                <span className="text-xs font-mono text-zinc-400">{currentFw.buildDate}</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div><span className="text-zinc-400">Bootloader:</span> <strong className="text-zinc-200">{currentFw.bootloaderVer}</strong></div>
                <div><span className="text-zinc-400">Taille:</span> <strong className="text-zinc-200">{currentFw.sizeMb} MB</strong></div>
                <div><span className="text-zinc-400">CRC32:</span> <strong className="text-emerald-400">0x{currentFw.crc32}</strong></div>
                <div><span className="text-zinc-400">Type:</span> <strong className={currentFw.isModded ? 'text-amber-400' : 'text-zinc-300'}>{currentFw.isModded ? 'MOD LAB' : 'OFFICIAL FACTORY'}</strong></div>
              </div>
              <div className="pt-2 border-t border-zinc-800 space-y-1">
                <span className="text-[11px] text-zinc-400 font-mono block font-semibold">Fonctionnalités :</span>
                {currentFw.features.map((f, i) => (
                  <div key={i} className="text-[11px] text-zinc-300 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Version B Details */}
            <div className="p-5 bg-zinc-950 rounded-xl border border-amber-500/40 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-sm font-bold font-mono text-amber-400">{diffFw.version}</span>
                <span className="text-xs font-mono text-zinc-400">{diffFw.buildDate}</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div><span className="text-zinc-400">Bootloader:</span> <strong className="text-zinc-200">{diffFw.bootloaderVer}</strong></div>
                <div><span className="text-zinc-400">Taille:</span> <strong className="text-zinc-200">{diffFw.sizeMb} MB</strong></div>
                <div><span className="text-zinc-400">CRC32:</span> <strong className="text-emerald-400">0x{diffFw.crc32}</strong></div>
                <div><span className="text-zinc-400">Type:</span> <strong className={diffFw.isModded ? 'text-amber-400' : 'text-zinc-300'}>{diffFw.isModded ? 'MOD LAB' : 'OFFICIAL FACTORY'}</strong></div>
              </div>
              <div className="pt-2 border-t border-zinc-800 space-y-1">
                <span className="text-[11px] text-zinc-400 font-mono block font-semibold">Fonctionnalités :</span>
                {diffFw.features.map((f, i) => (
                  <div key={i} className="text-[11px] text-zinc-300 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
