# Fromagerie caprine — résumé du projet

> Fiche de synthèse : ce que fait l'application, comment elle est construite, où elle
> tourne, et ce qu'il faut savoir pour l'exploiter au quotidien.
> Mise à jour : 20 novembre 2026.

## 1. En une phrase

Application web responsive qui remplace le classeur Excel d'une fromagerie caprine :
saisie quotidienne (litrage, transformation, ventes, pertes), suivi du stock,
recettes de caisse, récapitulatifs mensuels/annuels et exports Excel prêts à archiver.

- **En ligne** : https://fromagerie-caprine.vercel.app (Vercel + base Turso)
- **Code** : https://github.com/mcdpagenel-cell/fromagerie-caprine (branche `main`)
- **Accès** : mot de passe partagé (`APP_PASSWORD`), session 30 jours

## 2. Fonctionnalités

### Saisie journalière — `/jour`

Une page par date (flèches, sélecteur, retour à « Aujourd'hui »), organisée en blocs
pensés pour le mobile :

| Bloc | Contenu |
| --- | --- |
| **Litrage** | lait brousses, fromages, tomes — total automatique |
| **Transformation** | brousses, fromages, faisselles, tomes — rendements calculés (pièces ÷ litres) |
| **Ventes (pièces)** | brousses, fromages, faisselles, tomes |
| **Consommation** | autoconsommation et dons par produit |
| **Pertes** | brousses, fromages, tomes, lait (1 L = 2 fromages) + interrupteur « Déduire les pertes du stock » |

- **Enregistrement automatique** 900 ms après la dernière frappe, `Ctrl/Cmd + S`,
  avertissement avant de quitter une page non enregistrée.
- **Stock après la journée** affiché en direct, alerte rouge si négatif.
- **Bouton « Effacer la journée »** pour repartir de zéro sur une date.

### Historique et correction des saisies — page `/mois`

Section **« Historique des saisies »** listant les journées du mois avec deux actions :

- **Modifier** → ouvre `/jour/<date>` pré-rempli (même formulaire, mêmes calculs) ;
- **Supprimer** → confirmation, puis suppression ; les totaux du mois et les stocks
  suivants sont recalculés automatiquement.

### Caisse / recettes — `/ventes`

Suivi des encaissements réels, indépendant des ventes en pièces :

- une vente = un montant en euros + moyen de paiement (**Espèces** ou **Carte bancaire**)
  + note libre facultative ;
- formulaire de type caisse : après « Ajouter la vente », les champs se vident pour
  enchaîner, message de confirmation qui disparaît seul (~2,6 s) ;
- modification et suppression de chaque vente, avec confirmation ;
- trois vues : **Jour**, **Mois**, **Année** (URL `/ventes/2026-11-20`, `/ventes/2026-11`,
  `/ventes/2026`) ;
- répartition Espèces / Carte / Total, nombre de ventes, détail jour par jour.

### Récapitulatifs

- **`/mois`** : calendrier du mois (jours saisis, litrage, alertes stock), totaux
  (litrages, production, ventes, consommation, pertes), rendements moyens sur les jours
  travaillés, stock de fin de mois, graphiques jour par jour, **carte « Recettes du mois »**.
- **`/annee`** : tableau janvier → décembre, total annuel, poids en % de chaque mois,
  répartition production/ventes par produit, stock de fin d'année, évolution du litrage,
  **carte « Recettes de l'année »**.

### Exports et sauvegardes

- **Excel mensuel** : `fromagerie-AAAA-MM.xlsx`, tableau comptable avec formules réelles
  (`SOMME`, `MOYENNE`, stock ligne à ligne), ligne TOTAL, mise en page paysage imprimable.
- **Classeur annuel** : `fromagerie-annee-AAAA.xlsx`, 12 onglets mensuels + onglet TOTAL
  + onglet PERTES, stocks reportés d'un onglet à l'autre par formule.
- **Sauvegarde JSON** (Réglages) : journées + ventes + réglages, restaurable en un clic.
  Format **v3** (ventes incluses) ; les anciens fichiers v1/v2 restent acceptés.
- **Réinitialisation** (Réglages) : « Effacer tout l'historique » (journées + ventes,
  réglages conservés) ou « Recharger la démonstration ».

## 3. Règle de stock

```text
Stock J = Stock J-1 + Transformation J − Ventes J − Consommation J
          − (Pertes J si « Déduire les pertes » est activé)
```

- Stock de départ paramétré dans **Réglages** (date de référence + quantités).
- Report continu : fin de mois → mois suivant, 31 décembre → 1er janvier.
- Stock négatif signalé en rouge partout (saisie, calendrier, tableaux, Excel).

## 4. Architecture technique

| Élément | Choix |
| --- | --- |
| Framework | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| Styles | **Tailwind CSS 4** (design maison, responsive) |
| Base de données | **Turso** (libSQL) en ligne, fichier SQLite local en développement — même code via `@libsql/client` |
| Excel | **ExcelJS 4** (formules, styles, zones d'impression) |
| Auth | cookie de session signé HMAC-SHA256, HttpOnly, SameSite=Lax, 30 jours |
| Hébergement | **Vercel**, déploiement automatique à chaque `git push` sur `main` |

### Modèle de données (3 tables)

| Table | Rôle |
| --- | --- |
| `jours` | une ligne par date (clé primaire = `date`) : litrages, production, ventes en pièces, conso, pertes, note, `created_at` / `updated_at` |
| `ventes` | une ligne par encaissement : `id`, `date`, `montant`, `moyen` (`especes` / `carte`), `note`, horodatages |
| `reglages` | clé/valeur : nom de la ferme, sous-titre, date d'ouverture, stock de départ |

Les tables sont créées automatiquement au premier démarrage (`CREATE TABLE IF NOT EXISTS`).

### Organisation du code

```text
src/
  app/(app)/          pages protégées : jour, mois, annee, ventes, parametres
  app/login/          page de connexion
  app/api/            jour, ventes, parametres, sauvegarde, export/{mois,annee,json}, login/logout
  components/         DayForm, HistoryList, SaleForm, SalesList, navigation, calendrier, graphiques
  lib/db.ts           client libSQL, schéma, conversions
  lib/repo.ts         requêtes async, stock, agrégats, sauvegarde/restauration
  lib/calc.ts         calculs métier purs (mouvements, rendements, totaux)
  lib/excel.ts        génération des classeurs
  lib/seed.ts         jeu de démonstration déterministe
  lib/ventes.ts       interprétation des périodes /ventes
  proxy.ts            protection des pages et API (convention Next.js 16)
scripts/reset-db.mjs  réinitialisation locale ou distante
```

## 5. Exploitation

### Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | base Turso ; vides = fichier local |
| `APP_PASSWORD` | mot de passe de l'app ; vide = accès libre |
| `AUTH_SECRET` | clé de signature des cookies (dérivée du mot de passe par défaut) |
| `DEMO_DATA` | `0` pour ne pas générer de fausses données au premier lancement |
| `PORT`, `FROMAGERIE_DATA_DIR`, `FROMAGERIE_DB`, `APP_TIMEZONE` | options locales |

### Commandes utiles

```bash
npm run dev                      # développement (http://localhost:3000)
npm run build && npm start       # production locale
npm run db:reset                 # base locale supprimée (démo régénérée)
npm run db:reset -- --vide       # base locale vide
npm run db:reset -- --distant    # vide la base Turso (jours, ventes, réglages)
```

Le script distant ne lit pas `.env.local` de lui-même :

```bash
node --env-file=.env.local scripts/reset-db.mjs --distant
```

### Sauvegardes

- Réglages → **Télécharger la sauvegarde (.json)** : hebdomadaire recommandé, à conserver
  hors du PC (cloud, clé USB).
- Turso conserve les données indépendamment des redéploiements : publier une nouvelle
  version ne touche jamais aux saisies.
- Documentation complète : `DEPLOIEMENT.md` (mise en place) et
  `DEPLOIEMENT-SECOURS.md` (travailler sans son PC).

## 6. Points de vigilance

1. **Une journée = une personne à la fois.** Le formulaire du jour enregistre la journée
   entière en un bloc : si deux personnes modifient la *même date* simultanément, le
   dernier enregistrement écrase les valeurs de l'autre, sans alerte. Les **ventes de
   caisse**, elles, sont des lignes indépendantes : plusieurs personnes peuvent encaisser
   en parallèle sans risque.
2. **Pas d'actualisation temps réel.** Les chiffres des autres apparaissent à la
   navigation ou au rechargement de la page (pas de WebSocket).
3. **Mot de passe partagé**, pas de comptes individuels : suffisant pour une petite
   équipe, aucune traçabilité par personne.
4. **`.env.local` local pointe vers la base de production** : lancer l'app en local et
   cliquer « Effacer tout l'historique » agit sur les vraies données en ligne.
5. **Seuls cas de perte de données** : suppression volontaire, suppression de la base
   Turso, ou perte des accès (GitHub / Vercel / Turso / mot de passe d'app).

## 7. État actuel (20 novembre 2026)

- Fonctionnalités livrées et en production : saisie journalière, vues mois/année,
  exports Excel, sauvegarde/restauration v3, historique avec modification/suppression,
  suivi des ventes Espèces / Carte.
- Dernier commit : `da4b67e` (documentation du plan de secours).
- Base Turso de production : **vide** (0 journée, 0 vente, 7 réglages conservés) —
  prête pour les vraies saisies après la phase de test.
- Aucune donnée de démonstration ne sera recréée tant que les réglages existent.

## 8. Pistes d'évolution possibles

- Détection de conflit à l'enregistrement d'une journée (`updated_at` déjà stocké) :
  prévenir avant d'écraser une modification concurrente.
- Comptes utilisateurs et journal des modifications (qui a saisi quoi).
- Actualisation automatique des vues (polling léger ou revalidation).
- Tableau de bord d'accueil avec les chiffres du jour et les recettes en cours.
- Sauvegarde automatique planifiée (Turso → fichier daté).
