# Ionic Project

Application mobile Ionic/Angular de gestion de films. Le projet utilise Firebase
pour l'authentification et le stockage des profils utilisateurs.

## État actuel du projet

### Fonctionnalités implémentées

- **Création de compte** depuis `/register` avec les champs prénom, nom, âge,
  photo prise avec la caméra, e-mail, mot de passe et confirmation du mot de passe.
- **Validation de l'inscription** :
  - tous les champs sont obligatoires ;
  - l'âge doit être compris entre 13 et 120 ans ;
  - le mot de passe doit contenir au moins 6 caractères ;
  - les deux mots de passe doivent être identiques.
- **Connexion** depuis `/login` avec e-mail et mot de passe.
- **Déconnexion** depuis l'accueil ou le profil.
- **Photo de profil** : capture via Capacitor Camera, envoi vers Firebase Storage
  et sauvegarde de l'URL dans le profil Firestore.
- **Gestion des profils dans Firestore** : la création d'un compte crée un
  document dans la collection `users`, avec le rôle `user`, le statut actif et
  la date de création.
- **Page d'accueil protégée** (`/home`) accessible uniquement après connexion.
- **Page profil** (`/profile`) affichant le prénom, le nom, l'e-mail, l'âge, le
  rôle et le statut du compte.
- **Blocage des comptes désactivés** : un compte dont le champ `active` vaut
  `false` est déconnecté lors de la connexion.
- **Messages d'erreur utilisateur** pour les erreurs courantes Firebase
  (identifiants invalides, e-mail déjà utilisé, e-mail invalide, trop de
  tentatives, mot de passe faible).
- **Protection contre les attentes infinies** lors du chargement de l'état
  d'authentification et du profil, avec des délais d'expiration explicites.
- **Films MovieDB** : liste populaire, recherche et détails via l'API TMDB.
- **Playlist personnelle** : ajout et suppression de films favoris dans
  `favorites`, avec séparation par utilisateur.
- **Matching** : affichage des utilisateurs actifs dont le taux de films en
  commun est strictement supérieur à 75 % (formule de Jaccard).

### Écrans présents mais pas encore fonctionnels

Les routes suivantes existent et sont protégées par l'authentification, mais
leur interface est encore une page Ionic de base sans logique métier :

- `/admin/dashboard` : tableau de bord administrateur ;

Les routes utilisateur vérifient qu'un profil actif est présent et les routes
administrateur exigent un profil actif dont le rôle vaut `admin`.

## Technologies utilisées

- [Ionic](https://ionicframework.com/) 9
- Angular 22 avec composants standalone
- Capacitor 8
- Firebase 12 :
  - Firebase Authentication (e-mail / mot de passe) ;
  - Cloud Firestore (profils, films et playlists) ;
  - Firebase Storage (photos de profil).
- un compte TMDB et une clé API.
- TypeScript 6

## Prérequis

- Node.js et npm ;
- un projet Firebase configuré avec :
  - le fournisseur **E-mail/Mot de passe** activé dans Authentication ;
  - Cloud Firestore activé ;
  - Storage activé si la gestion des photos est ajoutée.

La configuration Firebase est définie dans :

- `src/environments/environment.ts` pour le développement ;
- `src/environments/environment.prod.ts` pour la production.
- renseigner `tmdb.apiKey` dans ces deux fichiers d'environnement.

Les règles Firestore versionnées se trouvent dans `firestore.rules`. Après
configuration du projet Firebase, elles peuvent être déployées avec :

```bash
npx firebase-tools deploy --only firestore:rules
```

Les règles Storage peuvent être déployées avec :

```bash
npx firebase-tools deploy --only storage
```

Pour tester la caméra sur Android/iOS, ajouter la plateforme native puis
synchroniser Capacitor :

```bash
npx cap add android
npx cap sync
```

## Installation

```bash
npm install
```

## Travailler avec Docker

Docker permet à chaque membre de l'équipe d'utiliser la même version de
Node.js et les mêmes dépendances, sans installer l'environnement localement.
Docker Desktop doit être démarré.

### Développement avec rechargement à chaud

```bash
docker compose up app
```

L'application est disponible sur `http://localhost:4200`. Le répertoire du
projet est monté dans le conteneur : les modifications de code sont donc
rechargées automatiquement. Le volume Docker `node_modules` évite d'écraser
les dépendances Linux du conteneur avec celles éventuellement présentes sur
Windows ou macOS.

Pour arrêter l'environnement :

```bash
docker compose down
```

### Vérifier l'image de production

```bash
docker compose --profile production up --build production
```

L'image compilée est disponible sur `http://localhost:8080`. Angular étant une
application à routes côté client, Nginx redirige les routes inconnues vers
`index.html`.

Les fichiers `.env` et `scripts/serviceAccountKey.json` sont exclus des images.
Ils ne doivent jamais être ajoutés à Git ni copiés dans un conteneur.

## Lancer l'application

```bash
npm start
```

L'application est ensuite disponible à l'adresse indiquée par Angular CLI
(généralement `http://localhost:4200`).

## Commandes disponibles

| Commande | Description |
| --- | --- |
| `npm start` | Lance le serveur de développement |
| `npm run build` | Compile l'application pour la production |
| `npm run watch` | Compile en mode développement avec surveillance des fichiers |
| `npm test` | Lance les tests unitaires |
| `npm run lint` | Vérifie le code TypeScript et les templates Angular |

## Organisation principale

```text
src/
└── app/
    ├── guards/       # Protection des routes
    ├── home/         # Accueil après connexion
    ├── models/       # Modèles UserProfile, Movie et Favorite
    ├── pages/        # Pages publiques, utilisateur et administration
    └── services/     # Authentification, Firebase et futurs services métier
```

### Flux d'authentification

1. L'utilisateur crée un compte ou se connecte avec Firebase Authentication.
2. À l'inscription, son profil est enregistré dans `users/{uid}` dans Firestore.
3. `authGuard` attend la résolution de l'état Firebase avant de laisser
   accéder aux routes protégées.
4. L'utilisateur est redirigé vers `/login` s'il n'est pas authentifié.
5. Après une connexion réussie, il est redirigé vers `/home`.

## Routes

| Route | Accès | État |
| --- | --- | --- |
| `/login` | Public | Connexion fonctionnelle |
| `/register` | Public | Inscription fonctionnelle |
| `/home` | Authentifié | Accueil et déconnexion fonctionnels |
| `/profile` | Authentifié | Consultation du profil fonctionnelle |
| `/movies` | Authentifié | Films populaires et recherche MovieDB |
| `/movie-details/:id` | Authentifié | Détails MovieDB et favoris |
| `/favorites` | Authentifié | Playlist personnelle |
| `/matching` | Authentifié | Correspondances supérieures à 75 % |
| `/admin/dashboard` | Administrateur actif | Placeholder |
| `/admin/users` | Administrateur actif | Placeholder |
| `/admin/movies` | Administrateur actif | Placeholder |

## Modèle utilisateur

Les profils stockés dans Firestore suivent la structure suivante :

```ts
{
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  photoUrl?: string;
  role: 'user' | 'admin';
  active: boolean;
  createdAt?: string;
}
```

## Limites connues

- La clé TMDB doit être renseignée manuellement dans les environnements.
- La liste des profils est lisible par les utilisateurs authentifiés afin de
  permettre le calcul du matching côté client.
- Le dashboard administrateur reste à compléter.
