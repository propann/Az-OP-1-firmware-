# Az-OP-1 Firmware Lab

Laboratoire local d’analyse de firmware pour l’OP-1 original, ciblant le
**Blackfin ADSP-BF524C2**. Le projet sépare volontairement ce qui fonctionne
aujourd’hui de ce qui reste de la recherche.

## État réel

| Fonction | État |
|---|---|
| Validation du CRC32 d’un conteneur .op1 | Fonctionnel |
| Lecture de l’en-tête LZMA-Alone d’un .op1 | Fonctionnel |
| Analyse des blocs .ldr BF52x (en-tête ADI 16 octets) | Fonctionnel |
| Contrôle signature 0xAD, checksum XOR et bloc FINAL | Fonctionnel |
| Chargement des blocs LDR dans un bus mémoire virtuel | Expérimental |
| Désassemblage / exécution Blackfin | Sous-ensemble expérimental |
| Émulation complète de l’OP-1 et démarrage de OP1_vdk.ldr | Non disponible |
| Flash USB d’un OP-1 | Non disponible |

Le cœur TypeScript n’est **ni cycle-accurate, ni suffisamment complet pour
valider qu’un firmware réel démarre**. Un opcode inconnu arrête maintenant
l’exécution au lieu d’être silencieusement accepté comme un NOP.

## Pourquoi ce cadrage

Les recherches publiques indiquent que l’OP-1 original utilise un
ADSP-BF524C2, pas un BF533. De plus, un fichier .op1 n’est pas directement un
flux exécutable : op1repacker le décrit comme un CRC32 little-endian suivi
d’une archive TAR compressée en LZMA-Alone. Les fichiers te-boot.ldr et
OP1_vdk.ldr se trouvent dans l’archive extraite.

Le format des blocs LDR BF52x utilisé ici suit la structure publique
ADI_BOOT_HEADER : dBlockCode, pTargetAddress, dByteCount, puis dArgument.

## Références techniques

- [op1hacks/op1repacker](https://github.com/op1hacks/op1repacker) — format du conteneur, extraction et repack.
- [Tolsi/op1dumps](https://github.com/Tolsi/op1dumps) — identification BF524, dumps et références matérielles.
- [vapier/qemu, branche bfin](https://github.com/vapier/qemu/tree/bfin) — cœur Blackfin dérivé du GNU Simulator.
- [U-Boot ldrinfo](https://github.com/wowotechX/u-boot/blob/90e231b0fc58b6539a96a9526323f0338d8849ee/cmd/ldrinfo.c) — parcours des blocs LDR.
- [U-Boot bootrom.h](https://github.com/lentinj/u-boot/blob/415d386877df49eb051b85ef74fa59a16dc17c7d/arch/blackfin/include/asm/mach-common/bits/bootrom.h) — drapeaux et structures ADI.

Le port QEMU Blackfin existant émule une carte BF537, pas la carte OP-1 BF524.
Il constitue une bonne référence CPU, mais pas un émulateur OP-1 prêt à
compiler en WebAssembly.

## Démarrage

~~~bash
npm install
npm run test
npm run build
npm run dev
~~~

Node.js 18 ou plus récent est requis.

## Architecture cible

1. Conserver l’analyseur web comme banc de contrôle déterministe.
2. Intégrer un moteur CPU provenant du GNU Simulator ou du port QEMU Blackfin.
3. Ajouter un modèle de carte BF524 spécifique à l’OP-1.
4. Implémenter les périphériques depuis des traces et documents vérifiables.
5. Valider le boot par tests différentiels avec des fichiers fournis localement.

Voir [docs/EMULATION_STATUS.md](docs/EMULATION_STATUS.md) pour les critères.

## Sécurité

L’application ne flashe rien. Une validation CRC ou LDR réussie ne rend pas un
firmware sûr pour le matériel. Aucun firmware propriétaire n’est inclus.

Projet indépendant, non affilié à Teenage Engineering.
