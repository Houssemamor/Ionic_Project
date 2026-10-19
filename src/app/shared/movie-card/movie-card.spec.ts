import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MovieCardComponent } from './movie-card';
import { Movie } from '../../models/movie.model';

describe('MovieCard', () => {
  let fixture: ComponentFixture<MovieCardComponent>;
  let component: MovieCardComponent;
  let router: Router;

  const movie: Movie = {
    id: 'tmdb-603',
    title: 'Le Fabuleux Destin d Amelie Poulain',
    overview: '',
    releaseDate: '2001-04-25',
    genres: ['Comédie', 'Romance', 'Familial', 'Drame'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(MovieCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('movie', movie);
    fixture.componentRef.setInput('view', 'grid');
  });

  it('affiche le titre, l annee et trois genres au maximum', () => {
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(movie.title);
    expect(text).toContain('(2001)');
    expect(text).toContain('Comédie, Romance, Familial');
    expect(text).not.toContain('Drame');
  });

  it('navigue vers les details au clic sur le bouton des actions', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    const detailsButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.card-actions ion-button',
    );
    detailsButton?.click();

    expect(navigate).toHaveBeenCalledWith(['/movie-details', movie.id]);
  });

  it('navigue vers les details apres un appui long sur la carte', () => {
    vi.useFakeTimers();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    component.onPressStart();
    vi.advanceTimersByTime(500);

    expect(navigate).toHaveBeenCalledWith(['/movie-details', movie.id]);
    vi.useRealTimers();
  });

  it('annule l appui long si le doigt se releve tot', () => {
    vi.useFakeTimers();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    component.onPressStart();
    vi.advanceTimersByTime(200);
    component.onPressEnd();
    vi.advanceTimersByTime(500);

    expect(navigate).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('change le libelle du bouton d action selon le contexte', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('♡ Favori');

    fixture.componentRef.setInput('isFavorite', true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('♥ Retirer');

    fixture.componentRef.setInput('favoriteAction', 'remove');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Retirer');
  });

  it('remplace les boutons texte par des icones empilees en mode liste', () => {
    fixture.componentRef.setInput('view', 'list');
    fixture.detectChanges();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.card-actions .icon-button',
    );
    expect(buttons.length).toBe(2);
    expect((fixture.nativeElement as HTMLElement).querySelector('.card-actions ion-button:not(.icon-button)')).toBeNull();
    expect(buttons[0].getAttribute('aria-label')).toBe('Voir les détails');
    expect(buttons[1].getAttribute('aria-label')).toBe('♡ Favori');
  });

  it('declenche l action depuis le bouton icone en mode liste', () => {
    const toggled: Movie[] = [];
    component.actionToggled.subscribe((movie) => toggled.push(movie));
    fixture.componentRef.setInput('view', 'list');
    fixture.detectChanges();

    const actionButton = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.card-actions .icon-button',
    )[1];
    actionButton.click();

    expect(toggled).toEqual([movie]);
  });

  it('affiche une poubelle sur la page favoris', () => {
    fixture.componentRef.setInput('view', 'list');
    fixture.componentRef.setInput('favoriteAction', 'remove');
    fixture.detectChanges();

    expect(component.actionIcon()).toBe('trash-outline');
  });

  it('masque le controle ne pas recommander par defaut', () => {
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.dislike-toggle')).toBeNull();
  });

  it('emet un dislike depuis le bouton superpose en mode grille', () => {
    const emitted: Movie[] = [];
    component.dislikeToggled.subscribe((value) => emitted.push(value));
    fixture.componentRef.setInput('showDislike', true);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.poster-wrapper .dislike-toggle',
    );
    expect(button?.getAttribute('aria-label')).toBe('Ne pas recommander');
    button?.click();

    expect(emitted).toEqual([movie]);
  });

  it('change le libelle quand le film est deja exclu des recommandations', () => {
    fixture.componentRef.setInput('showDislike', true);
    fixture.componentRef.setInput('isDisliked', true);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.poster-wrapper .dislike-toggle',
    );
    expect(button?.getAttribute('aria-label')).toBe('Recommander à nouveau');
    expect(button?.classList.contains('active')).toBe(true);
  });

  it('ajoute le dislike comme troisieme icone en mode liste', () => {
    const emitted: Movie[] = [];
    component.dislikeToggled.subscribe((value) => emitted.push(value));
    fixture.componentRef.setInput('view', 'list');
    fixture.componentRef.setInput('showDislike', true);
    fixture.detectChanges();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.card-actions .icon-button',
    );
    expect(buttons.length).toBe(3);
    expect(buttons[2].getAttribute('aria-label')).toBe('Ne pas recommander');
    buttons[2].click();

    expect(emitted).toEqual([movie]);
  });

  it('n alerte pas sur une icone manquante', async () => {
    // Sans addIcons, ion-icon tente un chargement d'asset et journalise
    // un "[Ionicons Warning]". Ce test echoue si l'enregistrement disparait.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fixture.componentRef.setInput('view', 'list');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(warn.mock.calls.flat().join(' ')).not.toContain('Ionicons Warning');
    warn.mockRestore();
  });

  it('affiche la note sur un badge en mode grille', () => {
    fixture.componentRef.setInput('movie', { ...movie, voteAverage: 7.84 });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const badge = element.querySelector('.rating-badge');
    expect(badge?.textContent?.trim()).toBe('7.8');
    expect(badge?.getAttribute('aria-label')).toBe('Note : 7.8 sur 10');
    expect(element.querySelector('.rating')).toBeNull();
  });

  it('affiche la note apres les genres en mode liste', () => {
    fixture.componentRef.setInput('movie', { ...movie, voteAverage: 8 });
    fixture.componentRef.setInput('view', 'list');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const rating = element.querySelector('.rating');
    expect(rating?.textContent?.trim()).toBe('8.0');
    expect(rating?.getAttribute('aria-label')).toBe('Note : 8.0 sur 10');
    expect(element.querySelector('.rating-badge')).toBeNull();
  });

  it('masque la note quand le film n a pas de votes', () => {
    // TMDB renvoie 0 pour un film sans vote, et l'administration peut creer
    // un film sans note du tout : les deux cas ne doivent rien afficher.
    fixture.componentRef.setInput('movie', { ...movie, voteAverage: 0 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.rating-badge')).toBeNull();

    fixture.componentRef.setInput('movie', movie);
    fixture.componentRef.setInput('view', 'list');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.rating')).toBeNull();
  });
});