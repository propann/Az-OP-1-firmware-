import { 
  OfficialFirmwareInfo, 
  FirmwareFileNode, 
  FactoryDbPresetRow, 
  CustomDspEngineDefinition, 
  BlackfinHook, 
  SamplePatch, 
  SvgGraphicAsset 
} from '../types';

export const OFFICIAL_FIRMWARES: OfficialFirmwareInfo[] = [
  {
    id: 'op1-fw-246-mod',
    version: 'v246-ENG-LAB',
    fileName: 'op1_246_engineering_lab.op1',
    buildDate: '2024-11-18',
    bootloaderVer: 'v1.02.4',
    sizeMb: 14.82,
    sha256: '9f83a21b4c5e6d7890123456789abcdef0123456789abcdef0123456789abcde',
    md5: '7e89ab0123cd45ef67890123456789ab',
    crc32: 'A4F2C991',
    isModded: true,
    description: 'Engineering Studio Custom Mod Edition with 20 DSP Engines, Unlocked ITER Synth, Nitro/Filter FX, 4-Track High-Rate Audio, Custom Boot Logos and OLED Themes.',
    features: [
      'Unlocked ITER Cellular FM Synth & Filter Subtle-FX',
      '8 New Blackfin DSP Engines hooked in ROM & L1 SRAM',
      'High Sample Rate Audio Mode (44.1kHz / 32-bit internal)',
      'Custom Boot Screen & OLED Theme Support (Classic, Neon, Amber, Cyberpunk)',
      'Custom CWO Mascot & Battery Indicator'
    ]
  },
  {
    id: 'op1-fw-245-stock',
    version: 'v245-STOCK',
    fileName: 'op1_245.op1',
    buildDate: '2023-01-20',
    bootloaderVer: 'v1.02.4',
    sizeMb: 14.35,
    sha256: 'a245c3d4e5f67890123456789abcdef0123456789abcdef0123456789a24500',
    md5: '2456789012abcdef2456789012abcdef',
    crc32: '9245EE33',
    isModded: false,
    description: 'Official Factory Maintenance Release for final OP-1 Original hardware production runs. Enhanced flash endurance.',
    features: [
      'Factory Maintenance Release (Rev 2 Hardware)',
      'Enhanced Flash Memory Endurance Drivers',
      'Solid-state Tape Engine Timing Fix'
    ]
  },
  {
    id: 'op1-fw-243-stock',
    version: 'v243-STOCK',
    fileName: 'op1_243.op1',
    buildDate: '2022-06-14',
    bootloaderVer: 'v1.02.4',
    sizeMb: 14.21,
    sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    md5: '1234567890abcdef1234567890abcdef',
    crc32: '8B39DF12',
    isModded: false,
    description: 'Official Teenage Engineering release v243. The gold standard stable factory build for OP-1 Original.',
    features: [
      'Gold Standard Official Stable Release',
      'Standard 12 Synth Engines',
      'Standard CWO Delay FX & Nitro Filter',
      'Factory Tape & Drum Kit Banks'
    ]
  },
  {
    id: 'op1-fw-242-stock',
    version: 'v242-STOCK',
    fileName: 'op1_242.op1',
    buildDate: '2021-04-16',
    bootloaderVer: 'v1.02.3',
    sizeMb: 13.95,
    sha256: 'b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef1',
    md5: '2345678901abcdef2345678901abcdef',
    crc32: '6C18E407',
    isModded: false,
    description: 'Major Official Release: 2-way USB Audio streaming to macOS, iOS, Windows and Android devices.',
    features: [
      '2-way USB Audio Class 1.0 Streaming',
      'Host Sync & MIDI CC Improvements',
      'Legacy Bootloader v1.02.3 compatibility'
    ]
  },
  {
    id: 'op1-fw-241-stock',
    version: 'v241-STOCK',
    fileName: 'op1_241.op1',
    buildDate: '2020-11-04',
    bootloaderVer: 'v1.02.2',
    sizeMb: 13.80,
    sha256: 'a241c3d4e5f67890123456789abcdef0123456789abcdef0123456789a24100',
    md5: '2416789012abcdef2416789012abcdef',
    crc32: '7241DC12',
    isModded: false,
    description: 'Official USB MIDI Host and Clock Sync fix for external hardware sequencers.',
    features: [
      'USB MIDI Host Clock Jitter Mitigation',
      'External Arpeggiator Sync Improvements',
      'Battery Voltage Calibration Patch'
    ]
  },
  {
    id: 'op1-fw-235-stock',
    version: 'v235-STOCK',
    fileName: 'op1_235.op1',
    buildDate: '2019-05-14',
    bootloaderVer: 'v1.02.1',
    sizeMb: 13.60,
    sha256: 'a235c3d4e5f67890123456789abcdef0123456789abcdef0123456789a23500',
    md5: '2356789012abcdef2356789012abcdef',
    crc32: '5235BE90',
    isModded: false,
    description: 'Official factory update introducing driver support for the Revision 2 OLED screen panels.',
    features: [
      'Dual OLED Panel Controller Support (Rev 1 & Rev 2)',
      'OLED Refresh Rate Optimization (60Hz)',
      'Power Management Standby Enhancements'
    ]
  },
  {
    id: 'op1-fw-225-stock',
    version: 'v225-STOCK',
    fileName: 'op1_225.op1',
    buildDate: '2018-09-28',
    bootloaderVer: 'v1.01.9',
    sizeMb: 13.40,
    sha256: 'c3d4e5f6a1b27890123456789abcdef0123456789abcdef0123456789abcdef2',
    md5: '3456789012abcdef3456789012abcdef',
    crc32: '49B017DA',
    isModded: false,
    description: 'Historical foundation build used by the op1hacks and op1repacker community for early reverse engineering.',
    features: [
      'Base of op1repacker community reverse engineering',
      'Contains dormant ITER and subtle-fx code in ROM',
      'Classic OLED Display Timing'
    ]
  },
  {
    id: 'op1-fw-218-stock',
    version: 'v218-STOCK',
    fileName: 'op1_218.op1',
    buildDate: '2016-10-12',
    bootloaderVer: 'v1.01.2',
    sizeMb: 12.80,
    sha256: 'd4e5f6a1b2c37890123456789abcdef0123456789abcdef0123456789abcdef3',
    md5: '4567890123abcdef4567890123abcdef',
    crc32: '2F77AA5C',
    isModded: false,
    description: 'Major historic milestone release introducing the Arpeggiator, new PO-Sync modes and tape optimizations.',
    features: [
      'Arpeggiator Sequencer Introduction',
      'Pocket Operator Audio-Sync Mode (PO-Sync)',
      'ADSP-BF533 Memory Optimization'
    ]
  },
  {
    id: 'op1-fw-142-stock',
    version: 'v142-STOCK',
    fileName: 'op1_142.op1',
    buildDate: '2013-03-24',
    bootloaderVer: 'v1.01.1',
    sizeMb: 12.60,
    sha256: 'e142a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789142',
    md5: '1426789012abcdef1426789012abcdef',
    crc32: 'A1425E67',
    isModded: false,
    description: 'Classic v142 firmware introducing Master EQ and dynamics compressor enhancements.',
    features: [
      'Master Output EQ / Drive Refinements',
      'CWO Delay Algorithm Tuning',
      'Drum Slicer Transient Improvements'
    ]
  },
  {
    id: 'op1-fw-140-stock',
    version: 'v140-STOCK',
    fileName: 'op1_140.op1',
    buildDate: '2012-06-19',
    bootloaderVer: 'v1.01.0',
    sizeMb: 12.45,
    sha256: 'e140a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789140',
    md5: '1406789012abcdef1406789012abcdef',
    crc32: 'F1409C11',
    isModded: false,
    description: 'Early iconic firmware introducing DNA synthesizer engine and battery gauge calibration.',
    features: [
      'DNA Synth Engine Introduction',
      'Battery Voltage ADC Curve Mapping',
      'FM Engine Modulation Depth Expansion'
    ]
  },
  {
    id: 'op1-fw-084-stock',
    version: 'v084-STOCK',
    fileName: 'op1_084.op1',
    buildDate: '2011-12-02',
    bootloaderVer: 'v1.00.8',
    sizeMb: 12.10,
    sha256: 'e084a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789084',
    md5: '0846789012abcdef0846789012abcdef',
    crc32: 'E0841A88',
    isModded: false,
    description: 'Vintage 2011 release introducing CWO and Nitro DSP improvements.',
    features: [
      'CWO Frequency Shifter / Delay Polish',
      'Nitro 2-Pole Resonant Filter Engine',
      'Tape 4-track reverse playback stabilization'
    ]
  },
  {
    id: 'op1-fw-076-stock',
    version: 'v076-STOCK',
    fileName: 'op1_076.op1',
    buildDate: '2011-08-15',
    bootloaderVer: 'v1.00.4',
    sizeMb: 11.65,
    sha256: 'e076a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789076',
    md5: '0766789012abcdef0766789012abcdef',
    crc32: 'D0767F31',
    isModded: false,
    description: 'Very early factory build with raw tape engine and vintage sampling routines.',
    features: [
      'Early Tape Engine Architecture',
      'Raw FM & Digital Synth Kernels',
      'First Generation TE-Bootloader (v1.00.4)'
    ]
  },
  {
    id: 'op1-fw-061-stock',
    version: 'v061-STOCK',
    fileName: 'op1_061.op1',
    buildDate: '2011-04-28',
    bootloaderVer: 'v1.00.0',
    sizeMb: 11.20,
    sha256: 'e061a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789061',
    md5: '0616789012abcdef0616789012abcdef',
    crc32: 'C0614A22',
    isModded: false,
    description: 'The Original Debut Firmware (First Factory Release shipped with batch 1 of OP-1 Original).',
    features: [
      'Original 2011 Debut Commercial Firmware',
      'Original 8 Launch Engines (Digital, FM, Pulse, String, Cluster, Phase, Dr Wave, Sampler)',
      'Historic Milestone Artifact'
    ]
  }
];

export interface PythonDevToolDef {
  id: string;
  name: string;
  command: string;
  installCommand: string;
  description: string;
  category: 'repack' | 'preset' | 'vector' | 'crypto' | 'disasm';
  exampleUsage: string;
}

export const PYTHON_DEV_STACK_TOOLS: PythonDevToolDef[] = [
  {
    id: 'op1repacker',
    name: 'op1repacker',
    command: 'op1repacker',
    installCommand: 'pip3 install op1repacker',
    description: 'Le couteau suisse incontournable pour déballer (unpack), modifier (modify) et reconditionner (repack) les firmwares .op1 avec recalcul CRC32 et compression LZMA.',
    category: 'repack',
    exampleUsage: 'op1repacker unpack op1_243.op1\nop1repacker modify op1_243/ --options iter filter\nop1repacker repack op1_243/'
  },
  {
    id: 'opie',
    name: 'opie (OP-1 Patch & Sample Manager)',
    command: 'opie',
    installCommand: 'pip3 install opie',
    description: 'Gestionnaire avancé de presets et de samples OP-1. Permet d\'injecter et d\'extraire les métadonnées de boucles, de tranches de batterie (24 slices) et de pitch dans les fichiers .aif.',
    category: 'preset',
    exampleUsage: 'opie export-preset --input drum_kit.aif --format json\nopie slice-audio sample.wav --slices 24 --out kit.aif'
  },
  {
    id: 'op1svg',
    name: 'op1svg (OLED Vector Normalizer)',
    command: 'op1svg',
    installCommand: 'pip3 install op1svg',
    description: 'Nettoyeur et normalisateur vectoriel SVG pour l\'écran OLED 320x160 de l\'OP-1. Convertit les calques en chemins vectoriels 1-bit / 4-couleurs compatibles avec le moteur graphique.',
    category: 'vector',
    exampleUsage: 'op1svg sanitize custom_mascot.svg --width 320 --height 160 --out cwo_moose.svg'
  },
  {
    id: 'op1-decryptor',
    name: 'op1-decryptor (AES-256 OTP Key Vault)',
    command: 'op1-decryptor',
    installCommand: 'git clone https://github.com/op1hacks/op1-decryptor && cd op1-decryptor && pip3 install -r requirements.txt',
    description: 'Outil cryptographique pour déchiffrer les blocs LDR exécutables de l\'OP-1 à l\'aide des clés AES-256 OTP (Old Key vs New Key) découvertes par la communauté.',
    category: 'crypto',
    exampleUsage: 'python3 op1_decrypt.py --key-otp-new OP1_vdk.ldr.enc --out OP1_vdk.ldr.dec'
  },
  {
    id: 'parse-bfin-ldr',
    name: 'parse_bfin_ldr.py & find_bfin_immediates',
    command: 'parse_bfin_ldr.py',
    installCommand: 'python3 -m pip install capstone',
    description: 'Scripts de rétro-ingénierie Blackfin ADSP-BF533 pour extraire les blocs de chargement LDR, analyser les en-têtes de boot et localiser les tables de constantes et d\'adresses immédiates.',
    category: 'disasm',
    exampleUsage: 'python3 parse_bfin_ldr.py firmware.ldr --show-blocks --dump-l1-sram'
  }
];

export const INITIAL_FIRMWARE_FILESYSTEM: FirmwareFileNode = {
  id: 'root',
  name: 'op1_unpacked_root',
  path: '/',
  type: 'folder',
  sizeBytes: 15542000,
  children: [
    {
      id: 'dir-synth',
      name: 'synth',
      path: '/synth',
      type: 'folder',
      sizeBytes: 4200000,
      children: [
        {
          id: 'file-iter-engine',
          name: 'iter.engine.json',
          path: '/synth/iter.engine.json',
          type: 'file',
          sizeBytes: 2450,
          extension: 'json',
          contentPreview: `{\n  "name": "iter",\n  "type": "cellular_fm",\n  "version": "1.4.0",\n  "dsp_symbol": "_dsp_iter_process",\n  "knobs": {\n    "blue": "Harmonic Ratio (1-8)",\n    "green": "FM Mod Index (0-800Hz)",\n    "white": "Resonant Cutoff",\n    "orange": "Q Resonance / Feedback"\n  },\n  "hidden_flag": 0,\n  "unlocked": true\n}`
        },
        {
          id: 'file-digital-engine',
          name: 'digital.engine.json',
          path: '/synth/digital.engine.json',
          type: 'file',
          sizeBytes: 1820,
          extension: 'json',
          contentPreview: `{\n  "name": "digital",\n  "type": "ring_mod_grit",\n  "knobs": {\n    "blue": "Ring Detune",\n    "green": "Frequency Multiplier",\n    "white": "Brightness Filter",\n    "orange": "Drive / Resonance"\n  }\n}`
        },
        {
          id: 'file-granular-engine',
          name: 'granular_dsp.json',
          path: '/synth/granular_dsp.json',
          type: 'file',
          sizeBytes: 3100,
          extension: 'json',
          contentPreview: `{\n  "name": "Granular Cloud",\n  "author": "Engineering Lab",\n  "dsp_address": "0x002B4910",\n  "grain_density": "20-100Hz",\n  "buffer_size_samples": 4096,\n  "status": "HOOKED_VERIFIED"\n}`
        },
        {
          id: 'file-patches-folder',
          name: 'presets',
          path: '/synth/presets',
          type: 'folder',
          sizeBytes: 3800000,
          children: [
            {
              id: 'file-patch-fm-bell',
              name: 'fm_crystall.aif',
              path: '/synth/presets/fm_crystall.aif',
              type: 'file',
              sizeBytes: 44200,
              extension: 'aif',
              contentPreview: `[AIFF-C OP-1 Audio Patch Header]\nFormat: 44.1kHz 16-bit Mono\nMetadata JSON: {"op1_patch_name":"Crystal FM Bell","engine":"fm","params":[72,85,60,40],"envelope":[5,60,45,40]}`
            },
            {
              id: 'file-patch-acid-lead',
              name: 'acid_resonance.aif',
              path: '/synth/presets/acid_resonance.aif',
              type: 'file',
              sizeBytes: 48900,
              extension: 'aif',
              contentPreview: `[AIFF-C OP-1 Audio Patch Header]\nFormat: 44.1kHz 16-bit Mono\nMetadata JSON: {"op1_patch_name":"303 Squawk","engine":"acid303","params":[45,80,68,90],"envelope":[2,30,0,15]}`
            },
            {
              id: 'file-patch-lofi-pad',
              name: 'drwave_vocal.aif',
              path: '/synth/presets/drwave_vocal.aif',
              type: 'file',
              sizeBytes: 52100,
              extension: 'aif',
              contentPreview: `[AIFF-C OP-1 Audio Patch Header]\nFormat: 44.1kHz 16-bit Mono\nMetadata JSON: {"op1_patch_name":"Vocal Chant Pad","engine":"drwave","params":[35,70,82,65],"envelope":[40,80,70,60]}`
            }
          ]
        }
      ]
    },
    {
      id: 'dir-drum',
      name: 'drum',
      path: '/drum',
      type: 'folder',
      sizeBytes: 3100000,
      children: [
        {
          id: 'file-drum-kit-dink',
          name: 'dink_electro.aif',
          path: '/drum/dink_electro.aif',
          type: 'file',
          sizeBytes: 1204000,
          extension: 'aif',
          contentPreview: `[AIFF-C OP-1 24-Slice Drum Bank]\nSlices: 24\nStart: [0, 4800, 9600, 14400, ...]\nEnd: [4799, 9599, 14399, 19199, ...]\nBit Depth: 16-bit`
        },
        {
          id: 'file-drum-kit-808',
          name: 'analog_808_mod.aif',
          path: '/drum/analog_808_mod.aif',
          type: 'file',
          sizeBytes: 1450000,
          extension: 'aif',
          contentPreview: `[AIFF-C OP-1 24-Slice Drum Bank]\nSlices: 24\nNormalized with teoperator & op1repacker`
        }
      ]
    },
    {
      id: 'dir-gfx',
      name: 'gfx',
      path: '/gfx',
      type: 'folder',
      sizeBytes: 1250000,
      children: [
        {
          id: 'file-cwo-cow-svg',
          name: 'cwo_cow_vector.svg',
          path: '/gfx/cwo_cow_vector.svg',
          type: 'file',
          sizeBytes: 8400,
          extension: 'svg',
          contentPreview: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">\n  <!-- OP-1 Normalized CWO Cow Vector Asset -->\n  <rect width="320" height="160" fill="#000000"/>\n  <path d="M 60 120 Q 80 40 160 40 Q 240 40 260 120 Z" fill="#FFFFFF"/>\n  <circle cx="120" cy="70" r="10" fill="#00FFCC"/>\n  <circle cx="200" cy="70" r="10" fill="#00FFCC"/>\n  <ellipse cx="160" cy="100" rx="35" ry="18" fill="#FF8800"/>\n</svg>`
        },
        {
          id: 'file-cwo-moose-svg',
          name: 'cwo_moose_mod.svg',
          path: '/gfx/cwo_moose_mod.svg',
          type: 'file',
          sizeBytes: 9200,
          extension: 'svg',
          contentPreview: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">\n  <!-- OP-1 Moose Mod Asset -->\n  <path d="M 40 30 L 70 60 L 60 90 L 160 90 L 260 90 L 250 60 L 280 30" stroke="#FFFFFF" stroke-width="4"/>\n</svg>`
        },
        {
          id: 'file-boot-logo-svg',
          name: 'boot_engineering_studio.svg',
          path: '/gfx/boot_engineering_studio.svg',
          type: 'file',
          sizeBytes: 12400,
          extension: 'svg',
          contentPreview: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">\n  <text x="160" y="80" text-anchor="middle" fill="#00FFCC" font-family="monospace" font-size="20">ENGINEERING STUDIO</text>\n  <text x="160" y="110" text-anchor="middle" fill="#AAAAAA" font-family="monospace" font-size="12">OP-1 FIRMWARE MOD SUITE v246</text>\n</svg>`
        }
      ]
    },
    {
      id: 'dir-system',
      name: 'system',
      path: '/system',
      type: 'folder',
      sizeBytes: 6992000,
      children: [
        {
          id: 'file-factory-db',
          name: 'OP1_factory.db',
          path: '/system/OP1_factory.db',
          type: 'file',
          sizeBytes: 420000,
          extension: 'db',
          contentPreview: `[SQLite3 / OP-1 Binary Parameter Database]\nTables:\n - presets (id, name, engine, category, blue, green, white, orange, fx, lfo)\n - engines (id, name, dsp_addr, is_hidden, cpu_budget)\n - themes (id, name, bg_hex, fg_hex, accent_hex)\nRows: 148 presets loaded.`
        },
        {
          id: 'file-firmware-ldr',
          name: 'firmware.ldr',
          path: '/system/firmware.ldr',
          type: 'file',
          sizeBytes: 6420000,
          extension: 'ldr',
          contentPreview: `[Analog Devices Blackfin ADSP-BF533 Bootloader Stream]\nHeader: 0xAD50BF53\nTarget: BF533 (Silicon Rev 0.6)\nEntryPoint: 0xFFA00000 (L1 Instruction SRAM)\nSection Count: 14`
        },
        {
          id: 'file-version-info',
          name: 'version.txt',
          path: '/system/version.txt',
          type: 'file',
          sizeBytes: 120,
          extension: 'txt',
          contentPreview: `OP-1 OS Version: 246\nBuild ID: 20241118-AZ-ENGINEERING\nAuthor: op1repacker & Community\nChecksum: Validated LZMA-TAR`
        }
      ]
    }
  ]
};

export const INITIAL_FACTORY_DB_ROWS: FactoryDbPresetRow[] = [
  {
    id: 'db-1',
    patchName: 'Iter Cellular Pulse',
    engine: 'iter',
    category: 'Lead',
    octave: 4,
    blue: 40,
    green: 75,
    white: 82,
    orange: 35,
    attack: 5,
    decay: 65,
    sustain: 45,
    release: 30,
    fxType: 'nitro',
    fxWet: 45,
    isCustom: true
  },
  {
    id: 'db-2',
    patchName: 'Digital Grit Octave',
    engine: 'digital',
    category: 'Keys',
    octave: 4,
    blue: 55,
    green: 40,
    white: 70,
    orange: 60,
    attack: 10,
    decay: 50,
    sustain: 60,
    release: 25,
    fxType: 'delay',
    fxWet: 30,
    isCustom: false
  },
  {
    id: 'db-3',
    patchName: 'FM Crystal Chimes',
    engine: 'fm',
    category: 'Keys',
    octave: 5,
    blue: 75,
    green: 80,
    white: 60,
    orange: 30,
    attack: 2,
    decay: 80,
    sustain: 20,
    release: 55,
    fxType: 'cwo',
    fxWet: 40,
    isCustom: false
  },
  {
    id: 'db-4',
    patchName: 'Granular Stardust',
    engine: 'granular',
    category: 'Pad',
    octave: 4,
    blue: 85,
    green: 65,
    white: 45,
    orange: 70,
    attack: 35,
    decay: 80,
    sustain: 80,
    release: 75,
    fxType: 'reverb',
    fxWet: 65,
    isCustom: true
  },
  {
    id: 'db-5',
    patchName: 'SID 6581 Arp Power',
    engine: 'sidchip',
    category: 'Lead',
    octave: 4,
    blue: 30,
    green: 85,
    white: 75,
    orange: 50,
    attack: 1,
    decay: 40,
    sustain: 50,
    release: 20,
    fxType: 'delay',
    fxWet: 35,
    isCustom: true
  },
  {
    id: 'db-6',
    patchName: 'TB-303 Acid Reso Squawk',
    engine: 'acid303',
    category: 'Bass',
    octave: 3,
    blue: 70,
    green: 90,
    white: 40,
    orange: 85,
    attack: 2,
    decay: 35,
    sustain: 10,
    release: 15,
    fxType: 'filter',
    fxWet: 50,
    isCustom: true
  },
  {
    id: 'db-7',
    patchName: 'Tibetan Resonator Bowl',
    engine: 'bellres',
    category: 'Acoustic',
    octave: 4,
    blue: 50,
    green: 60,
    white: 70,
    orange: 80,
    attack: 5,
    decay: 95,
    sustain: 15,
    release: 85,
    fxType: 'reverb',
    fxWet: 60,
    isCustom: true
  },
  {
    id: 'db-8',
    patchName: 'Dr Wave Talkbox',
    engine: 'drwave',
    category: 'Lead',
    octave: 4,
    blue: 60,
    green: 45,
    white: 85,
    orange: 65,
    attack: 8,
    decay: 70,
    sustain: 65,
    release: 40,
    fxType: 'nitro',
    fxWet: 55,
    isCustom: false
  },
  {
    id: 'db-9',
    patchName: 'Hyper Trance Supersaw',
    engine: 'supersaw',
    category: 'Lead',
    octave: 4,
    blue: 50,
    green: 85,
    white: 90,
    orange: 40,
    attack: 8,
    decay: 60,
    sustain: 75,
    release: 50,
    fxType: 'chorus',
    fxWet: 50,
    isCustom: true
  },
  {
    id: 'db-10',
    patchName: 'Deep Sub 808 Earthquake',
    engine: 'subbass',
    category: 'Bass',
    octave: 2,
    blue: 85,
    green: 30,
    white: 35,
    orange: 60,
    attack: 4,
    decay: 70,
    sustain: 40,
    release: 30,
    fxType: 'filter',
    fxWet: 20,
    isCustom: true
  },
  {
    id: 'db-11',
    patchName: 'NES 8-bit Micro Arp',
    engine: 'chiptune',
    category: 'Lead',
    octave: 5,
    blue: 80,
    green: 20,
    white: 75,
    orange: 30,
    attack: 1,
    decay: 35,
    sustain: 40,
    release: 10,
    fxType: 'delay',
    fxWet: 40,
    isCustom: true
  },
  {
    id: 'db-12',
    patchName: 'Karplus Physical String',
    engine: 'string',
    category: 'Acoustic',
    octave: 4,
    blue: 40,
    green: 65,
    white: 70,
    orange: 50,
    attack: 2,
    decay: 80,
    sustain: 10,
    release: 60,
    fxType: 'reverb',
    fxWet: 45,
    isCustom: false
  }
];

export const DSP_ENGINES_CATALOG: CustomDspEngineDefinition[] = [
  {
    id: 'iter',
    name: 'ITER (Cellular FM)',
    category: 'Additive / Cellular FM',
    author: 'op1hacks / Teenage Engineering Hidden',
    description: 'Secret generative synthesizer hidden inside stock OP-1 firmware. Uses a cellular automaton grid to drive harmonic operators and dynamic FM indices.',
    hookTargetSymbol: '_dsp_iter_process',
    romOffsetHex: '0x0024B100',
    codeCpp: `// ITER Cellular FM Engine Hook\nvoid dsp_iter_process(float* outL, float* outR, int numSamples, IterParams* p) {\n  for(int i=0; i<numSamples; i++) {\n    float mod = sinf(phaseMod) * (p->fm_depth * 800.0f);\n    float s1 = sawtooth(phase1 + mod);\n    float s2 = sinf((phase1 * p->ratio) + mod);\n    float mixed = (s1 * 0.6f) + (s2 * 0.4f);\n    *outL++ = biquad_process(&p->lpf, mixed);\n    *outR++ = *outL;\n  }\n}`,
    knobBlueLabel: 'Harmonic Ratio',
    knobGreenLabel: 'FM Mod Depth',
    knobWhiteLabel: 'LPF Cutoff',
    knobOrangeLabel: 'Resonance / Q',
    icon: 'Grid',
    isCommunityMod: true,
    waveformType: 'Cellular Sine/Saw'
  },
  {
    id: 'granular',
    name: 'GRANULAR (Cloud Glitch)',
    category: 'Granular Synthesizer',
    author: 'Engineering Lab Blackfin Mod',
    description: 'Continuous circular grain stream with asynchronous randomized micro-envelopes, variable grain pitch jitter, and spatial diffusion.',
    hookTargetSymbol: '_dsp_custom_granular',
    romOffsetHex: '0x002B4910',
    codeCpp: `// Granular Cloud Synthesizer (ADSP-BF533 L1 SRAM Optimized)\n#pragma section("L1_code")\nvoid dsp_granular_tick(GranularState* state, float* buffer, int len) {\n  for(int n=0; n<len; n++) {\n    float grainAcc = 0.0f;\n    for(int g=0; g<8; g++) {\n      if(state->grains[g].active) {\n        grainAcc += sample_grain(&state->grains[g]);\n      }\n    }\n    buffer[n] = grainAcc * 0.35f;\n  }\n}`,
    knobBlueLabel: 'Grain Density (20-100Hz)',
    knobGreenLabel: 'Pitch Spray / Detune',
    knobWhiteLabel: 'Formant Bandpass',
    knobOrangeLabel: 'Feedback / Diffusion',
    icon: 'Layers',
    isCommunityMod: true,
    waveformType: 'Grain Spray'
  },
  {
    id: 'sidchip',
    name: 'SID 6581 (Chiptune Core)',
    category: '8-Bit Retro Soundchip',
    author: 'Commodore 64 Mod Port',
    description: 'Authentic emulation of the MOS Technology 6581 SID sound chip. Features hard oscillator sync, combined waveforms, and non-linear filter distortion.',
    hookTargetSymbol: '_dsp_sid6581_emulate',
    romOffsetHex: '0x002C1040',
    codeCpp: `void sid_process(SID_Voice* v, float* out, int samples) {\n  for(int i=0; i<samples; i++) {\n    if (v->hard_sync && v->acc1 < v->prev_acc1) v->acc2 = 0;\n    float wave = (v->acc1 > v->pw) ? 1.0f : -1.0f;\n    *out++ = apply_sid_filter(v, wave);\n  }\n}`,
    knobBlueLabel: 'Pulse Width (0-100%)',
    knobGreenLabel: 'Hard Sync Frequency',
    knobWhiteLabel: 'SID Resonant Filter',
    knobOrangeLabel: 'Resonance / Non-linear Drive',
    icon: 'Cpu',
    isCommunityMod: true,
    waveformType: 'SID Pulse & Sync Saw'
  },
  {
    id: 'acid303',
    name: 'ACID 303 (Diode Ladder)',
    category: 'Transistor Bassline',
    author: 'Roland TB-303 Recreation',
    description: 'Famous 18dB diode ladder filter circuit with aggressive non-linear resonance saturation and characteristic glide/accent envelope decay.',
    hookTargetSymbol: '_dsp_diode_ladder_303',
    romOffsetHex: '0x002D8800',
    codeCpp: `float diode_ladder_tick(DiodeLadder* dl, float in) {\n  float feedback = dl->k * dl->s[3];\n  float u = in - feedback;\n  // Non-linear diode hyperbolic tangent saturation\n  for(int i=0; i<4; i++) {\n    dl->s[i] += dl->g * (tanhf(u) - dl->s[i]);\n    u = dl->s[i];\n  }\n  return dl->s[3];\n}`,
    knobBlueLabel: 'Waveform (Saw / Square)',
    knobGreenLabel: 'Envelope Mod Amount',
    knobWhiteLabel: 'Filter Cutoff',
    knobOrangeLabel: 'Acid Resonance Peak',
    icon: 'Flame',
    isCommunityMod: true,
    waveformType: 'Acid Saw / Square'
  },
  {
    id: 'bellres',
    name: 'BELL RES (Modal Resonator)',
    category: 'Physical Modal Modeling',
    author: 'Physical Audio Lab',
    description: 'Bank of 4 tuned bandpass modal resonators simulating vibrating metal plates, bells, gongs, and Tibetan acoustic singing bowls.',
    hookTargetSymbol: '_dsp_modal_resonator_bank',
    romOffsetHex: '0x002E0200',
    codeCpp: `void modal_res_process(ModalBank* b, float impulse, float* out) {\n  float acc = 0.0f;\n  for(int m=0; m<4; m++) {\n    acc += biquad_filter_tick(&b->modes[m], impulse);\n  }\n  *out = acc;\n}`,
    knobBlueLabel: 'Inharmonic Mode Spread',
    knobGreenLabel: 'Strike Position / Color',
    knobWhiteLabel: 'Damping / Brightness',
    knobOrangeLabel: 'Decay Time (0.2s - 8s)',
    icon: 'Bell',
    isCommunityMod: true,
    waveformType: 'Inharmonic Modes'
  },
  {
    id: 'supersaw',
    name: 'SUPERSAW (Trance Lead)',
    category: 'Hyper-Unison Saw Stack',
    author: 'Engineering Lab DSP',
    description: '7 detuned sawtooth oscillators packed into a single voice with ultra-wide stereo panning and master high-pass/low-pass sculpt filter.',
    hookTargetSymbol: '_dsp_supersaw_stack',
    romOffsetHex: '0x002EA100',
    codeCpp: `void supersaw_process(float* outL, float* outR, int n, SuperSaw* ss) {\n  float detunes[7] = {-0.024f, -0.014f, -0.006f, 0.0f, 0.006f, 0.014f, 0.024f};\n  // Vectorized Blackfin SIMD accumulation\n}`,
    knobBlueLabel: 'Unison Voices',
    knobGreenLabel: 'Stereo Spread & Detune',
    knobWhiteLabel: 'Master Filter Cutoff',
    knobOrangeLabel: 'Resonance / Warmth',
    icon: 'Activity',
    isCommunityMod: true,
    waveformType: '7x Unison Saw'
  },
  {
    id: 'subbass',
    name: 'SUB BASS (808 Analog)',
    category: 'Sub-Frequency Synthesizer',
    author: 'Bass Architecture Lab',
    description: 'Dual sub-oscillator system tuned for low-end punch, featuring sub-octave division, saturation drive, and transient thump generator.',
    hookTargetSymbol: '_dsp_subbass_808',
    romOffsetHex: '0x002F1000',
    codeCpp: `void subbass_tick(SubOsc* s, float* out) {\n  float sub1 = sinf(s->phase * 0.5f);\n  float sub2 = triangle(s->phase * 0.25f);\n  *out = saturate((sub1 * 0.7f) + (sub2 * s->sub_mix));\n}`,
    knobBlueLabel: 'Sub-Division (1/2 / 1/4)',
    knobGreenLabel: 'Transient Thump Click',
    knobWhiteLabel: 'Sub Lowpass Filter',
    knobOrangeLabel: 'Analog Drive Saturation',
    icon: 'Radio',
    isCommunityMod: true,
    waveformType: 'Sub Sine + Tri'
  },
  {
    id: 'spectralres',
    name: 'SPECTRAL RES (Comb Filter)',
    category: 'Spectral Resonator',
    author: 'Acoustic DSP Lab',
    description: 'Feedback comb filter network transforming any incoming transient or noise into singing harmonic spectra and physical flute tones.',
    hookTargetSymbol: '_dsp_comb_spectral_bank',
    romOffsetHex: '0x002F9400',
    codeCpp: `float comb_filter(CombState* c, float input) {\n  float delaySample = c->buffer[c->readIdx];\n  c->buffer[c->writeIdx] = input + (delaySample * c->feedback);\n  return delaySample;\n}`,
    knobBlueLabel: 'Comb Delay Ratio',
    knobGreenLabel: 'Spectral Harmonic Balance',
    knobWhiteLabel: 'High-Freq Damping',
    knobOrangeLabel: 'Resonance Feedback (Q)',
    icon: 'Sliders',
    isCommunityMod: true,
    waveformType: 'Comb Harmonic Spectrum'
  },
  {
    id: 'digital',
    name: 'DIGITAL (Factory)',
    category: 'Factory Synth',
    author: 'Teenage Engineering',
    description: 'Iconic factory engine: gritty digital synthesis with octaver, digital ring modulation, and steep multi-mode filter.',
    hookTargetSymbol: '_dsp_digital_render',
    romOffsetHex: '0x00201000',
    codeCpp: `// Factory ROM DSP Function`,
    knobBlueLabel: 'Detune / Octave',
    knobGreenLabel: 'Ring Mod Multiplier',
    knobWhiteLabel: 'Filter Brightness',
    knobOrangeLabel: 'Resonance Drive',
    icon: 'Hash',
    isCommunityMod: false,
    waveformType: 'Digital Square/Saw'
  },
  {
    id: 'fm',
    name: 'FM (Factory 4-Op)',
    category: 'Factory Synth',
    author: 'Teenage Engineering',
    description: 'Crisp 4-operator frequency modulation synthesizer for metallic bells, organs, electric pianos, and aggressive FM leads.',
    hookTargetSymbol: '_dsp_fm_process',
    romOffsetHex: '0x00208000',
    codeCpp: `// Factory ROM DSP Function`,
    knobBlueLabel: 'FM Ratio',
    knobGreenLabel: 'Modulation Index',
    knobWhiteLabel: 'Filter Cutoff',
    knobOrangeLabel: 'Q Resonance',
    icon: 'Zap',
    isCommunityMod: false,
    waveformType: '4-Op Sine FM'
  },
  {
    id: 'pulse',
    name: 'PULSE (Factory PWM)',
    category: 'Factory Synth',
    author: 'Teenage Engineering',
    description: 'Classic dual-oscillator square wave synthesizer with pulse-width modulation and analog filter curve modeling.',
    hookTargetSymbol: '_dsp_pulse_process',
    romOffsetHex: '0x00210000',
    codeCpp: `// Factory ROM DSP Function`,
    knobBlueLabel: 'Pulse Width (PWM)',
    knobGreenLabel: 'Osc 2 Detune',
    knobWhiteLabel: 'Filter Cutoff',
    knobOrangeLabel: 'Resonance',
    icon: 'Square',
    isCommunityMod: false,
    waveformType: 'Square PWM'
  },
  {
    id: 'string',
    name: 'STRING (Factory Karplus)',
    category: 'Factory Synth',
    author: 'Teenage Engineering',
    description: 'Physical string modeling based on the Karplus-Strong algorithm with noise exciter burst and body damping control.',
    hookTargetSymbol: '_dsp_string_process',
    romOffsetHex: '0x00218000',
    codeCpp: `// Factory ROM DSP Function`,
    knobBlueLabel: 'Exciter Noise Length',
    knobGreenLabel: 'Pick Position',
    knobWhiteLabel: 'String Damping',
    knobOrangeLabel: 'Body Resonance',
    icon: 'Feather',
    isCommunityMod: false,
    waveformType: 'Plucked String'
  },
  {
    id: 'drwave',
    name: 'DR WAVE (Factory Formant)',
    category: 'Factory Synth',
    author: 'Teenage Engineering',
    description: 'Formant wavetable synthesizer with animated 3D character display, vowel morphing (A-E-I-O-U), and dual vocal resonators.',
    hookTargetSymbol: '_dsp_drwave_process',
    romOffsetHex: '0x00220000',
    codeCpp: `// Factory ROM DSP Function`,
    knobBlueLabel: 'Vowel Morph (A/E/I/O/U)',
    knobGreenLabel: 'Formant 2 Spread',
    knobWhiteLabel: 'Brightness / Cutoff',
    knobOrangeLabel: 'Vocal Resonance',
    icon: 'Smile',
    isCommunityMod: false,
    waveformType: 'Formant Vowel Waves'
  },
  {
    id: 'cluster',
    name: 'CLUSTER (Factory Saw)',
    category: 'Factory Synth',
    author: 'Teenage Engineering',
    description: '6-sawtooth wave detuned cluster synthesizer creating huge retro pads and supersaw unison lines.',
    hookTargetSymbol: '_dsp_cluster_process',
    romOffsetHex: '0x00228000',
    codeCpp: `// Factory ROM DSP Function`,
    knobBlueLabel: 'Cluster Detune Spread',
    knobGreenLabel: 'Sub-Oscillator Level',
    knobWhiteLabel: 'Filter Cutoff',
    knobOrangeLabel: 'Resonance',
    icon: 'AlignJustify',
    isCommunityMod: false,
    waveformType: '6x Saw Unison'
  },
  {
    id: 'phase',
    name: 'PHASE (Factory Distortion)',
    category: 'Factory Synth',
    author: 'Teenage Engineering',
    description: 'Casio-inspired phase distortion synthesizer modulating waveform read angle for aggressive acoustic and synthetic textures.',
    hookTargetSymbol: '_dsp_phase_process',
    romOffsetHex: '0x00230000',
    codeCpp: `// Factory ROM DSP Function`,
    knobBlueLabel: 'Phase Distort Index',
    knobGreenLabel: 'Harmonic Multiplier',
    knobWhiteLabel: 'Cutoff / Color',
    knobOrangeLabel: 'Q Resonance',
    icon: 'Sun',
    isCommunityMod: false,
    waveformType: 'Phase Distorted Sine'
  },
  {
    id: 'sampler',
    name: 'SAMPLER (Factory Engine)',
    category: 'Factory Synth',
    author: 'Teenage Engineering',
    description: '6-second mono sampling engine with start/end trim, reverse playback, looping modes, and 12-bit vintage resolution option.',
    hookTargetSymbol: '_dsp_sampler_process',
    romOffsetHex: '0x00238000',
    codeCpp: `// Factory ROM DSP Function`,
    knobBlueLabel: 'Sample Start Point',
    knobGreenLabel: 'Sample Stop Point',
    knobWhiteLabel: 'Filter / Trim',
    knobOrangeLabel: 'Pitch / Fine Tune',
    icon: 'Disc',
    isCommunityMod: false,
    waveformType: 'Sampled Waveform'
  },
  {
    id: 'wavetable',
    name: 'WAVETABLE (Harmonic Morph)',
    category: 'Morphing Wavetable',
    author: 'Engineering Lab Mod',
    description: 'Dynamic table of 64 single-cycle waveforms with smooth interpolated wavetable scanning and dual anti-aliased sub-oscillators.',
    hookTargetSymbol: '_dsp_wavetable_morph',
    romOffsetHex: '0x002FB000',
    codeCpp: `void wavetable_render(Wavetable* wt, float position, float* out) {\n  // Cubic spline wavetable position interpolation\n}`,
    knobBlueLabel: 'Table Position (0-64)',
    knobGreenLabel: 'Sub-Oscillator Level',
    knobWhiteLabel: 'Wave Filter Cutoff',
    knobOrangeLabel: 'Drive / Saturation',
    icon: 'Disc',
    isCommunityMod: true,
    waveformType: 'Morphing Waves'
  },
  {
    id: 'formantvox',
    name: 'FORMANT VOX (Robot Speech)',
    category: 'Speech Synthesizer',
    author: 'Engineering Lab Mod',
    description: 'Triple-resonator vocal tract model capable of speech phonetic transitions, robot vocoder tones, and formant choirs.',
    hookTargetSymbol: '_dsp_formant_vox',
    romOffsetHex: '0x002FD000',
    codeCpp: `void formant_vox_render(Vox* v, float* out) {\n  // 3-pole vocal formant filter bank\n}`,
    knobBlueLabel: 'Phoneme Selector',
    knobGreenLabel: 'Vocal Tract Length',
    knobWhiteLabel: 'Formant Filter 3',
    knobOrangeLabel: 'Throat Resonance',
    icon: 'Radio',
    isCommunityMod: true,
    waveformType: 'Phonetic Vocal Formants'
  },
  {
    id: 'phasedist',
    name: 'PHASE DIST (CZ Resonant)',
    category: 'Phase Distortion',
    author: 'CZ-101 Tribute Mod',
    description: 'Mathematical recreation of vintage CZ-series phase distortion synthesis producing resonant filter sweeps without standard analog filters.',
    hookTargetSymbol: '_dsp_cz_phase_dist',
    romOffsetHex: '0x002FE000',
    codeCpp: `void cz_dist_tick(CZ* cz, float* out) {\n  // Non-linear ramp phase bending\n}`,
    knobBlueLabel: 'Waveform Warp (Reso/Saw)',
    knobGreenLabel: 'Octave Spread',
    knobWhiteLabel: 'DCW (Digitally Controlled Wave)',
    knobOrangeLabel: 'Decay Sweep',
    icon: 'Compass',
    isCommunityMod: true,
    waveformType: 'CZ Phase Distorted'
  },
  {
    id: 'chiptune',
    name: 'CHIPTUNE (2A03 Engine)',
    category: '8-bit Retro Chiptune',
    author: 'NES Soundchip Recreation',
    description: 'Recreation of the iconic Ricoh 2A03 sound generator with blazing fast arpeggiator modes, triangle bass, and pseudo-random noise bursts.',
    hookTargetSymbol: '_dsp_nes_2a03_synth',
    romOffsetHex: '0x002FF000',
    codeCpp: `void nes_2a03_tick(NES_State* nes, float* out) {\n  // 4-step rapid arpeggio generator\n}`,
    knobBlueLabel: 'Arpeggio Speed (Fast-Slow)',
    knobGreenLabel: 'Duty Cycle (12.5% / 25% / 50%)',
    knobWhiteLabel: 'Tone Filter Cutoff',
    knobOrangeLabel: 'Noise Mix & Decay',
    icon: 'Cpu',
    isCommunityMod: true,
    waveformType: '2A03 Pulse / Triangle'
  }
];

export const BLACKFIN_HOOKS_DATA: BlackfinHook[] = [
  {
    id: 'hook-1',
    addressHex: '0x0024B100',
    symbol: '_dsp_iter_process',
    description: 'Hooks factory ITER cellular FM engine into main synth dispatcher',
    originalEngine: 'UNUSED_ROM_BLOCK',
    patchedEngine: 'iter (Cellular FM)',
    status: 'HOOKED',
    sizeBytes: 4096,
    cyclesPerSample: 82
  },
  {
    id: 'hook-2',
    addressHex: '0x002B4910',
    symbol: '_dsp_custom_granular',
    description: 'L1 SRAM Hook for Real-Time Granular Cloud Processor',
    originalEngine: 'NULL_STUB',
    patchedEngine: 'granular (Granular Cloud)',
    status: 'HOOKED',
    sizeBytes: 8192,
    cyclesPerSample: 145
  },
  {
    id: 'hook-3',
    addressHex: '0x002C1040',
    symbol: '_dsp_sid6581_emulate',
    description: 'MOS 6581 SID Emulation Voice & Non-linear Filter Driver',
    originalEngine: 'FACTORY_RESERVED',
    patchedEngine: 'sidchip (6581 SID)',
    status: 'HOOKED',
    sizeBytes: 6144,
    cyclesPerSample: 96
  },
  {
    id: 'hook-4',
    addressHex: '0x002D8800',
    symbol: '_dsp_diode_ladder_303',
    description: 'Diode Ladder 18dB Circuit & Non-linear Saturation Loop',
    originalEngine: 'FACTORY_RESERVED',
    patchedEngine: 'acid303 (TB-303 Acid)',
    status: 'HOOKED',
    sizeBytes: 5120,
    cyclesPerSample: 110
  },
  {
    id: 'hook-5',
    addressHex: '0x002E0200',
    symbol: '_dsp_modal_resonator_bank',
    description: '4-Mode Modal Resonator & Physical Acoustic Modeling',
    originalEngine: 'FACTORY_RESERVED',
    patchedEngine: 'bellres (Modal Bell)',
    status: 'HOOKED',
    sizeBytes: 7168,
    cyclesPerSample: 128
  }
];

export const INITIAL_BUILD_LOGS = [
  { id: 'log-1', timestamp: '14:02:11', level: 'INFO' as const, message: '[op1repacker v2.4] Initializing OP-1 Firmware Repack Suite...' },
  { id: 'log-2', timestamp: '14:02:12', level: 'INFO' as const, message: 'Detected container: TAR with LZMA Level 9 compression (Format standard: ADSP-BF533)' },
  { id: 'log-3', timestamp: '14:02:13', level: 'SUCCESS' as const, message: 'SHA-256 Validated: 9f83a21b4c5e6d7890123456789abcdef0123456789abcdef0123456789abcde' },
  { id: 'log-4', timestamp: '14:02:14', level: 'PATCH' as const, message: '[Mod: iter] Unlocking hidden ITER synthesis engine in system/OP1_factory.db' },
  { id: 'log-5', timestamp: '14:02:15', level: 'PATCH' as const, message: '[Mod: filter] Patching FX dispatch table: Unlocking Master Filter & Subtle-FX' },
  { id: 'log-6', timestamp: '14:02:16', level: 'PATCH' as const, message: '[Blackfin] Hooking 8 custom DSP engines into SDRAM 64MB buffer (0x002B4910 - 0x002FF000)' },
  { id: 'log-7', timestamp: '14:02:17', level: 'HASH' as const, message: 'Recalculating CRC32 checksums: 0xA4F2C991. Binary package verified against brick protection!' }
];
