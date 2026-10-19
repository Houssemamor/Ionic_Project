/**
 * Marque "ne pas recommander" personnelle.
 * Seuls les identifiants sont stockes : l'interface recharge les metadonnees
 * du film depuis TMDB ou Firestore, et la collection reste compacte.
 */
export interface Dislike {
  id: string;
  movieId: string;
  tmdbId?: number;
  userId?: string;
  addedAt?: string;
}
