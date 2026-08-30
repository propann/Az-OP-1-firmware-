import { WorkspaceProject, FirmwareFileNode, WorkspaceAuditReport } from '../types';

export const INITIAL_WORKSPACE_FILE_TREE: FirmwareFileNode[] = [
  {
    id: 'dir-synth',
    name: 'synth',
    path: '/synth',
    type: 'folder',
    sizeBytes: 3145728,
    children: [
      {
        id: 'file-iter-engine',
        name: 'iter_cellular.json',
        path: '/synth/iter_cellular.json',
        type: 'file',
        sizeBytes: 4096,
        extension: 'json',
        contentPreview: '{\n  "engine": "iter",\n  "name": "Cellular FM",\n  "version": "2.46-unlocked",\n  "knobs": ["density", "feedback", "cutoff", "resonance"],\n  "algorithms": 4,\n  "polyphony": 6\n}'
      },
      {
        id: 'file-granular-engine',
        name: 'granular_glitch.json',
        path: '/synth/granular_glitch.json',
        type: 'file',
        sizeBytes: 5120,
        extension: 'json',
        contentPreview: '{\n  "engine": "granular",\n  "name": "Granular Cloud",\n  "grain_size_ms": 45,\n  "density_hz": 120,\n  "scatter": 0.35,\n  "dsp_hook": "0xFFA01200"\n}'
      },
      {
        id: 'file-sid-engine',
        name: 'sid6581_chip.json',
        path: '/synth/sid6581_chip.json',
        type: 'file',
        sizeBytes: 3800,
        extension: 'json',
        contentPreview: '{\n  "engine": "sidchip",\n  "model": "MOS-6581-R4",\n  "pulse_width": 0.5,\n  "hard_sync": true,\n  "filter_mode": "bandpass"\n}'
      },
      {
        id: 'file-acid-engine',
        name: 'acid303_diode.json',
        path: '/synth/acid303_diode.json',
        type: 'file',
        sizeBytes: 4200,
        extension: 'json',
        contentPreview: '{\n  "engine": "acid303",\n  "filter_topology": "18dB_diode_ladder",\n  "slide_time_ms": 65,\n  "accent_boost_db": 6.0\n}'
      },
      {
        id: 'file-preset-ambient-iter',
        name: 'preset_ambient_cellular.json',
        path: '/synth/preset_ambient_cellular.json',
        type: 'file',
        sizeBytes: 2048,
        extension: 'json',
        contentPreview: '{\n  "name": "Sub-Atomic Glitch",\n  "engine": "iter",\n  "params": [64, 72, 80, 45],\n  "adsr": [8, 45, 60, 35],\n  "fx": "cwo"\n}'
      }
    ]
  },
  {
    id: 'dir-drum',
    name: 'drum',
    path: '/drum',
    type: 'folder',
    sizeBytes: 5242880,
    children: [
      {
        id: 'file-drum-dink',
        name: 'dink_electro.aif',
        path: '/drum/dink_electro.aif',
        type: 'file',
        sizeBytes: 1572864,
        extension: 'aif',
        contentPreview: '[AIFF Audio Container - 44.1kHz 16-bit Mono]\nChunks: COMM, SSND, APPL (OP-1 Drum Slice Metadata 24 Tranches)'
      },
      {
        id: 'file-drum-808',
        name: 'analog_808_mod.aif',
        path: '/drum/analog_808_mod.aif',
        type: 'file',
        sizeBytes: 1835008,
        extension: 'aif',
        contentPreview: '[AIFF Audio Container - 44.1kHz 16-bit Mono]\nChunks: COMM, SSND, APPL (OP-1 Drum Slice Metadata 24 Tranches)'
      }
    ]
  },
  {
    id: 'dir-gfx',
    name: 'gfx',
    path: '/gfx',
    type: 'folder',
    sizeBytes: 819200,
    children: [
      {
        id: 'file-cwo-cow',
        name: 'cwo_cow_vector.svg',
        path: '/gfx/cwo_cow_vector.svg',
        type: 'file',
        sizeBytes: 12288,
        extension: 'svg',
        contentPreview: '<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">\n  <!-- OP-1 CWO Delay Cow Graphic Screen -->\n  <rect width="320" height="160" fill="#000" />\n  <path d="M120,60 L140,40 L180,40 L200,60 L190,110 L130,110 Z" stroke="#00f3ff" fill="none" stroke-width="2"/>\n</svg>'
      },
      {
        id: 'file-boot-logo',
        name: 'boot_logo_custom.svg',
        path: '/gfx/boot_logo_custom.svg',
        type: 'file',
        sizeBytes: 8192,
        extension: 'svg',
        contentPreview: '<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">\n  <text x="160" y="80" text-anchor="middle" fill="#ff7700" font-family="monospace">Az-OP-1 ENGINEERING LAB v2.46</text>\n</svg>'
      }
    ]
  },
  {
    id: 'dir-system',
    name: 'system',
    path: '/system',
    type: 'folder',
    sizeBytes: 6291456,
    children: [
      {
        id: 'file-sqlite-db',
        name: 'OP1_factory.db',
        path: '/system/OP1_factory.db',
        type: 'file',
        sizeBytes: 32768,
        extension: 'db',
        contentPreview: 'SQLite format 3\nTables: presets, engines, drumkits, patches, system_config\nEntries: 32 Presets, 20 Engines registered'
      },
      {
        id: 'file-blackfin-ldr',
        name: 'firmware.ldr',
        path: '/system/firmware.ldr',
        type: 'file',
        sizeBytes: 4194304,
        extension: 'ldr',
        contentPreview: '[ADSP-BF533 Blackfin Loader Binary Block Header]\nTarget Arch: ADSP-BF533\nL1 SRAM Code Address: 0xFFA00000\nCRC32 Checksum: 0xA4F2C991'
      }
    ]
  },
  {
    id: 'dir-dsp-custom',
    name: 'dsp_custom',
    path: '/dsp_custom',
    type: 'folder',
    sizeBytes: 1048576,
    children: [
      {
        id: 'file-dsp-granular-cpp',
        name: 'engine_granular.cpp',
        path: '/dsp_custom/engine_granular.cpp',
        type: 'file',
        sizeBytes: 14336,
        extension: 'txt',
        contentPreview: `// ADSP-BF533 C++ DSP Hook: Granular Glitch Cloud
#include "op1_dsp_runtime.h"

class GranularGlitchEngine : public IOP1DspEngine {
public:
    void init(float sampleRate) override {
        m_sampleRate = sampleRate;
        m_grainHead = 0;
        m_densityHz = 120.0f;
    }

    void processBlock(float* inL, float* inR, float* outL, float* outR, int blockSize) override {
        for (int i = 0; i < blockSize; ++i) {
            float grainSample = generateGrain(m_densityHz);
            outL[i] = grainSample * 0.7f;
            outR[i] = grainSample * 0.7f;
        }
    }
};`
      },
      {
        id: 'file-dsp-sid-cpp',
        name: 'engine_sid6581.cpp',
        path: '/dsp_custom/engine_sid6581.cpp',
        type: 'file',
        sizeBytes: 12288,
        extension: 'txt',
        contentPreview: `// ADSP-BF533 C++ DSP Hook: MOS Technology 6581 SID Emulation
#include "op1_dsp_runtime.h"

class Sid6581Engine : public IOP1DspEngine {
    uint32_t m_phaseAccumulator;
    uint32_t m_phaseStep;
    uint16_t m_pulseWidth;
public:
    void setNote(uint8_t midiNote) override {
        m_phaseStep = noteToFreqStep(midiNote);
    }
};`
      }
    ]
  }
];

export const INITIAL_AUDIT_REPORT: WorkspaceAuditReport = {
  totalFiles: 14,
  totalSizeBytes: 16538624,
  linesOfCode: 2840,
  dspCyclesPeak: 642,
  memorySafetyStatus: 'SAFE',
  crc32Computed: '0xA4F2C991',
  antiBrickCheckPassed: true,
  checklist: [
    {
      title: 'Vérification Signature Bootloader TE (v1.02.4)',
      passed: true,
      details: 'En-tête signé reconnu par le chargeur matériel TE-Boot sans rejet EEPROM.'
    },
    {
      title: 'Alignement Mémoire L1 SRAM (0xFFA00000)',
      passed: true,
      details: 'Tous les hooks DSP sont alignés sur frontières 32-bit (0x04) sans débordement de pile.'
    },
    {
      title: 'Plafond Temps Réel DSP (9070 Cycles max)',
      passed: true,
      details: 'Pic mesuré sur émulateur : 642 cycles / échantillon à 44.1 kHz (Charge DSP 7.1%).'
    },
    {
      title: 'Cohérence Base de Données SQLite (OP1_factory.db)',
      passed: true,
      details: '32 presets validés, clé primaire intègre, aucun pointeur NULL dans la table synth_engines.'
    },
    {
      title: 'Conteneur LZMA & Checksum CRC32 (0xA4F2C991)',
      passed: true,
      details: 'Le flux compressé décompresse avec 0 erreur. Le CRC32 correspond au descripteur TE.'
    },
    {
      title: 'Test Banc d\'Émulation op1emu (320x160 OLED @ 60 FPS)',
      passed: true,
      details: 'Émulation réussie à 60 FPS avec 100% de conformité audio et aucun artefact graphique.'
    }
  ]
};

export const INITIAL_WORKSPACES: WorkspaceProject[] = [
  {
    id: 'ws-proj-1',
    name: 'Projet Lab v246 (20 Moteurs DSP & ITER Déverrouillé)',
    path: '/workspace/op1_v246_engineering_lab',
    description: 'Espace de travail principal avec injection des 8 moteurs C++ Blackfin, déverrouillage de ITER, Nitro FX et mascottes CWO.',
    sourceFirmwareId: 'op1-fw-246-mod',
    createdAt: '2024-11-18 10:30',
    updatedAt: '2024-11-18 14:22',
    sizeMb: 15.77,
    status: 'MODDED',
    filesCount: 14,
    patchesCount: 8,
    dspEnginesCount: 20,
    tree: INITIAL_WORKSPACE_FILE_TREE,
    auditReport: INITIAL_AUDIT_REPORT
  },
  {
    id: 'ws-proj-2',
    name: 'Stock Factory v243 (Standard d\'Usine Propre)',
    path: '/workspace/op1_v243_factory_clean',
    description: 'Copie dépaquetée propre du firmware d\'usine officiel v243 servant de référence de diff et de restauration de secours.',
    sourceFirmwareId: 'op1-fw-243-stock',
    createdAt: '2024-10-12 09:15',
    updatedAt: '2024-10-12 09:20',
    sizeMb: 14.21,
    status: 'UNPACKED',
    filesCount: 11,
    patchesCount: 0,
    dspEnginesCount: 12,
    tree: INITIAL_WORKSPACE_FILE_TREE,
    auditReport: {
      ...INITIAL_AUDIT_REPORT,
      crc32Computed: '0x8B39DF12',
      checklist: INITIAL_AUDIT_REPORT.checklist.map(c => ({ ...c, passed: true }))
    }
  }
];
