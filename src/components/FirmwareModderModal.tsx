import React, { useState } from 'react';
import { FirmwareModState, CwoAnimal, OledTheme } from '../types';
import { audioEngine } from '../audio/engine';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Cpu, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  Flame, 
  Palette, 
  Sliders, 
  Tv, 
  FolderTree, 
  X,
  FileCode
} from 'lucide-react';

interface FirmwareModderModalProps {
  isOpen: boolean;
  onClose: () => void;
  modState: FirmwareModState;
  onUpdateModState: (newModState: FirmwareModState) => void;
  onTriggerBootFlash: () => void;
}

export const FirmwareModderModal: React.FC<FirmwareModderModalProps> = ({
  isOpen,
  onClose,
  modState,
  onUpdateModState,
  onTriggerBootFlash
}) => {
  const [activeTab, setActiveTab] = useState<'mods' | 'visuals' | 'fs' | 'repack'>('mods');
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashLogs, setFlashLogs] = useState<string[]>([]);
  const [bootText, setBootText] = useState(modState.customBootScreenText);

  if (!isOpen) return null;

  const handleToggleMod = (key: keyof FirmwareModState) => {
    const updated = {
      ...modState,
      [key]: !modState[key]
    };
    onUpdateModState(updated);
  };

  const handleAnimalChange = (animal: CwoAnimal) => {
    onUpdateModState({
      ...modState,
      cwoGraphic: animal
    });
  };

  const handleThemeChange = (theme: OledTheme) => {
    onUpdateModState({
      ...modState,
      oledTheme: theme
    });
  };

  const handleSaveBootText = () => {
    onUpdateModState({
      ...modState,
      customBootScreenText: bootText
    });
  };

  const handleFlashFirmware = () => {
    setIsFlashing(true);
    setFlashProgress(0);
    setFlashLogs(['[AZ-REPACKER] Decompressing LZMA archive...', '[AZ-REPACKER] Parsing TE OP-1 firmware container...']);

    let step = 0;
    const interval = setInterval(() => {
      step += 20;
      setFlashProgress(step);

      if (step === 40) {
        setFlashLogs(prev => [...prev, `[PATCH] Injecting Iter cellular synth engine... (0x4F9B2)`, `[PATCH] Unlocking Filter FX module... (0x12A0)`]);
      } else if (step === 60) {
        setFlashLogs(prev => [...prev, `[GFX] Patching OLED screen buffers for '${modState.cwoGraphic}' CWO animal...`, `[THEME] Applying '${modState.oledTheme}' LUT color profile...`]);
      } else if (step === 80) {
        setFlashLogs(prev => [...prev, `[REPACK] Rebuilding TAR archive and running LZMA compression...`]);
      } else if (step >= 100) {
        clearInterval(interval);
        setFlashLogs(prev => [...prev, `[SUCCESS] Firmware verification passed! CRC32: 0x8FA43BD1`, `[BOOT] Flashing device EEPROM and rebooting OP-1...`]);
        
        setTimeout(() => {
          setIsFlashing(false);
          onUpdateModState({
            ...modState,
            flashCount: modState.flashCount + 1,
            firmwareVersion: `Az-OP-1 v${modState.baseVersion}-Custom#${modState.flashCount + 1}`
          });
          audioEngine.playChime('flash');
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
          onTriggerBootFlash();
          onClose();
        }, 1000);
      }
    }, 400);
  };

  const handleDownloadFirmware = () => {
    const fwData = {
      name: "Az-OP-1 Custom Modded Firmware",
      repo: "propann/Az-OP-1-firmware-",
      baseVersion: modState.baseVersion,
      mods: {
        unlockIterSynth: modState.unlockIterSynth,
        unlockFilterEffect: modState.unlockFilterEffect,
        subtleFx: modState.subtleFx,
        cwoGraphic: modState.cwoGraphic,
        oledTheme: modState.oledTheme,
        tapeGraphicInvert: modState.tapeGraphicInvert,
        customBootScreenText: modState.customBootScreenText
      },
      exportedAt: new Date().toISOString(),
      format: "OP-1 LZMA Container (.op1)"
    };

    const blob = new Blob([JSON.stringify(fwData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `op1_custom_mod_v${modState.baseVersion}.op1`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    audioEngine.playChime('save');
  };

  const handleResetDefaults = () => {
    onUpdateModState({
      firmwareVersion: 'OP-1 Factory v243',
      baseVersion: '243',
      buildDate: '2024-04-12',
      unlockIterSynth: true,
      unlockFilterEffect: true,
      subtleFx: false,
      cwoGraphic: 'cow',
      oledTheme: 'classic',
      tapeGraphicInvert: false,
      customBootScreenText: 'Az-OP-1 Studio',
      batteryIndicatorCustom: false,
      highSampleRateMode: true,
      unlockedHiddenPresets: true,
      flashCount: 0,
      customDspEnginesUnlocked: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Az-OP-1 Firmware Modder & Patcher
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                  v{modState.baseVersion} MOD
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Teenage Engineering OP-1 Custom Firmware Engine & Asset Repacker
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 border-b border-neutral-800 bg-neutral-900/50">
          <button
            onClick={() => setActiveTab('mods')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'mods'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            DSP & Synth Mods
          </button>
          <button
            onClick={() => setActiveTab('visuals')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'visuals'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Visual & OLED Themes
          </button>
          <button
            onClick={() => setActiveTab('fs')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'fs'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            Firmware File Tree
          </button>
          <button
            onClick={() => setActiveTab('repack')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'repack'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Flash & Repack
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'mods' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-neutral-800/40 border border-neutral-700/60 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span className="font-semibold text-sm text-white">Unlock Hidden "Iter" Synth Engine</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Enables the unreleased cellular FM & additive test-tube synthesizer developed in OP-1 firmware 218/243.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={modState.unlockIterSynth}
                  onChange={() => handleToggleMod('unlockIterSynth')}
                  className="w-5 h-5 rounded accent-orange-500 cursor-pointer mt-1"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-800/40 border border-neutral-700/60 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-sm text-white">Unlock Hidden "Filter" Effect Module</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Adds the secret high-resonance multi-mode state variable filter into the OP-1 master FX slot.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={modState.unlockFilterEffect}
                  onChange={() => handleToggleMod('unlockFilterEffect')}
                  className="w-5 h-5 rounded accent-orange-500 cursor-pointer mt-1"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-800/40 border border-neutral-700/60 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-sm text-white">Subtle FX Mod (Headroom Balance)</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Rebalances wet/dry effect scaling so delay and reverb maintain pristine clean headroom without clipping.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={modState.subtleFx}
                  onChange={() => handleToggleMod('subtleFx')}
                  className="w-5 h-5 rounded accent-orange-500 cursor-pointer mt-1"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-800/40 border border-neutral-700/60 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-sm text-white">Unlock Modded Community Sound Presets</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Loads custom sound designer patches created specifically for modified OP-1 firmware builds.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={modState.unlockedHiddenPresets}
                  onChange={() => handleToggleMod('unlockedHiddenPresets')}
                  className="w-5 h-5 rounded accent-orange-500 cursor-pointer mt-1"
                />
              </div>
            </div>
          )}

          {activeTab === 'visuals' && (
            <div className="space-y-4">
              {/* CWO Animal Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  CWO Frequency Animal Mascot
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['cow', 'moose', 'cat', 'shiba'] as CwoAnimal[]).map((animal) => (
                    <button
                      key={animal}
                      onClick={() => handleAnimalChange(animal)}
                      className={`p-3 rounded-lg border text-center text-xs font-semibold capitalize transition ${
                        modState.cwoGraphic === animal
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-neutral-700 bg-neutral-800/30 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <div className="text-xl mb-1">
                        {animal === 'cow' && '🐮'}
                        {animal === 'moose' && '🫎'}
                        {animal === 'cat' && '🐱'}
                        {animal === 'shiba' && '🐕'}
                      </div>
                      {animal}
                    </button>
                  ))}
                </div>
              </div>

              {/* OLED Themes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  OLED Vector Color Palette
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['classic', 'neon', 'cyberpunk', 'amber', 'solarized', 'inverted'] as OledTheme[]).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleThemeChange(theme)}
                      className={`p-2 rounded-lg border text-center text-xs font-medium capitalize transition ${
                        modState.oledTheme === theme
                          ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                          : 'border-neutral-700 bg-neutral-800/30 text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Invert Tape Screen */}
              <div className="p-3.5 rounded-lg bg-neutral-800/40 border border-neutral-700/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-white">Invert 4-Track Tape Graphics</span>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Flips the visual polarity of the tape reels and timeline ribbons.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={modState.tapeGraphicInvert}
                  onChange={() => handleToggleMod('tapeGraphicInvert')}
                  className="w-5 h-5 rounded accent-orange-500 cursor-pointer"
                />
              </div>

              {/* Custom Boot Text */}
              <div className="p-3.5 rounded-lg bg-neutral-800/40 border border-neutral-700/60 space-y-2">
                <label className="block text-xs font-semibold text-white">
                  Custom OLED Boot Screen Text
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bootText}
                    onChange={(e) => setBootText(e.target.value)}
                    maxLength={24}
                    className="flex-1 px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs font-mono focus:outline-none focus:border-orange-500"
                    placeholder="e.g. Az-OP-1 Studio"
                  />
                  <button
                    onClick={handleSaveBootText}
                    className="px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fs' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 space-y-1">
                <div className="text-neutral-500 text-[10px] pb-1 border-b border-neutral-800 flex justify-between">
                  <span>OP-1 LZMA ARCHIVE DIRECTORY</span>
                  <span>BASE: op1_243.op1</span>
                </div>
                <div className="text-neutral-400 pl-2">📁 /app/</div>
                <div className="text-blue-400 pl-6">📄 synth_engine.dsp (Core Synth Module)</div>
                <div className="text-green-400 pl-6">📄 synth_iter.bin <span className="text-[10px] text-orange-400">[MOD ACTIVE]</span></div>
                <div className="text-neutral-400 pl-6">📄 synth_digital.bin</div>
                <div className="text-neutral-400 pl-6">📄 synth_drwave.bin</div>
                <div className="text-neutral-400 pl-2">📁 /effects/</div>
                <div className="text-green-400 pl-6">📄 fx_filter.bin <span className="text-[10px] text-orange-400">[MOD ACTIVE]</span></div>
                <div className="text-neutral-400 pl-6">📄 fx_cwo.bin ({modState.cwoGraphic}.svg)</div>
                <div className="text-neutral-400 pl-2">📁 /graphics/</div>
                <div className="text-neutral-400 pl-6">📄 boot_splash.raw ({modState.customBootScreenText})</div>
                <div className="text-neutral-400 pl-6">📄 oled_theme.lut ({modState.oledTheme})</div>
                <div className="text-neutral-400 pl-2">📁 /tape/</div>
                <div className="text-neutral-400 pl-6">📄 reel_left.raw, reel_right.raw</div>
              </div>
            </div>
          )}

          {activeTab === 'repack' && (
            <div className="space-y-4">
              {isFlashing ? (
                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-orange-400 font-bold">REPACKING & FLASHING FIRMWARE...</span>
                    <span className="text-neutral-400">{flashProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${flashProgress}%` }}
                    />
                  </div>
                  <div className="p-2.5 rounded bg-black/60 font-mono text-[11px] text-neutral-400 max-h-32 overflow-y-auto space-y-1">
                    {flashLogs.map((log, i) => (
                      <div key={i} className="text-green-400/90">{log}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-neutral-800/30 border border-neutral-700/60 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Live Flash to OP-1 Web Engine</h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                      Packages your selected mods (Iter Synth, Filter FX, {modState.cwoGraphic} CWO mascot, {modState.oledTheme} theme) directly into the active audio processor.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={handleFlashFirmware}
                      className="px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      Flash & Reboot Device
                    </button>
                    <button
                      onClick={handleDownloadFirmware}
                      className="px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition"
                    >
                      <Download className="w-4 h-4" />
                      Export .op1 Archive
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-800 bg-neutral-950/80">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Factory Firmware 243
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
