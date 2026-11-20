# Fromagerie caprine — suivi de production, stock, ventes & traçabilité

Application web responsive (smartphone, tablette, ordinateur) qui remplace le classeur Excel
de suivi d’une fromagerie caprine : litrage, transformation, rendements, ventes,
autoconsommation, pertes, stocks et exports `.xlsx` prêts à archiver.

- **En local** : base SQLite dans `data/fromagerie.db`, aucun serveur à installer.
- **En ligne** : base **Turso** persistante (libSQL) + **mot de passe** partagé.
  Voir [DEPLOIEMENT.md](./DEPLOIEMENT.md).

> Vue d'ensemble du projet (fonctionnalités, architecture, exploitation) :
> [RESUME-PROJET.md](./RESUME-PROJET.md).

## Démarrage rapide (local)

Prérequis : **Node.js 24 ou supérieur**.

```bash
cd fromagerie
npm install
npm run dev          # http://localhost:3000
```

Pour un usage quotidien en production locale :

```bash
npm run build
npm start            # http://localhost:3000
```

Au premier lancement, la base `data/fromagerie.db` est créée automatiquement et remplie avec
**deux mois de données de démonstration** (les deux mois précédents + le mois en cours jusqu’à
la veille). La journée du jour reste vide pour tester la saisie.

Pour démarrer sans données de démonstration :

```bash
DEMO_DATA=0 npm run dev
```

## Mot de passe

Définissez `APP_PASSWORD` pour activer la page de connexion :

```bash
APP_PASSWORD="mon-mot-de-passe" npm start
```

- Cookie de session signé (HMAC-SHA256), HttpOnly, SameSite=Lax, 30 jours.
- Bouton **Se déconnecter** dans la barre latérale et dans **Réglages → Accès & sécurité**.
- Sans `APP_PASSWORD`, l’application reste ouverte (pratique en développement).
- `AUTH_SECRET` (optionnel) durcit la signature : `openssl rand -hex 32`.
  Changer `APP_PASSWORD` ou `AUTH_SECRET` déconnecte toutes les sessions.

## Fonctionnalités

### Saisie journalière (`/jour`)

Cinq blocs, pensés pour le mobile (grands champs numériques, clavier décimal) :

1. **Litrage** — lait brousses, fromages (faisselles incluses), tomes ; total automatique.
2. **Transformation** — brousses, fromages, faisselles, tomes ; rendements calculés
   automatiquement (pièces ÷ litres).
3. **Ventes** — brousses, fromages, faisselles, tomes.
4. **Consommation** — autoconsommation et dons.
5. **Pertes** — brousses, fromages, tomes, lait (1 L = 2 fromages), avec un interrupteur
   **« Déduire les pertes du stock »** pour chaque journée.

Le stock après la journée est affiché en direct, avec alerte rouge si une valeur devient
négative. Enregistrement automatique (900 ms après la dernière frappe), `Ctrl/Cmd + S`,
avertissement avant de quitter une page non enregistrée, suppression d’une journée.

Navigation par date : flèches jour précédent / suivant, sélecteur de date, retour à
« Aujourd’hui ».

### Vue mensuelle (`/mois`)

Calendrier du mois (jours saisis, litrage, alertes stock), totaux du mois (litrages,
production, ventes, consommation, pertes), rendements moyens **sur les jours travaillés**,
stock de fin de mois, répartitions et graphiques jour par jour.

### Vue annuelle (`/annee`)

Tableau janvier → décembre avec total annuel, poids en % de chaque mois, répartition de la
production et des ventes par produit, stock de fin d’année, évolution mensuelle du litrage.

### Exports Excel (`/api/export/...`)

- **Mensuel** : `fromagerie-AAAA-MM.xlsx`, un onglet reproduisant le tableau comptable
  (`DATE`, `LITRAGE`, `TRANSFORMATION`, `RENDEMENT`, `VENTE`, `CONSOMMATION`, `PERTES`,
  `STOCK`, `STOCK PRÉCÉDENT`), formules réelles (`SOMME`, `MOYENNE`, stock ligne à ligne),
  ligne `TOTAL` en ligne 36, mise en page paysage prête à imprimer.
- **Annuel** : `fromagerie-annee-AAAA.xlsx` avec 12 onglets mensuels (`JANV 26` … `DEC 26`),
  un onglet `TOTAL` (synthèse, répartitions et poids en %) et un onglet `PERTES` (synthèse
  mensuelle + détail journalier). Les stocks se reportent d’un onglet à l’autre par formule.

Les exports sont accessibles depuis les boutons « Excel du mois » / « Classeur annuel » et
depuis les réglages.

## Stock : règle de calcul

```text
Stock J = Stock J-1 + Transformation J − Ventes J − Consommation J
          − (Pertes J si « Déduire les pertes » est activé)
```

- Le stock de départ se paramètre dans **Réglages** (date de référence + quantités).
- Le report est continu : dernier jour du mois → premier jour du mois suivant, et
  31 décembre → 1er janvier de l’année suivante.
- Un stock négatif est signalé en rouge dans la saisie, le calendrier, les tableaux et les
  exports Excel.

## Sauvegarde & restauration

La sauvegarde est un **fichier JSON portable** qui fonctionne aussi bien avec la base locale
qu’avec Turso. Depuis **Réglages** :

- **Télécharger la sauvegarde (.json)** : toutes les journées + tous les réglages.
- **Restaurer une sauvegarde** : remplace les données en une seule transaction
  (confirmation demandée). Formats version 1 et 2 acceptés.
- Conservée sur une clé USB ou dans le cloud, elle sert aussi d’archive annuelle.

En ligne, Turso conserve les données indépendamment du serveur : un redéploiement ne perd
rien. Voir [DEPLOIEMENT.md](./DEPLOIEMENT.md) pour les sauvegardes Turso.

Réinitialisation en ligne de commande :

```bash
npm run db:reset                # supprime la base locale (démo régénérée)
npm run db:reset -- --vide      # base locale vide
npm run db:reset -- --distant   # vide la base Turso configurée
```

## Configuration

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | — | URL libSQL de la base Turso ; vide = fichier local |
| `TURSO_AUTH_TOKEN` | — | Jeton d’accès Turso |
| `APP_PASSWORD` | — | Mot de passe protégeant l’application ; vide = accès libre |
| `AUTH_SECRET` | dérivé du mot de passe | Clé de signature des cookies |
| `PORT` | `3000` | Port du serveur |
| `FROMAGERIE_DATA_DIR` | `./data` | Dossier des données locales |
| `FROMAGERIE_DB` | `./data/fromagerie.db` | Chemin complet du fichier local |
| `DEMO_DATA` | `1` | `0` pour ne pas générer la démonstration au premier lancement |
| `APP_TIMEZONE` | `Europe/Paris` | Fuseau utilisé pour « aujourd’hui » |

## Déploiement en ligne

Guide complet : **[DEPLOIEMENT.md](./DEPLOIEMENT.md)**.

Résumé : créez une base Turso, renseignez `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
`APP_PASSWORD`, `AUTH_SECRET` et `DEMO_DATA=0`, puis déployez sur Vercel (import GitHub) ou
Render (blueprint `render.yaml` fourni).

## Structure du projet

```text
src/
  app/
    (app)/                pages protégées (barre latérale + navigation mobile)
      jour/               saisie journalière
      mois/               tableau de bord mensuel
      annee/              synthèse annuelle
      parametres/         réglages, stock de départ, sauvegarde, session
    login/                page de connexion
    api/
      jour/               enregistrement / lecture / suppression d’une journée
      export/mois/        classeur Excel mensuel
      export/annee/       classeur Excel annuel
      export/json/        export JSON
      sauvegarde/         sauvegarde et restauration JSON
      parametres/         réglages, démo, remise à zéro
      login/, logout/     session
  components/             formulaire, navigation, calendrier, graphiques, UI
  lib/
    db.ts                 client libSQL (Turso ou fichier local), schéma, réglages
    repo.ts               requêtes async, stock, agrégats, sauvegarde JSON
    auth.ts               signature et vérification des cookies de session
    calc.ts               calculs métier (mouvements, rendements, totaux)
    excel.ts              génération ExcelJS (mensuel, TOTAL, PERTES)
    seed.ts               jeu de démonstration déterministe
    format.ts             dates et formats français
  proxy.ts                protection des pages et des API (Next.js 16)
public/logo.jpg           logo de l’exploitation
scripts/reset-db.mjs      réinitialisation locale ou distante
render.yaml               blueprint Render
data/fromagerie.db        base locale (créée au premier lancement)
```

## Notes techniques

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4.
- `@libsql/client` : même code pour Turso (production) et SQLite local (développement),
  API asynchrone (`execute`, `batch`, `transaction`).
- Protection d’accès dans `src/proxy.ts` (convention Next.js 16, ex-`middleware`).
- ExcelJS 4 pour les classeurs avec formules, styles, validations et zones d’impression.
- Les montants sont des nombres réels (litres décimaux, pièces entières) ; les rendements sont
  affichés avec deux décimales.
