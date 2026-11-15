# Déploiement de l'application fromagerie (Turso + Vercel ou Render)

L'application a besoin de deux choses en ligne :

1. **Une base persistante** : Turso (libSQL, offre gratuite généreuse, aucune mise en
   veille de la base).
2. **Un mot de passe partagé** : variable `APP_PASSWORD`.

> ⚠️ Sur Vercel, le système de fichiers est en lecture seule : la base locale
> `data/fromagerie.db` ne peut pas être utilisée. Turso est donc obligatoire en ligne.
> Sur Render, un disque persistant serait possible, mais Turso reste plus simple et
> survit aux redéploiements.

---

## 1. Créer la base Turso

Installez la CLI Turso puis créez la base (une seule fois) :

```bash
# Installation de la CLI (Linux / macOS)
curl -sSfL https://get.tur.so/install.sh | bash

turso auth signup          # ou: turso auth login
turso db create fromagerie-caprine
turso db show fromagerie-caprine --url       # → libsql://...
turso db tokens create fromagerie-caprine    # → jeton d'accès
```

Notez les deux valeurs :

- `TURSO_DATABASE_URL` : l'URL `libsql://…`
- `TURSO_AUTH_TOKEN` : le jeton (à garder secret, il ne s'affiche qu'une fois)

Le schéma (tables `jours` et `reglages`) est créé automatiquement au premier démarrage.

## 2. Variables d'environnement

| Variable | Obligatoire | Valeur conseillée |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | oui en ligne | `libsql://fromagerie-caprine-….turso.io` |
| `TURSO_AUTH_TOKEN` | oui en ligne | jeton généré ci-dessus |
| `APP_PASSWORD` | oui | mot de passe partagé avec votre sœur |
| `AUTH_SECRET` | recommandé | `openssl rand -hex 32` |
| `DEMO_DATA` | oui en ligne | `0` (sinon de fausses journées sont créées) |
| `APP_TIMEZONE` | non | `Europe/Paris` |

Générez la clé de signature :

```bash
openssl rand -hex 32
```

`AUTH_SECRET` peut rester vide : la clé est alors dérivée de `APP_PASSWORD`.
Changer `APP_PASSWORD` (ou `AUTH_SECRET`) déconnecte toutes les sessions.

## 3. Déployer sur Vercel

1. Poussez le dossier `fromagerie` dans un dépôt GitHub (privé de préférence).
2. Sur [vercel.com](https://vercel.com) → **Add New → Project** → importez le dépôt.
3. Framework détecté : **Next.js** (aucune configuration de build à modifier).
4. Dans **Settings → Environment Variables**, ajoutez les variables du tableau ci-dessus
   (cochez *Production*, *Preview* et *Development* selon vos besoins).
5. **Deploy**. À la première ouverture, l'écran de connexion s'affiche.
6. Dans **Réglages → Exploitation & stock de départ**, saisissez le stock réel et la date
   de référence, puis commencez les saisies.

Le plan Hobby de Vercel suffit. Aucun cron ni disque n'est nécessaire.

## 4. Déployer sur Render

Le fichier `render.yaml` à la racine décrit le service. Deux options :

**A. Blueprint (recommandé)**

1. Poussez le projet sur GitHub.
2. Render → **New → Blueprint** → sélectionnez le dépôt.
3. Render demande les valeurs des variables marquées `sync: false`
   (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`, `AUTH_SECRET`).
4. **Apply** : build `npm ci && npm run build`, start `npm start`.

**B. Service manuel**

- **New → Web Service** → dépôt GitHub.
- Runtime **Node**, build `npm ci && npm run build`, start `npm start`.
- Health check : `/login`.
- Ajoutez les variables d'environnement, puis **Create Web Service**.

Le plan gratuit de Render met le service en veille après 15 minutes d'inactivité :
la première requête suivante peut prendre ~30 secondes. Les données Turso ne sont
jamais perdues.

## 5. Première mise en service

1. Ouvrez l'URL fournie par l'hébergeur → page **Connexion**.
2. Entrez `APP_PASSWORD`.
3. **Réglages** :
   - nom de l'exploitation et sous-titre ;
   - date de référence + stock de départ (brousses, fromages, faisselles, tomes) ;
   - vérifiez que le stockage affiché est bien **Turso · …**.
4. Saisissez la journée du jour dans **Jour**.

La journée du jour n'est jamais pré-remplie : le stock de la veille est repris
automatiquement.

## 6. Sauvegardes

Les données vivent dans Turso, pas sur le serveur. Deux niveaux de sécurité :

- **Réglages → Télécharger la sauvegarde (.json)** : fichier lisible contenant
  toutes les journées et les réglages. À faire chaque semaine (cloud, clé USB…).
- **Turso** : `turso db shell fromagerie-caprine` pour inspecter la base, et les
  sauvegardes automatiques de l'offre Turso.

Restauration : **Réglages → Restaurer une sauvegarde**, puis choisir le `.json`.
L'opération remplace toutes les données en une seule transaction.

## 7. Vider la base en ligne

Utilisez **Réglages → Effacer tout l'historique** (le stock de départ est conservé),
ou en ligne de commande :

```bash
TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npm run db:reset -- --distant
```

## 8. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| Page blanche / erreur 500 au démarrage | variables Turso absentes ou jeton invalide | vérifiez `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN`, puis redéployez |
| Les données reviennent à zéro après un redéploiement | l'application écrit dans un fichier local | renseignez les variables Turso |
| Mot de passe refusé | `APP_PASSWORD` contient des espaces ou a changé | vérifiez la variable, redéployez |
| Déconnecté à chaque visite | cookie bloqué (HTTPS requis) | utilisez l'URL `https://` de l'hébergeur |
| De fausses journées apparaissent | `DEMO_DATA` non défini sur une base vide | videz la base puis mettez `DEMO_DATA=0` |

## 9. Coûts

- **Turso** : offre gratuite (plusieurs Go, plusieurs milliards de lectures/mois) —
  très large pour une exploitation fromagère.
- **Vercel** : plan Hobby gratuit pour un usage personnel.
- **Render** : plan gratuit avec mise en veille (ou ~7 $/mois sans veille).

Aucune carte bancaire n'est nécessaire pour démarrer sur ces offres gratuites.
