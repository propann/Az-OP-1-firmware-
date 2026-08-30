# Contribuer

Le projet accepte les contributions qui améliorent l'analyse vérifiable ou
l'émulation de l'OP-1 original. Les modifications de firmware destinées au
flash sont volontairement hors du périmètre actuel.

## Mise en route

```bash
npm install
make check-tools
make test
make build
```

Python 3.10+ et Node.js 18+ sont requis. Le laboratoire Python n'a aucune
dépendance PyPI.

## Avant une pull request

1. Relire `AGENTS.md` et conserver le contrat de vérité.
2. Ajouter un test synthétique pour tout parseur, opcode ou périphérique.
3. Séparer fait observé, inférence et hypothèse dans la documentation.
4. Indiquer la version/empreinte des données de test sans publier ces données.
5. Joindre les commandes exécutées et leurs résultats.

Une PR ne doit contenir aucun `.op1`, `.ldr`, dump NAND/OTP ou binaire extrait.
