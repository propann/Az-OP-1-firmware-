# 🎛️ Az-OP-1 Engineering Studio & Firmware Lab

> **Plateforme modulaire & intégrée de reverse-engineering, modification de firmware, synthèse DSP et émulation matérielle pour le Teenage Engineering OP-1 (Blackfin ADSP-BF533).**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?style=flat-square&logo=react)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Web MIDI API](https://img.shields.io/badge/Web_MIDI-Live_HW_Control-emerald.svg?style=flat-square)](https://developer.mozilla.org/fr/docs/Web/API/Web_MIDI_API)
[![DSP Blackfin](https://img.shields.io/badge/Target_DSP-ADSP--BF533_400MHz-orange.svg?style=flat-square)](https://www.analog.com/)
[![Security](https://img.shields.io/badge/Anti--Brick-CRC32_&_LZMA_Verified-green.svg?style=flat-square)]()

---

## 🧭 Sommaire

1. [Vision & Intention du Projet](#-vision--intention-du-projet)
2. [Synthèse des Forces & Piliers d'Ingénierie](#-synthèse-des-forces--piliers-dingénierie)
3. [Architecture Modulaire du Studio](#-architecture-modulaire-du-studio)
   - [Phase 1 : Fondations & Coffre-Fort des 13 Firmwares](#phase-1--fondations--coffre-fort-des-13-firmwares)
   - [Phase 2 : Atelier de Modding & Normalisation](#phase-2--atelier-de-modding--normalisation)
   - [Phase 3 : Studio de Création & Rétro-Ingénierie C++ DSP](#phase-3--studio-de-création--rétro-ingénierie-c-dsp)
   - [Phase 4 : Pipeline de Production & Banc de Tests Anti-Brick](#phase-4--pipeline-de-production--banc-de-tests-anti-brick)
   - [Console Matérielle OP-1 & Émulateur Temps Réel](#console-matérielle-op-1--émulateur-temps-réel)
4. [Stack Logicielle Intégrée (Python & Outils Communautaires)](#-stack-logicielle-intégrée-python--outils-communautaires)
5. [Contrôle Matériel Web MIDI & Encoders](#-contrôle-matériel-web-midi--encoders)
6. [Moteurs Audio DSP Implémentés (20 Moteurs)](#-moteurs-audio-dsp-implémentés-20-moteurs)
7. [Installation & Démarrage Rapide](#-installation--démarrage-rapide)
8. [Feuille de Route & Axes d'Amélioration](#-feuille-de-route--axes-damélioration)
9. [Contributions & Licence](#-contributions--licence)

---

## 🎯 Vision & Intention du Projet

L'**OP-1 de Teenage Engineering** est l'un des synthétiseurs et instruments de performance les plus emblématiques de la MAO moderne. Conçu autour du DSP **Analog Devices ADSP-BF533** cadencé à 400 MHz, son firmware propriétaire a longtemps représenté une boîte noire complexe à auditer, modifier ou étendre sans risquer de brique matérielle permanente.

**Az-OP-1 Engineering Studio** est conçu pour lever ces barrières en unifiant l'ensemble du cycle de vie du firmware au sein d'une interface graphique réactive et professionnelle :
- **Centraliser et sécuriser** les 13 versions de firmwares officiels (de la version d'origine `v061` à la dernière `v246`).
- **Démocratiser la modification** (thèmes OLED, découpe d'échantillons AIFF 24-tranches, mascottes d'effets, déverrouillage de moteurs cachés comme **ITER**).
- **Fournir un laboratoire de développement DSP** complet avec éditeur de code C++, calcul de cycles Blackfin et vérification de la bande passante L1 SRAM.
- **Offrir un banc de test et un émulateur matériel** pilotable en temps réel via contrôleurs USB/MIDI et le vrai clavier physique de l'OP-1.

---

## ⚡ Synthèse des Forces & Piliers d'Ingénierie

```
+---------------------------------------------------------------------------------------+
|                               AZ-OP-1 ENGINEERING STUDIO                              |
+---------------------------------------------------------------------------------------+
|  1. Vision Holistique      | Couvre 100% du cycle (Extraction -> Mod -> Test -> Flash)|
|  2. Outils Communautaires  | Intégration GUI transparente d'op1repacker, opie, op1svg  |
|  3. Approche Éducative     | Révèle registres Blackfin (R0-R7), ASM, cycles et hooks  |
|  4. Modularité Rigoureuse  | Architecture 4 Phases + Console Standalone indépendante  |
|  5. UI/UX "Hardware Dark"  | Design OLED fidèle 320x240, encodage 4 couleurs, feedback|
|  6. Moteur Web Audio Réel  | 20 oscillateurs polyphoniques, Tape 4-pistes, Chaîne FX  |
+---------------------------------------------------------------------------------------+
```

---

## 🏗️ Architecture Modulaire du Studio

### Phase 1 : Fondations & Coffre-Fort des 13 Firmwares
- **Coffre-fort d'archivage :** Hébergement des 13 firmwares officiels avec empreintes cryptographiques complètes (SHA-256, MD5, CRC32).
- **Téléchargement groupé :** Génération d'une archive complète avec manifeste structuré `.json`.
- **Espaces de travail (`/workspace/*`) :** Isolation par projet avec décompression LZMA, extraction des tables SQLite (`OP1_factory.db`) et arborescence de fichiers.

### Phase 2 : Atelier de Modding & Normalisation
- **Patcher 1-Clic :** Activation/désactivation instantanée des mods (*Hidden Engine Unlocker, Fast Bootloader, CWO Alternate Vector Mascot, Nitro High-Res UI*).
- **Éditeur de Base de Données SQLite :** Modification des noms de moteurs, catégories de presets et métadonnées d'usine.
- **Normalisateur de graphismes SVG (`op1svg`) :** Validation des coordonnées entières et conversion vers le format binaire OLED TE.
- **Découpeur d'échantillons AIFF :** Analyse des transitoires et slicing 24 tranches pour le moteur Drum.

### Phase 3 : Studio de Création & Rétro-Ingénierie C++ DSP
- **Éditeur de Code DSP :** Environnement dédié aux algorithmes C++ compilés pour l'architecture Blackfin.
- **Compteur de Cycles & Analyseur L1 :** Monitoring de la consommation de cycles processeur (642 cycles consommés sur le budget critique de 9070 cycles à 44.1 kHz).
- **Injection de Hooks :** Points d'entrée sûrs pour substituer ou étendre les tables de fonctions du synthétiseur.

### Phase 4 : Pipeline de Production & Banc de Tests Anti-Brick
- **Recalcul CRC32 Automatisé :** Protection matérielle stricte empêchant tout flash de binaire corrompu.
- **Générateur de Scripts de Déploiement :** Commandes automatisées prêtes pour le terminal Python.
- **Journal d'Audit de Sécurité :** Checkpoints de validation mémoire, alignement des vecteurs et conformité du bootloader.

### Console Matérielle OP-1 & Émulateur Temps Réel
- **Écran OLED 320x240 :** Rendu Canvas vectoriel avec visualisations dédiées pour chaque moteur (ondes, particules, billes physiques de collision).
- **4 Encodeurs Rotatifs :** Bleu, Vert, Blanc, Orange avec réponse paramétrique instantanée.
- **Magnétophone 4 Pistes :** Simulation de bande magnétique avec scrubbing, surimpression (Overdub) et inversion (Reverse).
- **Télémétrie Blackfin en direct :** Affichage des registres `R0-R3`, pointeurs `P0`, compteur ordinal `PC` et statut `ASTAT`.

---

## 🛠️ Stack Logicielle Intégrée (Python & Outils Communautaires)

| Outil Intégré | Auteur / Réf | Rôle dans le Studio |
| :--- | :--- | :--- |
| **`op1repacker`** | *padenot* | Décompression et réempaquetage LZMA des fichiers `.op1`. |
| **`opie`** | *synodriver* | Extraction, injection et conversion des graphismes et polices de caractères. |
| **`op1svg`** | *Community* | Validation vectorielle et conversion SVG vers coordonnées binaires TE. |
| **`op1-decryptor`** | *simona1* | Analyse cryptographique et validation des sections chiffrées du firmware. |
| **`bfin-elf-g++`** | *GCC Analog Devices* | Chaîne de compilation croisée ciblant le processeur Blackfin ADSP-BF533. |

---

## 🎹 Contrôle Matériel Web MIDI & Encoders

L'application intègre nativement l'API **Web MIDI** du navigateur pour connecter directement votre OP-1 physique via USB :

- **Canal MIDI Universel (1-16)** : Support polyphonique avec vélocité.
- **Encodeurs CC Dédiés** :
  - `CC 1` / `CC 16` : Encodeur Bleu (*Parameter 1 / Cutoff*)
  - `CC 2` / `CC 17` : Encodeur Vert (*Parameter 2 / Resonance / Decay*)
  - `CC 3` / `CC 18` : Encodeur Blanc (*Parameter 3 / Mod Amount / Speed*)
  - `CC 4` / `CC 19` : Encodeur Orange (*Parameter 4 / Master Level / Space*)
- **Changement de Mode** : `CC 20` (Synth), `CC 21` (Drum), `CC 22` (Tape), `CC 23` (Mixer).
- **Moniteur MIDI Intégré** : Inspecteur temps réel de paquets entrants avec latence mesurée < 1.5 ms.

---

## 🔊 Moteurs Audio DSP Implémentés (20 Moteurs)

### Moteurs d'Usine Officiels (12)
1. **Cluster** — Synthétiseur multi-oscillateurs à empilement harmonique.
2. **Digital** — Oscillateur numérique avec distorsion de phase et bitcrush.
3. **DNA** — Synthèse génétique basée sur l'ID CPU unique de la machine.
4. **Dr. Wave** — Synthétiseur à table d'ondes avec modulation de formant.
5. **FM** — Synthèse par modulation de fréquence 4 opérateurs.
6. **Phase** — Synthèse à distorsion de phase dynamique.
7. **Pulse** — Double oscillateur à largeur d'impulsion variable.
8. **String** — Modélisation physique Karplus-Strong d'une corde pincée.
9. **Synth** — Soustractif analogique classique double oscillateurs.
10. **DSynth** — Synthèse double oscillateur avec filtrage dynamique.
11. **Voltage** — Synthétiseur multi-ondes à modélisation électrique.
12. **Sampler** — Moteur d'échantillonnage polyphonique avec looping.

### Moteurs Moddés & Rétro-Ingénierie (8)
13. **Iter (Hidden Engine)** — Synthèse modale basée sur la collision de particules physiques.
14. **Granular Cloud** — Synthèse granulaire en temps réel avec dispersion spatiale.
15. **Wavetable Morph** — Balayage 2D de tables d'ondes avec interpolation spline.
16. **SID 6581** — Émulation de la puce sonore Commodore 64 avec filtres résonants et arpèges.
17. **Acid 303** — Émulation du filtre diode ladder résonant et circuit d'accentuation.
18. **Additive Organ** — Synthèse additive pure à 16 harmoniques configurables.
19. **Modal Resonator** — Banque de 8 résonateurs passe-bande couplés pour percussions métalliques.
20. **Spectral Void** — Synthèse spectrale par transformée de Fourier inverse et bruit rose filtré.

---

## 🚀 Installation & Démarrage Rapide

### Prérequis
- **Node.js** >= 18.0.0
- **npm** ou **pnpm**
- Navigateur moderne avec support **Web Audio API** et **Web MIDI API** (Chrome, Edge, Brave, Opera, Firefox).

### Lancement en Développement

```bash
# 1. Cloner le dépôt
git clone https://github.com/votre-compte/az-op1-engineering-studio.git
cd az-op1-engineering-studio

# 2. Installer les dépendances
npm install

# 3. Démarrer le serveur de développement Vite (Port 3000)
npm run dev
```

### Construction pour la Production

```bash
npm run build
npm run preview
```

---

## 🗺️ Feuille de Route & Axes d'Amélioration

- [x] Gestion et archivage complet des 13 firmwares officiels TE.
- [x] Moteur Web Audio complet à 20 synthétiseurs, 4 pistes tape et effets.
- [x] Intégration Web MIDI bidirectionnelle avec moniteur d'événements.
- [x] Espaces de travail et dépaquetage d'arborescence LZMA.
- [x] Télémétrie DSP Blackfin BF533 et protection anti-brick CRC32.
- [ ] **Intégration d'un WASM `op1emu`** pour l'exécution réelle du code binaire ADSP-BF533 dans le navigateur.
- [ ] **Backend local Python (FastAPI)** orchestrant directement l'outil physique `op1repacker` et le flash USB en mode TE-Boot.
- [ ] **Export / Import de Projets JSON** avec sauvegarde locale chiffrée.
- [ ] **Assistance IA (Gemini API)** pour la génération de structures d'algorithmes DSP en C++.

---

## 🤝 Contributions & Remerciements

Ce projet s'inspire des travaux exceptionnels de rétro-ingénierie menés par la communauté mondiale Teenage Engineering :
- **padenot** pour le développement de `op1repacker`.
- **synodriver** pour `opie`.
- La communauté **OP-1 Discord & llllllll.co** pour les recherches sur le processeur ADSP-BF533.

---

*Az-OP-1 Engineering Studio est un projet éducatif et de recherche indépendant et n'est pas affilié à Teenage Engineering.*
