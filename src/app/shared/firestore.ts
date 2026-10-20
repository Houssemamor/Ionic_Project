/**
 * Retire les proprietes undefined avant une ecriture Firestore.
 * Les modeles Movie/Favorite ont des champs optionnels : Firestore refuse
 * ces valeurs quand elles sont presentes dans un document.
 */
export function withoutUndefined<T extends object>(value: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  );
}
