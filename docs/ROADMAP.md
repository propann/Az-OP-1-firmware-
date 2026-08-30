# Plan précis vers l'émulation de machine

## P0 — Laboratoire de formats

Livrables : validation `.op1`, unpack sûr, repack, analyse LDR, comparaison et
index de corpus. Terminé lorsque les tests synthétiques passent, qu'un corpus
local peut être indexé sans fuite de binaires et qu'un unpack/repack conserve
le contenu fichier par fichier.

## P1 — Référence CPU Blackfin

Construire la branche `bfin` épinglée de QEMU, exécuter ses tests CPU et
produire des traces instruction/registres déterministes. Terminé lorsque le
même LDR minimal donne la même trace sur deux machines de développement.

## P2 — Chargeur et mémoire BF524

Finaliser la carte L1 BF524, les blocs DATA/FILL/IGNORE/INIT/FINAL et le point
d'entrée. Toute zone inconnue doit provoquer une erreur explicite. Terminé
lorsque `te-boot.ldr` est chargé sans chevauchement ni écriture hors carte.

## P3 — Démarrage et interruptions

Modéliser PLL/horloges, SIC, timers, watchdog, DMA minimal et séquence boot.
Terminé lorsque le bootloader atteint une boucle stable reproductible, avec
interruptions expliquées et aucune MMIO ignorée.

## P4 — Stockage

Créer une NAND virtuelle en lecture seule, géométrie et ECC documentés, puis
un overlay jetable pour les écritures. Terminé lorsque les mêmes secteurs sont
lus aux mêmes étapes sur trois versions locales du firmware.

## P5 — Périphériques OP-1

Implémenter clavier/encodeurs, écran 320 × 160, codec audio et USB nécessaires
au boot. Chaque périphérique commence par un journal strict, puis un modèle
issu de traces. Terminé lorsque écran et audio sont produits par le firmware.

## P6 — Validation différentielle

Créer des scénarios boot/idle/touche/encodeur/audio avec traces normalisées.
Comparer QEMU, données matérielles autorisées et versions de firmware. Terminé
lorsqu'aucun opcode ou MMIO inconnu n'est masqué et que les scénarios sont
reproductibles en CI avec fixtures libres.

## P7 — Cockpit utilisateur

Relier run/pause/step, registres, mémoire, journal MMIO, framebuffer et audio au
frontend via un protocole versionné. Le statut « fonctionnel » ne sera affiché
qu'après satisfaction de tous les critères de `EMULATION_STATUS.md`.

## Ordre de priorité immédiat

1. Faire compiler le backend QEMU dans un environnement Linux documenté.
2. Ajouter une suite de fixtures LDR synthétiques BF52x.
3. Exposer une trace JSON stable du chargeur et du CPU.
4. Dresser la carte des MMIO rencontrées au boot, sans les simuler arbitrairement.
5. Implémenter seulement les périphériques observés dans cette trace.
