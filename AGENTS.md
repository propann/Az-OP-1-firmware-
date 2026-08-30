# Guide impératif pour tout intervenant

Lire `README.md`, `docs/DEVELOPER_GUIDE.md`, `docs/EMULATION_STATUS.md` et
`docs/ROADMAP.md` avant de modifier le code d'émulation.

## Contrat de vérité

- La cible est l'OP-1 original à **ADSP-BF524C2** et écran **320 × 160**.
- `.op1` = CRC32 little-endian du payload + LZMA-Alone + TAR.
- `.ldr` = blocs ADI BF52x, en-tête 16 octets dans l'ordre code, adresse,
  taille, argument.
- Le cœur TypeScript est une fixture expérimentale, pas un émulateur complet.
- Le backend candidat est `vapier/qemu` branche `bfin`, commit épinglé par le
  script de build, complété par notre machine `op1-bf524`.
- Une hypothèse doit être marquée `HYPOTHÈSE`; une information matérielle doit
  citer une source ou une trace reproductible.
- Aucun opcode, MMIO ou échec ne doit être transformé silencieusement en NOP.
- Ne jamais écrire « émulateur fonctionnel » avant satisfaction des critères de
  `docs/EMULATION_STATUS.md`.

## Règles de contribution

- Ne jamais committer firmware, LDR, dump NAND/OTP, clé ou fichier propriétaire.
- Ne jamais ajouter de fonction de flash matériel dans le laboratoire.
- Toute correction de format ou de CPU exige une fixture synthétique et un test.
- L'extraction TAR doit refuser traversée de chemin, liens et fichiers spéciaux.
- Exécuter `make test` et `make build` avant une PR.
- Documenter toute nouvelle source dans `docs/TOOLCHAIN.md` ou le guide développeur.
