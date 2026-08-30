# Moteur natif BF524

Cette couche utilise le cœur Blackfin public de la branche bfin de QEMU. La
révision est épinglée pour rendre la construction reproductible. Le patch
ajoute une machine op1-bf524, une cartographie L1 adaptée au BF524 et un
chargeur des blocs ADI LDR.

Ce jalon fournit une vraie exécution d’instructions par QEMU. Il ne fournit pas
encore tous les périphériques OP-1. Le premier objectif est de démarrer
te-boot.ldr et de transformer chaque accès MMIO non implémenté en tâche
mesurable.

## Préparer un firmware local

~~~bash
python3 tools/extract_op1.py /chemin/op1_246.op1 --output firmware/246
~~~

Le CRC est contrôlé avant décompression. Seuls les fichiers LDR sont extraits.
Le dossier firmware et les extensions de firmware sont ignorés par Git.

## Construire et lancer

Installer git, Python 3, un compilateur C, Meson, Ninja, pkg-config et les
en-têtes de développement GLib.

~~~bash
chmod +x native/build-qemu-bfin.sh native/run-op1.sh
native/build-qemu-bfin.sh
native/run-op1.sh firmware/246/te-boot.ldr
~~~

La journalisation guest_errors et unimp est activée afin que les périphériques
manquants apparaissent au lieu d’être maquillés.

## Prochain ordre technique

1. Confirmer la cartographie mémoire sur plusieurs LDR.
2. Faire atteindre au bootloader son premier accès MMIO inconnu.
3. Implémenter PLL, SIC, DMA, EBIU/SDRAM et NAND BF524.
4. Ajouter le contrôleur clavier, SPORT/audio et l’affichage OP-1.
5. Exposer GDB et un protocole de télémétrie au frontend React.
