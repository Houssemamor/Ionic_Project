/**
 * Preparation commune des photos de profil (inscription et modification).
 * L'image est reduite pour rester sous la limite d'un document Firestore :
 * 512 px en JPEG, puis une seconde passe plus petite si necessaire.
 */
export const PROFILE_PHOTO_MAX_DATA_URL_LENGTH = 700_000;

const MAX_DIMENSION = 512;
const FALLBACK_DIMENSION = 384;
const INITIAL_QUALITY = 0.78;
const FALLBACK_QUALITY = 0.62;

/** Signale une photo qui reste trop volumineuse apres compression. */
export class ProfilePhotoTooLargeError extends Error {
  constructor() {
    super('profile-photo-too-large');
    this.name = 'ProfilePhotoTooLargeError';
  }
}

/**
 * Redimensionne et compresse une data URL d'image.
 * Une erreur de decodage renvoie la source inchangee : l'appelant verifie
 * ensuite la limite avant l'ecriture Firestore.
 */
export async function prepareProfilePhoto(dataUrl: string): Promise<string> {
  let prepared = await resizePhoto(dataUrl, MAX_DIMENSION, INITIAL_QUALITY);
  if (prepared.length > PROFILE_PHOTO_MAX_DATA_URL_LENGTH) {
    prepared = await resizePhoto(dataUrl, FALLBACK_DIMENSION, FALLBACK_QUALITY);
  }
  if (prepared.length > PROFILE_PHOTO_MAX_DATA_URL_LENGTH) {
    throw new ProfilePhotoTooLargeError();
  }
  return prepared;
}

function resizePhoto(dataUrl: string, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}
