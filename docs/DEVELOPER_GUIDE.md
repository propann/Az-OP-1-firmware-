# Guide développeur

## Objectif

Construire un émulateur de machine capable d'exécuter le firmware de l'OP-1
original à partir de fichiers fournis localement par leur propriétaire. Le
simulateur musical React reste utile pour l'UX, mais ne constitue aucune preuve
d'émulation.

## Architecture

| Zone | Rôle | Niveau de confiance |
|---|---|---|
| `tools/op1lab.py` | Inspection, unpack, repack, comparaison, corpus | Fonctionnel et testé |
| `src/emulator/ldrParser.ts` | Validation web `.op1` / LDR BF52x | Fonctionnel et testé |
| `src/emulator/blackfinCpu.ts` | Petite fixture CPU pour l'interface | Expérimental |
| `native/` | QEMU Blackfin épinglé + machine BF524 OP-1 | Fondation expérimentale |
| `src/components/` | Cockpit de contrôle et simulateur UX | Ne prouve pas le boot |

Le clavier avancé reprend le mappage physique et la discipline des touches
tenues de `propann/Engineering-Studio`, puis les adapte à ce dépôt. Chaque
action alimente l'audio de démonstration et `op1Vm.peripherals.setKey`. Cette
matrice BF524 reste expérimentale tant que son MMIO n'est pas confirmé.

Le panneau MIDI fournit un profil persistant (`az-op1-midi-mapping-v1`) : port
actif, filtre de canal, première note de la plage 24 touches, routage vers la
matrice et MIDI Learn des quatre encodeurs. Les événements hors plage ne sont
pas injectés dans la matrice. Le journal sert de trace de contrôle, pas de
preuve que les adresses MMIO expérimentales correspondent au matériel.

Le moteur natif devra devenir la source unique des registres, de l'écran, du
son et des événements matériels. Le frontend ne doit pas inventer ces sorties
lors d'une session déclarée « firmware ».

## Commandes quotidiennes

```bash
make check-tools
make test
make build
python3 tools/op1lab.py inspect corpus/ma-version.op1
python3 tools/op1lab.py unpack corpus/ma-version.op1 -o firmware/ma-version
python3 tools/op1lab.py repack firmware/ma-version -o firmware/ma-version-etude.op1
python3 tools/op1lab.py compare firmware/version-a firmware/version-b
python3 tools/op1lab.py corpus corpus -o firmware/corpus-index.json
```

Les dossiers `corpus/` et `firmware/`, ainsi que les extensions de firmware,
sont ignorés par Git. Le repack est destiné aux expériences hors matériel : une
validation de structure ne garantit jamais qu'un fichier soit flashable.

## Méthode de recherche

Chaque découverte est classée comme suit :

- `PROUVÉ` : document public primaire, code de référence ou test reproductible.
- `OBSERVÉ` : trace issue d'un firmware local ou du matériel, avec empreinte et protocole.
- `INFÉRÉ` : conclusion cohérente mais non directement observée.
- `HYPOTHÈSE` : piste de travail à ne pas transformer en comportement silencieux.

Pour une MMIO inconnue, arrêter ou journaliser précisément adresse, largeur,
valeur, PC et nombre d'accès. Pour un opcode inconnu, arrêter avec le mot
d'instruction et le PC. Cette discipline évite les faux boots.

## Frontière juridique et sécurité

Le dépôt ne fournit ni firmware Teenage Engineering, ni dump, ni OTP, ni clé.
Les outils travaillent sur les fichiers que l'utilisateur possède. Aucune
commande n'écrit sur l'OP-1. Les recherches de modifications restent séparées
du chantier émulation jusqu'à nouvel ordre.
