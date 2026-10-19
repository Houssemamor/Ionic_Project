// Langue de l'application : interface, messages et metadonnees TMDB. Elle est
// globale et conservee sur l'appareil, comme le mode d'affichage.
const LANGUAGE_STORAGE_KEY = 'movieDataLanguage';

export type AppLanguage = 'fr' | 'en';

/** Relit la langue enregistree, 'fr' par defaut si rien n'est stocke ou si le stockage est indisponible. */
export function readAppLanguage(): AppLanguage {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'fr';
  } catch {
    // Navigation privee ou stockage desactive : la langue reste celle par defaut.
    return 'fr';
  }
}

/** Memorise la langue choisie. Un echec de stockage n'interrompt pas l'interface. */
export function writeAppLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore : la langue ne sera simplement pas conservee au prochain rechargement.
  }
}
