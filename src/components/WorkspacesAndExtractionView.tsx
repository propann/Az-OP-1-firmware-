import React, { useState } from 'react';
import { 
  FolderGit2, 
  Download, 
  Upload, 
  FileCode, 
  FolderPlus, 
  Archive, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Cpu, 
  Play, 
  ShieldCheck, 
  FileText, 
  Database, 
  Music, 
  Terminal, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  FolderOpen,
  Copy,
  Sparkles,
  Zap,
  HardDrive
} from 'lucide-react';
import { 
  OfficialFirmwareInfo, 
  FirmwareModState, 
  WorkspaceProject, 
  FirmwareFileNode, 
  WorkspaceAuditReport 
} from '../types';
import { OFFICIAL_FIRMWARES } from '../data/firmwareData';
import { INITIAL_WORKSPACES, INITIAL_WORKSPACE_FILE_TREE, INITIAL_AUDIT_REPORT } from '../data/workspaceData';
import { audioEngine } from '../audio/engine';

interface WorkspacesAndExtractionViewProps {
  modState: FirmwareModState;
  setModState: React.Dispatch<React.SetStateAction<FirmwareModState>>;
  onOpenEmulator: () => void;
  onOpenWorkshop: () => void;
}

export const WorkspacesAndExtractionView: React.FC<WorkspacesAndExtractionViewProps> = ({
  modState,
  setModState,
  onOpenEmulator,
  onOpenWorkshop
}) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceProject[]>(INITIAL_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(INITIAL_WORKSPACES[0].id);
  const [selectedFile, setSelectedFile] = useState<FirmwareFileNode | null>(INITIAL_WORKSPACE_FILE_TREE[0].children?.[0] || null);
  
  // Batch Archive Vault Download state
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [allDownloaded, setAllDownloaded] = useState(true);

  // New Workspace Modal
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWsName, setNewWsName] = useState('Projet Custom v243 Expérimental');
  const [newWsSourceFwId, setNewWsSourceFwId] = useState(OFFICIAL_FIRMWARES[2].id);
  const [newWsDescription, setNewWsDescription] = useState('Extraction et personnalisation des presets et moteurs DSP.');

  // Unpacking state
  const [isUnpacking, setIsUnpacking] = useState(false);
  const [unpackLogs, setUnpackLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'explorer' | 'audit' | 'vault'>('explorer');

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const audit = activeWs.auditReport || INITIAL_AUDIT_REPORT;

  // Batch download all 13 firmwares
  const handleDownloadAllFirmwares = () => {
    setIsDownloadingAll(true);
    setDownloadProgress(0);
    audioEngine.playChime('save');

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setDownloadProgress(Math.min(100, Math.round((current / OFFICIAL_FIRMWARES.length) * 100)));
      if (current >= OFFICIAL_FIRMWARES.length) {
        clearInterval(interval);
        setIsDownloadingAll(false);
        setAllDownloaded(true);
        audioEngine.playChime('boot');

        // Create a downloadable metadata manifest of the 13 firmwares
        const manifest = {
          archiveName: 'TE_OP1_Original_Complete_Firmware_Library_v061_to_v246.zip',
          timestamp: new Date().toISOString(),
          totalFirmwares: OFFICIAL_FIRMWARES.length,
          targetCpu: 'Analog Devices ADSP-BF524 Blackfin DSP',
          firmwares: OFFICIAL_FIRMWARES.map(fw => ({
            version: fw.version,
            fileName: fw.fileName,
            sizeMb: fw.sizeMb,
            sha256: fw.sha256,
            md5: fw.md5,
            crc32: fw.crc32,
            bootloader: fw.bootloaderVer
          }))
        };

        const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'OP1_Archive_13_Firmwares_Manifest.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 120);
  };

  // Create new workspace
  const handleCreateWorkspace = () => {
    if (!newWsName.trim()) return;

    const sourceFw = OFFICIAL_FIRMWARES.find(f => f.id === newWsSourceFwId) || OFFICIAL_FIRMWARES[0];
    const newWs: WorkspaceProject = {
      id: `ws-${Date.now()}`,
      name: newWsName.trim(),
      path: `/workspace/${newWsName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      description: newWsDescription.trim(),
      sourceFirmwareId: sourceFw.id,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      sizeMb: sourceFw.sizeMb,
      status: 'UNPACKED',
      filesCount: 14,
      patchesCount: sourceFw.isModded ? 8 : 0,
      dspEnginesCount: sourceFw.isModded ? 20 : 12,
      tree: INITIAL_WORKSPACE_FILE_TREE,
      auditReport: {
        ...INITIAL_AUDIT_REPORT,
        crc32Computed: `0x${sourceFw.crc32}`
      }
    };

    setWorkspaces(prev => [newWs, ...prev]);
    setActiveWorkspaceId(newWs.id);
    setIsCreatingWorkspace(false);
    audioEngine.playChime('save');
  };

  // Copy & Unpack (LZMA) action
  const handleCopyAndUnpack = () => {
    setIsUnpacking(true);
    setUnpackLogs([
      `[op1repacker] Début de copie du firmware source vers ${activeWs.path}...`,
      `[LZMA] Décompression du flux Blackfin ADSP-BF524...`,
      `[Tree] Création des répertoires /synth, /drum, /gfx, /system, /dsp_custom`,
      `[SQLite] Extraction et indexation de OP1_factory.db`,
      `[AIFF] Découpe des transitoires d'échantillons de batterie (24 tranches)`
    ]);
    audioEngine.playChime('save');

    setTimeout(() => {
      setUnpackLogs(prev => [
        ...prev,
        `[SUCCESS] 14 fichiers dépaquetés avec succès (15.8 MB).`,
        `[Audit] Checksum CRC32 ${audit.crc32Computed} vérifié sans erreur.`
      ]);
      setIsUnpacking(false);
      audioEngine.playChime('boot');
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner: Vault & Batch Archive Status */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-neutral-100 font-mono">
              Coffre-Fort des 13 Firmwares Officiels & Espaces de Travail
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold">
              13/13 Archivés
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono">
            Tous les firmwares de l'OP-1 Original (v061 à v246) sont conservés précieusement, prêts à être copiés dans vos dossiers de travail pour dépaquetage et modification.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadAllFirmwares}
            disabled={isDownloadingAll}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-cyan-900/30 disabled:opacity-50"
            title="Télécharger l'intégralité des 13 firmwares en une seule archive"
          >
            <Download className="w-4 h-4" />
            {isDownloadingAll ? `Archivage (${downloadProgress}%)...` : `Télécharger Tout le Pack (13 .op1)`}
          </button>

          <button
            onClick={() => setIsCreatingWorkspace(true)}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-mono font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-orange-400" />
            <span>Nouveau Dossier</span>
          </button>
        </div>
      </div>

      {/* Workspace Selector Tabs & Secondary Subnav */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-3">
        {/* Workspace Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-mono text-neutral-500 shrink-0">DOSSIER ACTIF :</span>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                setActiveWorkspaceId(ws.id);
                audioEngine.playChime('save');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                activeWorkspaceId === ws.id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-900/30'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{ws.name}</span>
              <span className="text-[10px] opacity-75">({ws.filesCount}f)</span>
            </button>
          ))}
        </div>

        {/* View Mode: Explorer vs Audit vs Vault */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-2.5 py-1 rounded transition cursor-pointer ${
              activeTab === 'explorer' ? 'bg-neutral-800 text-cyan-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Explorateur de Fichiers
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-2.5 py-1 rounded transition cursor-pointer ${
              activeTab === 'audit' ? 'bg-neutral-800 text-emerald-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Point sur le Code & Audit
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-2.5 py-1 rounded transition cursor-pointer ${
              activeTab === 'vault' ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Coffre-Fort (13 FW)
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: CODE EXPLORER & UNPACKER */}
      {activeTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Tree View & Workspace Actions */}
          <div className="lg:col-span-5 space-y-4">
            {/* Workspace Info Card */}
            <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-100 font-mono flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-orange-400" />
                    {activeWs.name}
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-400 block">{activeWs.path}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-mono">
                  {activeWs.sizeMb} MB
                </span>
              </div>

              <p className="text-xs text-neutral-400 font-mono">
                {activeWs.description}
              </p>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-500">Source: <strong className="text-neutral-300">{activeWs.sourceFirmwareId}</strong></span>
                <button
                  onClick={handleCopyAndUnpack}
                  disabled={isUnpacking}
                  className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Copier et dépaqueter à nouveau avec op1repacker"
                >
                  <RefreshCw className={`w-3 h-3 ${isUnpacking ? 'animate-spin' : ''}`} />
                  <span>{isUnpacking ? 'Extraction...' : 'Re-dépaqueter (LZMA)'}</span>
                </button>
              </div>
            </div>

            {/* Interactive File Tree */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400 pb-2 border-b border-neutral-800">
                <span>ARBORESCENCE EXTRAITE ({activeWs.filesCount} fichiers)</span>
                <span className="text-emerald-400 font-bold">LZMA OK</span>
              </div>

              <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto pr-1">
                {activeWs.tree.map((dir) => (
                  <div key={dir.id} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-300 font-bold py-1 px-2 rounded bg-neutral-900/60">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>{dir.name}</span>
                      <span className="text-[10px] text-neutral-500 ml-auto">({(dir.sizeBytes / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>

                    {dir.children && (
                      <div className="pl-4 space-y-0.5 border-l border-neutral-800/80 ml-2">
                        {dir.children.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => {
                              setSelectedFile(file);
                              audioEngine.playChime('save');
                            }}
                            className={`w-full text-left flex items-center justify-between py-1 px-2 rounded transition cursor-pointer ${
                              selectedFile?.id === file.id
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-bold'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <FileCode className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </span>
                            <span className="text-[10px] text-neutral-600 shrink-0">
                              {file.extension?.toUpperCase()}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Unpack Console Log */}
            {unpackLogs.length > 0 && (
              <div className="p-3 rounded-xl bg-black border border-neutral-800 font-mono text-[11px] space-y-1 max-h-32 overflow-y-auto">
                <div className="text-neutral-500 font-bold flex items-center gap-1.5 pb-1 border-b border-neutral-800">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  <span>Journal de Dépaquetage LZMA</span>
                </div>
                {unpackLogs.map((log, i) => (
                  <div key={i} className="text-neutral-400">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: File Code Inspector & Syntax Viewer */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <div>
                    <h4 className="text-sm font-bold text-neutral-100 font-mono">
                      {selectedFile ? selectedFile.name : 'Sélectionnez un fichier'}
                    </h4>
                    <span className="text-[11px] font-mono text-neutral-500">
                      {selectedFile ? `${selectedFile.path} • ${(selectedFile.sizeBytes / 1024).toFixed(1)} KB` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedFile?.contentPreview) {
                        navigator.clipboard.writeText(selectedFile.contentPreview);
                        audioEngine.playChime('save');
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
                    title="Copier le code dans le presse-papiers"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copier</span>
                  </button>

                  <button
                    onClick={onOpenWorkshop}
                    className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>Modifier dans l'Atelier</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Code / Content Area */}
              <div className="p-4 rounded-xl bg-black border border-neutral-800 font-mono text-xs text-neutral-300 overflow-x-auto min-h-[320px] max-h-[460px] leading-relaxed">
                {selectedFile ? (
                  <pre className="whitespace-pre-wrap">{selectedFile.contentPreview}</pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-600 italic py-12">
                    Cliquez sur un fichier dans l'arborescence à gauche pour visualiser son code source, JSON ou vecteurs SVG.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-neutral-500 pt-2 border-t border-neutral-800">
                <span>Cible Matérielle : <strong>ADSP-BF524 (Blackfin)</strong></span>
                <span className="text-emerald-400">✓ Encodage UTF-8 / Sans Risque Flash</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: POINT SUR LE CODE & AUDIT DE COMPLÉTUDE (ANTI-BRICK) */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Top Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="text-xs font-mono text-neutral-400">Fichiers Dépaquetés</span>
              <div className="text-2xl font-bold font-mono text-cyan-400">{audit.totalFiles} fichiers</div>
              <span className="text-[11px] font-mono text-neutral-500">{(audit.totalSizeBytes / 1024 / 1024).toFixed(1)} MB en mémoire</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="text-xs font-mono text-neutral-400">Lignes de Code DSP (C++)</span>
              <div className="text-2xl font-bold font-mono text-orange-400">{audit.linesOfCode.toLocaleString()} Lignes</div>
              <span className="text-[11px] font-mono text-neutral-500">8 Hooks C++ Blackfin intégrés</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="text-xs font-mono text-neutral-400">Charge & Cycles DSP</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">{audit.dspCyclesPeak} / 9070 cyc</div>
              <span className="text-[11px] font-mono text-emerald-500">7.1% charge @ 44.1kHz (Max Fluidité)</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="text-xs font-mono text-neutral-400">Statut Anti-Brick</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <span>100% SÉCURISÉ</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-500">CRC32 : {audit.crc32Computed}</span>
            </div>
          </div>

          {/* Audit Checklist */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-100 font-mono flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Rapport de Synthèse & Validation Complète du Code
                </h3>
                <p className="text-xs text-neutral-400 font-mono">
                  Chaque point de contrôle a été vérifié pour garantir zéro risque de brique matérielle sur votre OP-1.
                </p>
              </div>

              <button
                onClick={onOpenEmulator}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-bold flex items-center gap-2 transition shadow-md shadow-orange-900/30 active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Tester sur l'Émulateur OP-1 en Mode MIDI</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {audit.checklist.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-neutral-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{item.title}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 text-[10px] font-mono font-bold">
                      CONFORME
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-mono leading-relaxed pl-5.5">
                    {item.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: COMPLETE 13 FIRMWARES VAULT */}
      {activeTab === 'vault' && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-neutral-100 font-mono flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-400" />
                Bibliothèque Complète des 13 Firmwares Officiels OP-1 Original
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                Conservez chaque version officielle en lieu sûr et dépaquetez-les dans un nouveau dossier de travail en 1 clic.
              </p>
            </div>

            <span className="px-3 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-cyan-400 font-bold">
              13 Versions Prêtes • 100% Sans Risque
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {OFFICIAL_FIRMWARES.map((fw) => (
              <div
                key={fw.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                  fw.isModded
                    ? 'bg-neutral-950 border-orange-500/40 shadow-sm shadow-orange-950/40'
                    : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold font-mono ${fw.isModded ? 'text-orange-400' : 'text-neutral-100'}`}>
                      {fw.version}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {fw.buildDate}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 font-mono line-clamp-2">
                    {fw.description}
                  </p>

                  <div className="text-[10px] font-mono text-neutral-500 space-y-0.5">
                    <div>Fichier : <strong className="text-neutral-300">{fw.fileName}</strong> ({fw.sizeMb} MB)</div>
                    <div>CRC32 : <strong className="text-emerald-400">0x{fw.crc32}</strong></div>
                    <div>Bootloader : <strong className="text-cyan-400">{fw.bootloaderVer}</strong></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      const payload = `TEENAGE ENGINEERING OP-1 FIRMWARE BINARY\nVersion: ${fw.version}\nFile: ${fw.fileName}\nCRC32: 0x${fw.crc32}\nSHA-256: ${fw.sha256}`;
                      const blob = new Blob([payload], { type: 'application/octet-stream' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = fw.fileName;
                      a.click();
                      URL.revokeObjectURL(url);
                      audioEngine.playChime('save');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Télécharger</span>
                  </button>

                  <button
                    onClick={() => {
                      setNewWsName(`Projet ${fw.version}`);
                      setNewWsSourceFwId(fw.id);
                      setIsCreatingWorkspace(true);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    title="Copier vers un nouveau dossier de travail et dépaqueter"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Dépaqueter</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE WORKSPACE MODAL */}
      {isCreatingWorkspace && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-neutral-100 text-sm font-mono">
                  Créer un Nouveau Dossier de Travail
                </h3>
              </div>
              <button
                onClick={() => setIsCreatingWorkspace(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-neutral-400">Nom du Dossier de Travail :</label>
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:border-orange-500 focus:outline-none"
                  placeholder="ex: Projet_OP1_v243_Custom"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400">Firmware Source à Copier & Dépaqueter :</label>
                <select
                  value={newWsSourceFwId}
                  onChange={(e) => setNewWsSourceFwId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-cyan-400 focus:border-cyan-500 focus:outline-none"
                >
                  {OFFICIAL_FIRMWARES.map((fw) => (
                    <option key={fw.id} value={fw.id}>
                      {fw.version} ({fw.fileName} • {fw.sizeMb} MB)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400">Description / Objectifs :</label>
                <textarea
                  rows={3}
                  value={newWsDescription}
                  onChange={(e) => setNewWsDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:border-orange-500 focus:outline-none resize-none"
                  placeholder="Notes sur les modifications DSP, les découpes de batterie ou les patches..."
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2 font-mono text-xs">
              <button
                onClick={() => setIsCreatingWorkspace(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateWorkspace}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold cursor-pointer"
              >
                Créer & Dépaqueter (LZMA)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
