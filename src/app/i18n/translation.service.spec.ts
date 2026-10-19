import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';
import { dictionaries, en, fr } from './translations';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TranslationService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('demarre en francais et annonce la langue au document', () => {
    expect(service.language()).toBe('fr');
    expect(service.t('home.title')).toBe('Accueil');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('change la langue globale, la conserve et retraduit les cles', () => {
    service.setLanguage('en');

    expect(service.language()).toBe('en');
    expect(service.t('profile.title')).toBe('My profile');
    expect(localStorage.getItem('movieDataLanguage')).toBe('en');
    expect(document.documentElement.lang).toBe('en');

    service.setLanguage('fr');

    expect(service.t('profile.title')).toBe('Mon profil');
  });

  it('remplace les jetons de parametres', () => {
    expect(service.t('home.greeting', { name: 'Ada' })).toBe('Bonjour Ada');
    expect(service.t('matching.rate', { rate: 80 })).toBe('80 % de correspondance');
  });

  it('conserve un jeton sans valeur plutot que afficher undefined', () => {
    expect(service.t('home.greeting')).toBe('Bonjour {name}');
  });

  it('fournit exactement les memes cles dans les deux langues', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
    expect(Object.keys(dictionaries.fr).length).toBeGreaterThan(50);
  });
});
