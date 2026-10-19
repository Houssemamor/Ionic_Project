// Outils Angular utilisés pour créer et tester le composant.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoviesPage } from './movies.page';
import { Movie } from '../../../services/movie';

// Regroupe les tests de la page d'administration des films.
describe('MoviesPage', () => {
  // Références vers le composant, son environnement de test et le faux service.
  let component: MoviesPage;
  let fixture: ComponentFixture<MoviesPage>;
  let movieService: { list: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Remplace Firestore par un service simulé pour isoler les tests.
    movieService = {
      list: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: Movie, useValue: movieService }],
    });
    fixture = TestBed.createComponent(MoviesPage);
    component = fixture.componentInstance;

    // Déclenche la détection Angular et l'initialisation du composant.
    fixture.detectChanges();
  });

  // Vérifie que la page peut être créée.
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Vérifie qu'une suppression confirmée appelle le service et met à jour la liste.
  it('deletes a movie after confirmation', async () => {
    const movie = { id: 'movie-1', title: 'Film test', overview: 'Synopsis' };
    component.movies = [movie];
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await component.deleteMovie(movie);

    expect(movieService.delete).toHaveBeenCalledWith('movie-1');
    expect(component.movies).toEqual([]);
    expect(component.successMessage).toContain('Film test');
  });

  // Vérifie qu'une annulation ne déclenche aucune suppression.
  it('does not delete a movie when confirmation is cancelled', async () => {
    const movie = { id: 'movie-1', title: 'Film test', overview: 'Synopsis' };
    component.movies = [movie];
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await component.deleteMovie(movie);

    expect(movieService.delete).not.toHaveBeenCalled();
    expect(component.movies).toEqual([movie]);
  });
});
