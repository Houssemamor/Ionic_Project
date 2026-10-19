import { Routes } from '@angular/router';
import { activeUserGuard } from './guards/active-user-guard';
import { adminGuard } from './guards/admin-guard';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard, activeUserGuard],
  },
  {
    // Redirige vers /home : activeUserGuard renvoie a /login si la session
    // est absente, donc un visiteur anonyme atterrit quand meme sur la connexion
    // et un visiteur deja connecte n'a pas a se reconnecter.
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'movies',
    loadComponent: () => import('./pages/movies/movies.page').then( m => m.MoviesPage),
    canActivate: [authGuard, activeUserGuard],
  },
  {
    path: 'movie-details',
    loadComponent: () => import('./pages/movie-details/movie-details.page').then( m => m.MovieDetailsPage),
    canActivate: [authGuard, activeUserGuard]
  },
  {
    path: 'movie-details/:id',
    loadComponent: () => import('./pages/movie-details/movie-details.page').then((m) => m.MovieDetailsPage),
    canActivate: [authGuard, activeUserGuard],
  },
  {
    path: 'favorites',
    loadComponent: () => import('./pages/favorites/favorites.page').then( m => m.FavoritesPage),
    canActivate: [authGuard, activeUserGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then( m => m.ProfilePage),
    canActivate: [authGuard, activeUserGuard]
  },
  {
    path: 'matching',
    loadComponent: () => import('./pages/matching/matching.page').then( m => m.MatchingPage),
    canActivate: [authGuard, activeUserGuard]
  },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./pages/admin/dashboard/dashboard.page').then( m => m.DashboardPage),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/admin/users/users.page').then( m => m.UsersPage),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/movies',
    loadComponent: () => import('./pages/admin/movies/movies.page').then( m => m.MoviesPage),
    canActivate: [authGuard, adminGuard]
  },
];
