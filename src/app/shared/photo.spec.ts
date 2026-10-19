import { vi } from 'vitest';
import {
  PROFILE_PHOTO_MAX_DATA_URL_LENGTH,
  ProfilePhotoTooLargeError,
  prepareProfilePhoto,
} from './photo';

describe('prepareProfilePhoto', () => {
  class FakeImage {
    width = 1024;
    height = 768;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }

  beforeEach(() => {
    vi.stubGlobal('Image', FakeImage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redimensionne a 512 px et encode en JPEG', async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/jpeg;base64,small');

    const result = await prepareProfilePhoto('data:image/png;base64,large');

    expect(result).toBe('data:image/jpeg;base64,small');
    expect(drawImage).toHaveBeenCalledWith(expect.any(FakeImage), 0, 0, 512, 384);
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.78);
  });

  it('abaisse la qualite si la premiere version depasse la limite', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValueOnce('x'.repeat(PROFILE_PHOTO_MAX_DATA_URL_LENGTH + 1))
      .mockReturnValueOnce('data:image/jpeg;base64,small');

    const result = await prepareProfilePhoto('data:image/png;base64,large');

    expect(result).toBe('data:image/jpeg;base64,small');
    expect(toDataURL).toHaveBeenCalledTimes(2);
    expect(toDataURL).toHaveBeenLastCalledWith('image/jpeg', 0.62);
  });

  it('refuse une image encore trop volumineuse apres compression', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('x'.repeat(PROFILE_PHOTO_MAX_DATA_URL_LENGTH + 1));

    await expect(prepareProfilePhoto('data:image/png;base64,large'))
      .rejects.toBeInstanceOf(ProfilePhotoTooLargeError);
  });

  it('conserve la source si le navigateur ne fournit pas de canvas', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const source = 'data:image/png;base64,source';

    await expect(prepareProfilePhoto(source)).resolves.toBe(source);
  });
});
