# Boîte à outils d'étude

`make check-tools` indique ce qui est présent. Aucune dépendance optionnelle
n'est téléchargée automatiquement.

| Besoin | Outil | Statut / usage |
|---|---|---|
| Conteneur OP-1 | `tools/op1lab.py` | Intégré, stdlib, strict, testé |
| Référence repack | [op1repacker](https://github.com/op1hacks/op1repacker) | MIT, référence des paramètres LZMA |
| Identification | `file`, `xxd`, `strings`, `sha256sum` | Outils système recommandés |
| Archives | Python `tarfile`/`lzma`, `tar`, `xz` | Inspection croisée |
| Différences | `diff`, `diffoscope` | Comparaison fichiers/arborescences |
| Recherche de signatures | [binwalk](https://github.com/ReFirmLabs/binwalk) | Optionnel; valider ses extractions |
| Analyse ELF | GNU `readelf`, `objdump` | Utile aux artefacts ELF; un LDR n'est pas un ELF |
| Désassemblage Blackfin | GNU Binutils Blackfin historique | À figer en conteneur; disponibilité moderne variable |
| Émulation CPU | [vapier/qemu `bfin`](https://github.com/vapier/qemu/tree/bfin) | Backend retenu, fork expérimental |
| Analyse interactive | [radare2](https://github.com/radareorg/radare2), [Rizin](https://github.com/rizinorg/rizin) | Vérifier le support Blackfin de la version installée |
| Reverse engineering | [Ghidra](https://github.com/NationalSecurityAgency/ghidra) | Libre; Blackfin exige un module processeur tiers à valider |
| Alternative IDA | [Blackfin IDA Pro Plugin](https://github.com/op1hacks/Blackfin-IDA-Pro-Plugin) | Plugin GPL-2.0; IDA reste propriétaire |
| Données matérielles | [Tolsi/op1dumps](https://github.com/Tolsi/op1dumps) | Source de recherche sans licence déclarée; ne rien vendoriser |

## Installation de base Debian/Ubuntu

```bash
sudo apt install python3 git make file xxd xz-utils binutils diffutils
```

`pkg-config`, GLib et les paquets de compilation exigés par la version QEMU
épinglée sont contrôlés dans `native/build-qemu-bfin.sh`. Utiliser le script et
ne pas remplacer silencieusement la branche par un QEMU récent dépourvu de la
cible Blackfin.

## Outils à ne pas confondre

- `strings` et Binwalk trouvent des indices, pas des preuves de contrôle de flux.
- Un désassembleur Blackfin ne fournit pas la carte de la machine OP-1.
- Un repack structurellement valide n'est pas certifié installable.
- Les dumps NAND/OTP peuvent contenir des données uniques ou propriétaires.
- Aucun outil optionnel n'autorise à publier le firmware étudié.
