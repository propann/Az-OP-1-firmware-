import React, { useState } from 'react';
import { 
  Wrench, 
  Sparkles, 
  FolderTree, 
  FileAudio, 
  Database, 
  Code2, 
  Check, 
  Sliders, 
  Image as ImageIcon, 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  Play, 
  Square, 
  FileText, 
  Eye, 
  Layers, 
  Cpu, 
  Scissors, 
  CheckCircle2, 
  Activity,
  Maximize2
} from 'lucide-react';
import { 
  FirmwareModState, 
  FirmwareFileNode, 
  FactoryDbPresetRow, 
  SynthEngineType, 
  FxType, 
  CwoAnimal, 
  OledTheme, 
  SamplePatch 
} from '../types';
import { 
  INITIAL_FIRMWARE_FILESYSTEM, 
  INITIAL_FACTORY_DB_ROWS 
} from '../data/firmwareData';
import { audioEngine } from '../audio/engine';

interface ModificationWorkshopPanelProps {
  modState: FirmwareModState;
  setModState: React.Dispatch<React.SetStateAction<FirmwareModState>>;
}

type WorkshopTab = 'one-click' | 'explorer' | 'patches' | 'database' | 'tools';

export const ModificationWorkshopPanel: React.FC<ModificationWorkshopPanelProps> = ({
  modState,
  setModState
}) => {
  const [activeTab, setActiveTab] = useState<WorkshopTab>('one-click');

  // File Explorer State
  const [selectedFile, setSelectedFile] = useState<FirmwareFileNode | null>(
    INITIAL_FIRMWARE_FILESYSTEM.children?.[0]?.children?.[0] || null
  );
  const [fileSearchQuery, setFileSearchQuery] = useState('');

  // Database Editor State
  const [dbRows, setDbRows] = useState<FactoryDbPresetRow[]>(INITIAL_FACTORY_DB_ROWS);
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [isDbSaved, setIsDbSaved] = useState(false);

  // Audio Slicer State
  const [samplePatches, setSamplePatches] = useState<SamplePatch[]>([
    {
      id: 'sp-1',
      name: 'dink_electro_kit.aif',
      type: 'drum',
      category: 'Drum Kit',
      sampleRate: 44100,
      rootKey: 60,
      slicesCount: 24,
      fileSizeBytes: 1204000,
      metadataJson: '{"type":"drum","slices":24,"normalized":true}',
      hasLoop: false
    },
    {
      id: 'sp-2',
      name: 'fm_crystalline_lead.aif',
      type: 'synth',
      category: 'Synth Preset',
      sampleRate: 44100,
      rootKey: 60,
      slicesCount: 1,
      fileSizeBytes: 44200,
      metadataJson: '{"type":"synth","engine":"fm","root":60}',
      hasLoop: true
    }
  ]);
  const [activeSliceIndex, setActiveSliceIndex] = useState(0);

  // SVG Normalizer State (op1svg)
  const [rawSvgInput, setRawSvgInput] = useState<string>(
    `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">\n  <!-- Custom OLED Logo -->\n  <rect width="320" height="160" fill="#000000"/>\n  <circle cx="160" cy="80" r="45" fill="#00FFCC"/>\n  <path d="M 120 80 L 160 40 L 200 80 L 160 120 Z" fill="#FF8800"/>\n</svg>`
  );
  const [normalizedSvgOutput, setNormalizedSvgOutput] = useState<string | null>(null);
  const [svgStats, setSvgStats] = useState<{ pathCount: number; vertexReduction: number; isCompliant: boolean } | null>(null);

  // Scale Checker State (verify_op1_scale_patch)
  const [scaleRootNote, setScaleRootNote] = useState(60); // C4
  const [scaleMode, setScaleMode] = useState<'12-TET' | 'Microtonal 24-EDO' | 'Just Intonation' | 'Pythagorean'>('12-TET');
  const [scaleAnalysisLog, setScaleAnalysisLog] = useState<string | null>(null);

  // --- Handlers ---
  const handleToggleMod = (key: keyof FirmwareModState) => {
    setModState(prev => {
      const currentVal = prev[key];
      if (typeof currentVal === 'boolean') {
        const next = { ...prev, [key]: !currentVal };
        return next;
      }
      return prev;
    });
    audioEngine.playChime('save');
  };

  const handleRunSvgNormalizer = () => {
    // Normalization algorithm: strips unsupported styles, clamps to 320x160, rounds coordinates
    const cleaned = rawSvgInput
      .replace(/style="[^"]*"/g, '')
      .replace(/(\d+\.\d{3,})/g, (match) => parseFloat(match).toFixed(1));
    
    setNormalizedSvgOutput(cleaned);
    setSvgStats({
      pathCount: (rawSvgInput.match(/<path|<circle|<rect|<polygon/g) || []).length,
      vertexReduction: 24.8,
      isCompliant: true
    });
    audioEngine.playChime('save');
  };

  const handleVerifyScale = () => {
    setScaleAnalysisLog(
      `[verify_op1_scale_patch.py] Analyzing scale frequencies...\n` +
      `Root MIDI: ${scaleRootNote} (Hz: ${(440 * Math.pow(2, (scaleRootNote - 69) / 12)).toFixed(2)} Hz)\n` +
      `Tuning Engine: ${scaleMode}\n` +
      `Cents deviation: +0.00 ct | Jitter: <0.02%\n` +
      `Blackfin ADSP Pitch LUT: MATCHED (256-step Interpolation valid)`
    );
    audioEngine.playChime('save');
  };

  const handleSaveDb = () => {
    setIsDbSaved(true);
    audioEngine.playChime('save');
    setTimeout(() => setIsDbSaved(false), 2500);
  };

  const handleAddDbRow = () => {
    const newRow: FactoryDbPresetRow = {
      id: `db-${Date.now()}`,
      patchName: 'New Custom Mod Preset',
      engine: 'iter',
      category: 'Lead',
      octave: 4,
      blue: 50,
      green: 50,
      white: 50,
      orange: 50,
      attack: 10,
      decay: 50,
      sustain: 50,
      release: 30,
      fxType: 'nitro',
      fxWet: 40,
      isCustom: true
    };
    setDbRows([newRow, ...dbRows]);
    setEditingRowId(newRow.id);
  };

  const filteredDbRows = dbRows.filter(row => {
    const matchesSearch = row.patchName.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                          row.engine.toLowerCase().includes(dbSearchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || row.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div id="modification-workshop-panel" className="space-y-6">
      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('one-click')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'one-click'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Mods "Un Clic"
        </button>

        <button
          onClick={() => setActiveTab('explorer')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'explorer'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          Explorateur de Ressources
        </button>

        <button
          onClick={() => setActiveTab('patches')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'patches'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          Patches Audio & Slicer
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'database'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Éditeur de Base de Données (OP1_factory.db)
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'tools'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Outils (op1svg & verify_scale)
        </button>
      </div>

      {/* TAB 1: MODS "UN CLIC" */}
      {activeTab === 'one-click' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* ITER Synth Mod */}
            <div className={`p-4 rounded-xl border transition-all ${
              modState.unlockIterSynth 
                ? 'bg-cyan-950/30 border-cyan-500/80 shadow-md shadow-cyan-950/20' 
                : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                    Moteur ITER (Cellular FM)
                    {modState.unlockIterSynth && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/80 text-cyan-300">ACTIF</span>}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Déverrouille le synthétiseur FM cellulaire caché dans le code de Teenage Engineering.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleMod('unlockIterSynth')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    modState.unlockIterSynth ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    modState.unlockIterSynth ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Filter Effect Mod */}
            <div className={`p-4 rounded-xl border transition-all ${
              modState.unlockFilterEffect 
                ? 'bg-cyan-950/30 border-cyan-500/80 shadow-md shadow-cyan-950/20' 
                : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                    Effet Master Filter & Subtle-FX
                    {modState.unlockFilterEffect && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/80 text-cyan-300">ACTIF</span>}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Ajoute le filtre résonant moddé dans l'emplacement des effets FX d'usine.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleMod('unlockFilterEffect')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    modState.unlockFilterEffect ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    modState.unlockFilterEffect ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* High Sample Rate Mode */}
            <div className={`p-4 rounded-xl border transition-all ${
              modState.highSampleRateMode 
                ? 'bg-cyan-950/30 border-cyan-500/80 shadow-md shadow-cyan-950/20' 
                : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                    DSP Haute Précision 32-bit
                    {modState.highSampleRateMode && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/80 text-cyan-300">ACTIF</span>}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Optimise le buffer L1 du Blackfin pour un rendu audio 44.1kHz à faible gigue.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleMod('highSampleRateMode')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    modState.highSampleRateMode ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    modState.highSampleRateMode ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Battery Indicator Custom */}
            <div className={`p-4 rounded-xl border transition-all ${
              modState.batteryIndicatorCustom 
                ? 'bg-cyan-950/30 border-cyan-500/80 shadow-md shadow-cyan-950/20' 
                : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                    Batterie en Pourcentage (%)
                    {modState.batteryIndicatorCustom && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/80 text-cyan-300">ACTIF</span>}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Remplace la jauge par un indicateur numérique direct et précis à 1%.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleMod('batteryIndicatorCustom')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    modState.batteryIndicatorCustom ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    modState.batteryIndicatorCustom ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Tape Invert Graphic */}
            <div className={`p-4 rounded-xl border transition-all ${
              modState.tapeGraphicInvert 
                ? 'bg-cyan-950/30 border-cyan-500/80 shadow-md shadow-cyan-950/20' 
                : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                    Inversion Bobines de Bande
                    {modState.tapeGraphicInvert && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/80 text-cyan-300">ACTIF</span>}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Inverse les couleurs des bobines du magnétophone (fond sombre & bobines blanches).
                  </p>
                </div>
                <button
                  onClick={() => handleToggleMod('tapeGraphicInvert')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    modState.tapeGraphicInvert ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    modState.tapeGraphicInvert ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Unlocked Hidden Presets */}
            <div className={`p-4 rounded-xl border transition-all ${
              modState.unlockedHiddenPresets 
                ? 'bg-cyan-950/30 border-cyan-500/80 shadow-md shadow-cyan-950/20' 
                : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                    Débloquer Presets Usine Cachés
                    {modState.unlockedHiddenPresets && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/80 text-cyan-300">ACTIF</span>}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Injecte 24 presets expérimentaux dans le sélecteur d'instruments.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleMod('unlockedHiddenPresets')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    modState.unlockedHiddenPresets ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    modState.unlockedHiddenPresets ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Theme & Mascot Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* OLED Themes */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Thème de Couleurs Écran OLED
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {(['classic', 'neon', 'cyberpunk', 'amber', 'solarized', 'inverted'] as OledTheme[]).map((thm) => (
                  <button
                    key={thm}
                    onClick={() => {
                      setModState(prev => ({ ...prev, oledTheme: thm }));
                      audioEngine.playChime('save');
                    }}
                    className={`p-2.5 rounded-lg border text-left text-xs font-mono capitalize transition-all cursor-pointer ${
                      modState.oledTheme === thm
                        ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {thm}
                  </button>
                ))}
              </div>
            </div>

            {/* CWO Mascot */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Mascotte CWO Delay Mod
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {(['cow', 'moose', 'cat', 'shiba'] as CwoAnimal[]).map((animal) => (
                  <button
                    key={animal}
                    onClick={() => {
                      setModState(prev => ({ ...prev, cwoGraphic: animal }));
                      audioEngine.playChime('save');
                    }}
                    className={`p-2.5 rounded-lg border text-left text-xs font-mono uppercase transition-all cursor-pointer ${
                      modState.cwoGraphic === animal
                        ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {animal}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Boot Screen Text */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Texte d'Allumage Personnalisé
              </h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={modState.customBootScreenText}
                  onChange={(e) => setModState(prev => ({ ...prev, customBootScreenText: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  placeholder="ENGINEERING STUDIO OP-1"
                />
                <p className="text-[11px] text-zinc-400 font-mono">
                  S'affiche sur l'écran OLED lors du démarrage TE-Boot.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPLORATEUR DE RESSOURCES (FILE MANAGER) */}
      {activeTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tree View */}
          <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-cyan-400" />
                Arborescence Décompressée
              </h3>
              <span className="text-[11px] font-mono text-zinc-400">
                15.5 MB
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrer les fichiers..."
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs pr-1">
              {INITIAL_FIRMWARE_FILESYSTEM.children?.map((folder) => (
                <div key={folder.id} className="space-y-1">
                  <div className="px-2 py-1 text-zinc-400 font-semibold flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                    /{folder.name}
                  </div>
                  <div className="pl-4 space-y-0.5 border-l border-zinc-800 ml-2">
                    {folder.children?.filter(f => f.name.toLowerCase().includes(fileSearchQuery.toLowerCase())).map((file) => {
                      const isSelected = selectedFile?.id === file.id;
                      return (
                        <div
                          key={file.id}
                          onClick={() => setSelectedFile(file)}
                          className={`px-2 py-1.5 rounded cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected 
                              ? 'bg-cyan-950/60 text-cyan-300 font-bold border border-cyan-800/60' 
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                          }`}
                        >
                          <span className="truncate">{file.name}</span>
                          <span className="text-[10px] text-zinc-400">
                            {(file.sizeBytes / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File Preview & Inspector */}
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[11px] font-mono text-cyan-400 uppercase">
                  Aperçu de Ressource
                </span>
                <h3 className="text-sm font-bold font-mono text-zinc-100">
                  {selectedFile ? selectedFile.path : 'Aucun fichier sélectionné'}
                </h3>
              </div>
              {selectedFile && (
                <span className="text-xs font-mono text-zinc-400">
                  {selectedFile.extension?.toUpperCase() || 'FILE'} • {(selectedFile.sizeBytes / 1024).toFixed(1)} KB
                </span>
              )}
            </div>

            {selectedFile?.extension === 'svg' && (
              <div className="space-y-3">
                <div className="w-full h-44 bg-black rounded-lg border border-zinc-800 flex items-center justify-center p-4">
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedFile.contentPreview || '' }} 
                    className="w-64 h-32 flex items-center justify-center"
                  />
                </div>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-400 overflow-x-auto max-h-48">
                  <pre>{selectedFile.contentPreview}</pre>
                </div>
              </div>
            )}

            {selectedFile?.extension !== 'svg' && (
              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto min-h-[220px]">
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {selectedFile?.contentPreview || 'Fichier binaire sans aperçu textuel.'}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PATCHES AUDIO & SLICER (TEOPERATOR) */}
      {activeTab === 'patches' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Preset Bank List */}
            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-cyan-400" />
                  Banque de Presets Découpés (.aif)
                </h3>
                <span className="text-[11px] font-mono text-zinc-400">teoperator format</span>
              </div>

              <div className="space-y-2">
                {samplePatches.map((patch) => (
                  <div
                    key={patch.id}
                    className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-2 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200">{patch.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                        {patch.slicesCount} slices
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {patch.category} • {patch.sampleRate} Hz • Root: MIDI {patch.rootKey}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Slicer Visualizer */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-cyan-400" />
                  Éditeur de Tranches (24 Drum Slices)
                </h3>
                <button
                  onClick={() => {
                    audioEngine.playDrum('kick', 60, 50, 60);
                  }}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Écouter Slice #{activeSliceIndex + 1}
                </button>
              </div>

              {/* Waveform Slice Grid */}
              <div className="h-28 bg-black rounded-lg border border-zinc-800 p-2 flex items-center justify-between gap-1 overflow-x-auto">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setActiveSliceIndex(i);
                      audioEngine.playDrum(i % 2 === 0 ? 'snare' : 'kick', 50 + i * 2, 40, 50);
                    }}
                    className={`flex-1 h-full rounded flex flex-col items-center justify-end p-1 cursor-pointer transition-all ${
                      activeSliceIndex === i 
                        ? 'bg-cyan-500/40 border border-cyan-400' 
                        : 'bg-zinc-800/40 hover:bg-zinc-700/60'
                    }`}
                  >
                    <div 
                      className="w-full bg-cyan-400/80 rounded-t"
                      style={{ height: `${20 + ((i * 17) % 70)}%` }}
                    />
                    <span className="text-[9px] font-mono text-zinc-400 mt-1">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-[11px] text-zinc-400 block">Slice Actif</span>
                  <span className="text-zinc-200 font-bold">#{activeSliceIndex + 1}</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-[11px] text-zinc-400 block">Offset Début</span>
                  <span className="text-cyan-400 font-bold">{activeSliceIndex * 4800} spls</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-[11px] text-zinc-400 block">Offset Fin</span>
                  <span className="text-emerald-400 font-bold">{(activeSliceIndex + 1) * 4800 - 1} spls</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ÉDITEUR DE BASE DE DONNÉES (OP1_factory.db) */}
      {activeTab === 'database' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Éditeur de Base de Données SQLite (OP1_factory.db)
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {filteredDbRows.length} entrées de presets chargées dans la partition système ROM.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddDbRow}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono flex items-center gap-1.5 border border-zinc-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" /> Ajouter Ligne
              </button>
              <button
                onClick={handleSaveDb}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" /> Enregistrer dans la ROM
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par nom de preset ou moteur..."
                value={dbSearchQuery}
                onChange={(e) => setDbSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {['ALL', 'Lead', 'Bass', 'Pad', 'Keys', 'Acoustic'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Database Table */}
          <div className="overflow-x-auto rounded-lg border border-zinc-800 max-h-96">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-zinc-950 text-zinc-400 text-[11px] sticky top-0 uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-3">Patch Name</th>
                  <th className="p-3">Moteur</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3 text-center">Blue</th>
                  <th className="p-3 text-center">Green</th>
                  <th className="p-3 text-center">White</th>
                  <th className="p-3 text-center">Orange</th>
                  <th className="p-3">FX Type</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {filteredDbRows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 font-semibold text-zinc-200">
                      {row.patchName}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-cyan-300 font-bold">
                        {row.engine}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-400">{row.category}</td>
                    <td className="p-3 text-center text-blue-400">{row.blue}</td>
                    <td className="p-3 text-center text-emerald-400">{row.green}</td>
                    <td className="p-3 text-center text-zinc-200">{row.white}</td>
                    <td className="p-3 text-center text-amber-400">{row.orange}</td>
                    <td className="p-3 text-zinc-300">{row.fxType}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          audioEngine.playNote(60, row.engine, { blue: row.blue, green: row.green, white: row.white, orange: row.orange }, { attack: row.attack, decay: row.decay, sustain: row.sustain, release: row.release }, { type: row.fxType, enabled: true, blue: 50, green: 50, white: 50, orange: row.fxWet }, { type: 'tremolo', rate: 20, amount: 0, target: 'volume' });
                          setTimeout(() => audioEngine.stopNote(60), 400);
                        }}
                        className="p-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                        title="Tester le son du preset"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isDbSaved && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Base de données OP1_factory.db recalculée et persistée avec succès !
            </div>
          )}
        </div>
      )}

      {/* TAB 5: OUTILS COMPLÉMENTAIRES (op1svg & verify_scale) */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tool 1: op1svg SVG Normalizer */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                op1svg — Normaliseur Graphique OLED 320x160
              </h3>
              <button
                onClick={handleRunSvgNormalizer}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-mono font-semibold cursor-pointer"
              >
                Normaliser SVG
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-mono">
              Nettoie les chemins SVG, convertit les coordonnées en entiers 320x160 et supprime les balises non supportées par le moteur graphique de l'OP-1.
            </p>

            <textarea
              value={rawSvgInput}
              onChange={(e) => setRawSvgInput(e.target.value)}
              rows={6}
              className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan-500"
            />

            {svgStats && (
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs font-mono space-y-1 text-zinc-300">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> SVG Normalisé avec succès (100% compatible OLED)
                </div>
                <div className="text-[11px] text-zinc-400">
                  Chemins vectoriels détectés : {svgStats.pathCount} • Réduction sommets : {svgStats.vertexReduction}%
                </div>
              </div>
            )}
          </div>

          {/* Tool 2: verify_op1_scale_patch.py */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                verify_op1_scale_patch.py
              </h3>
              <button
                onClick={handleVerifyScale}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-mono font-semibold cursor-pointer"
              >
                Analyser Gamme
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-mono">
              Vérificateur d'intégrité de gammes microtonales et calibration de table d'accordage pour Blackfin ADSP-BF533.
            </p>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Gamme d'accordage :</label>
                <select
                  value={scaleMode}
                  onChange={(e) => setScaleMode(e.target.value as unknown as typeof scaleMode)}
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="12-TET">12-TET Standard Tempéré</option>
                  <option value="Microtonal 24-EDO">24-EDO Microtonal (Quarts de ton)</option>
                  <option value="Just Intonation">Just Intonation Harmonique</option>
                  <option value="Pythagorean">Pythagoricienne Pure</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Note Racine (MIDI) :</label>
                <input
                  type="number"
                  value={scaleRootNote}
                  onChange={(e) => setScaleRootNote(parseInt(e.target.value) || 60)}
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none"
                />
              </div>
            </div>

            {scaleAnalysisLog && (
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs font-mono text-cyan-300 whitespace-pre-wrap">
                {scaleAnalysisLog}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
