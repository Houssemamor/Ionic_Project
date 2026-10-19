// Langue demandee a TMDB pour les titres, synopsis et genres. La preference
// est globale a l'application : toutes les pages lisent la meme valeur, et le
// choix survit au rechargement du navigateur.
const LANGUAGE_STORAGE_KEY = 'movieDataLanguage';

export type MovieLanguage = 'fr' | 'en';

/** Relit la langue enregistree, 'fr' par defaut si rien n'est stocke ou si le stockage est indisponible. */
export function readMovieLanguage(): MovieLanguage {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'fr';
  } catch {
    // Navigation privee ou stockage desactive : la langue reste celle par defaut.
    return 'fr';
  }
}

/** Memorise la langue choisie. Un echec de stockage n'interrompt pas l'interface. */
export function writeMovieLanguage(language: MovieLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore : la langue ne sera simplement pas conservee au prochain rechargement.
  }
}
