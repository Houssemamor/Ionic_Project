# Ionic Project

Application mobile Ionic/Angular de découverte et de gestion de films. Les
utilisateurs peuvent créer un compte, rechercher des films, constituer une
playlist et trouver des profils ayant des goûts similaires. Les
administrateurs disposent d'un espace dédié pour gérer les utilisateurs et les
films enregistrés dans Firestore.

## Fonctionnalités

### Utilisateur

- Inscription avec prénom, nom, âge, e-mail, mot de passe et photo de profil.
- Validation des données d'inscription :
  - tous les champs sont obligatoires ;
  - l'âge doit être compris entre 13 et 120 ans ;
  - le mot de passe doit contenir au moins 6 caractères ;
  - la confirmation doit correspondre au mot de passe.
- Connexion et déconnexion avec Firebase Authentication.
- Profil utilisateur avec affichage des informations personnelles, du rôle et
  du statut du compte.
- Capture et stockage de la photo de profil avec Capacitor Camera et Firebase
  Storage.
- Consultation des films populaires et recherche avec l'API TMDB.
- Consultation des détails d'un film.
- Ajout et suppression de films dans une playlist personnelle.
- Matching avec les utilisateurs actifs ayant plus de 75 % de films en commun
  selon l'indice de Jaccard.
- Blocage automatique des comptes désactivés.

### Administration

- Accès protégé par authentification et vérification du rôle `admin`.
- Consultation, recherche et filtrage des utilisateurs par statut.
- Activation et désactivation des comptes utilisateurs.
- Ajout de films dans la collection Firestore `movies`.
- Suppression de films après confirmation.
- Tableau de bord administrateur présent comme point d'entrée pour les
  évolutions futures.

## Technologies

- [Ionic](https://ionicframework.com/) 9
- Angular 22 avec composants standalone
- Capacitor 8
- Firebase 12 :
  - Authentication (e-mail / mot de passe) ;
  - Cloud Firestore (profils, films et playlists) ;
  - Storage (photos de profil).
- API [TMDB](https://www.themoviedb.org/)
- TypeScript 6
- Docker et Nginx pour l'environnement de production

## Prérequis

- Node.js et npm ;
- un projet Firebase configuré avec :
  - le fournisseur **E-mail/Mot de passe** activé dans Authentication ;
  - Cloud Firestore activé ;
  - Firebase Storage activé ;
- une clé API TMDB.

Les paramètres Firebase et TMDB sont définis dans :

- `src/environments/environment.ts` pour le développement ;
- `src/environments/environment.prod.ts` pour la production.

Avant de lancer l'application, renseigner la clé `tmdb.apiKey` et les
paramètres du projet Firebase dans ces deux fichiers.

Les règles Firestore sont versionnées dans `firestore.rules`. Elles peuvent
être déployées avec :

```bash
npx firebase-tools deploy --only firestore:rules
```

Les règles Storage peuvent être déployées avec :

```bash
npx firebase-tools deploy --only storage
```

## Installation

```bash
npm install
```

## Création du compte administrateur

Le script `seed:admin` crée le compte Firebase Authentication et le profil
administrateur correspondant dans Firestore.

1. Placer la clé de compte de service Firebase dans
   `scripts/serviceAccountKey.json`.
2. Créer un fichier `.env` à la racine du projet :

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=mot-de-passe-securise
```

3. Exécuter le script :

```bash
npm run seed:admin
```

Les fichiers `.env` et `scripts/serviceAccountKey.json` sont ignorés par Git et
ne doivent jamais être publiés.

## Lancer l'application

```bash
npm start
```

L'application est disponible à l'adresse `http://localhost:4200`.

Pour tester la caméra sur Android ou iOS :

```bash
npx cap add android
npx cap sync
```

## Docker

Docker permet d'utiliser un environnement identique pour toute l'équipe.
Docker Desktop doit être démarré.

### Développement avec rechargement à chaud

```bash
docker compose up app
```

L'application est disponible à l'adresse `http://localhost:4200`. Pour
arrêter les conteneurs :

```bash
docker compose down
```

### Vérification de l'image de production

```bash
docker compose --profile production up --build production
```

L'application compilée est disponible à l'adresse `http://localhost:8080`.
Nginx redirige les routes côté client vers `index.html`.

## Commandes disponibles

| Commande | Description |
| --- | --- |
| `npm start` | Lance le serveur de développement |
| `npm run build` | Compile l'application |
| `npm run watch` | Compile en mode développement avec surveillance |
| `npm test` | Lance les tests unitaires |
| `npm run lint` | Vérifie le code TypeScript et les templates Angular |
| `npm run seed:admin` | Crée ou met à jour le compte administrateur |

## Routes

| Route | Accès | Fonction |
| --- | --- | --- |
| `/login` | Public | Connexion |
| `/register` | Public | Inscription |
| `/home` | Utilisateur actif | Accueil |
| `/profile` | Utilisateur actif | Profil |
| `/movies` | Utilisateur actif | Films populaires et recherche TMDB |
| `/movie-details/:id` | Utilisateur actif | Détails et favoris |
| `/favorites` | Utilisateur actif | Playlist personnelle |
| `/matching` | Utilisateur actif | Correspondances de goûts |
| `/admin/dashboard` | Administrateur actif | Tableau de bord |
| `/admin/users` | Administrateur actif | Gestion des utilisateurs |
| `/admin/movies` | Administrateur actif | Gestion des films |

## Organisation du projet

```text
src/
└── app/
    ├── guards/       # Protection des routes utilisateur et administrateur
    ├── home/         # Accueil après connexion
    ├── models/       # Modèles UserProfile, Movie et Favorite
    ├── pages/        # Pages publiques, utilisateur et administration
    └── services/     # Authentification, Firebase, films et matching
```

## Modèle utilisateur

Les profils stockés dans `users/{uid}` suivent cette structure :

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

## Sécurité et limites connues

- Les routes utilisateur nécessitent un profil actif.
- Les routes administrateur nécessitent un profil actif avec le rôle `admin`.
- Les règles Firestore autorisent l'écriture des films uniquement aux
  administrateurs.
- La clé TMDB doit être configurée dans les fichiers d'environnement.
- La liste des profils est lisible par les utilisateurs authentifiés pour
  permettre le calcul du matching côté client.
- Le tableau de bord administrateur est fonctionnel comme route protégée, mais
  son contenu métier reste à enrichir.
