import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Camera, CameraResultType } from '@capacitor/camera';
import { vi } from 'vitest';
import { RegisterPage } from './register.page';

vi.mock('@capacitor/camera', () => ({
  Camera: { getPhoto: vi.fn() },
  CameraResultType: { DataUrl: 'dataUrl' },
}));

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ouvre le selecteur de fichiers web pour eviter PWA Elements', async () => {
    // Aucune data URL : le traitement d'image n'est pas lance, seul l'appel
    // Camera est verifie.
    vi.mocked(Camera.getPhoto).mockResolvedValue({} as never);

    await component.takePhoto();

    expect(Camera.getPhoto).toHaveBeenCalledWith(expect.objectContaining({
      resultType: CameraResultType.DataUrl,
      webUseInput: true,
    }));
  });
});
