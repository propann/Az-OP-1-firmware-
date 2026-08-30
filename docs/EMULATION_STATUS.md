# Statut et contrat de vérité de l’émulation

## Définitions

- **Analyseur** : inspecte un fichier sans exécuter son code.
- **Simulateur fonctionnel** : reproduit un comportement musical ou une UI.
- **Émulateur CPU** : exécute les instructions de la cible.
- **Émulateur de machine** : ajoute la mémoire, les interruptions et tous les
  périphériques nécessaires au firmware.

Le projet fournit aujourd’hui un analyseur de formats et un petit émulateur CPU
expérimental. Il ne fournit pas encore un émulateur complet de l’OP-1.

## Corrections issues de l’audit

1. La cible documentée est ADSP-BF524C2, pas BF533.
2. L’écran de l’OP-1 original est traité en 320 × 160.
3. Un conteneur .op1 est vérifié comme CRC32 + flux LZMA-Alone.
4. Un en-tête LDR BF52x est lu dans l’ordre ADI réel : block code, adresse,
   taille, argument.
5. La signature 0xAD, le checksum XOR de l’en-tête et le bloc FINAL sont
   contrôlés.
6. Les opcodes non implémentés arrêtent le cœur TypeScript.
7. Les pseudo-firmwares officiels intégrés ont été remplacés par une fixture de
   diagnostic explicitement identifiée.

## Limites bloquant le démarrage d’un firmware réel

- Couverture incomplète du jeu d’instructions Blackfin, notamment les
  instructions parallèles DSP.
- Pas de modèle BF524 complet dans le port QEMU public étudié.
- Cartographie OP-1 des périphériques non vérifiée par traces.
- Pas de décompression LZMA/TAR embarquée dans le navigateur.
- Pas de NAND, contrôleur clavier, audio codec, USB boot et écran fidèles.
- Pas de suite différentielle contre GNU Simulator ou matériel réel.

## Critères avant d’écrire « émulateur OP-1 fonctionnel »

- Les tests d’instructions Blackfin publics passent sur le cœur choisi.
- te-boot.ldr atteint une boucle stable avec interruptions cohérentes.
- Les lectures/écritures MMIO inconnues sont journalisées et bloquantes.
- Le firmware principal atteint son initialisation sans opcode ignoré.
- L’audio et l’écran proviennent des sorties du firmware, pas d’une animation
  parallèle créée par l’interface.
- Trois versions de firmware fournies par l’utilisateur produisent des traces
  de démarrage reproductibles.

## Backend recommandé

Le candidat le plus crédible est le cœur de la branche bfin de vapier/qemu,
lui-même dérivé du GNU Simulator. Son port système est déclaré expérimental et
ses cartes publiques sont BF537. Il faut donc créer un modèle de machine OP-1
BF524 au lieu de renommer une carte existante.

Le frontend doit communiquer avec ce moteur via un protocole versionné :
chargement des blocs, run/pause/step, registres, mémoire, interruptions,
événements MMIO et framebuffer. Le cœur TypeScript peut rester comme fixture
rapide pour l’UI et les tests de contrat.
