// Cle unique partagee par /movies et /favorites : le mode d'affichage choisi
// dans une page s'applique a l'autre et survit au rechargement du navigateur.
const VIEW_STORAGE_KEY = 'movieViewMode';

export type ViewMode = 'grid' | 'list';

/** Relit le mode enregistre, 'grid' par defaut si rien n'est stocke ou si le stockage est indisponible. */
export function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    // Navigation privee ou stockage desactive : le mode reste celui par defaut.
    return 'grid';
  }
}

/** Memorise le mode choisi. Un echec de stockage n'interrompt pas l'interface. */
export function writeViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {
    // Ignore : le mode ne sera simplement pas conserve au prochain rechargement.
  }
}