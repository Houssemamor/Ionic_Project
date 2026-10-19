import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Movie } from '../../../models/movie.model';
import { TmdbService } from '../../../services/tmdb.service';
import { LoginHeroComponent } from './login-hero';

describe('LoginHeroComponent', () => {
  let fixture: ComponentFixture<LoginHeroComponent>;
  let component: LoginHeroComponent;
  let nowPlayingHighlights: ReturnType<typeof vi.fn>;

  const highlights: Movie[] = [
    {
      id: 'tmdb-1',
      title: 'Film A',
      overview: '',
      backdropPath: 'a.jpg',
      releaseDate: '2026-01-01',
      voteAverage: 8.4,
    },
    {
      id: 'tmdb-2',
      title: 'Film B',
      overview: '',
      backdropPath: 'b.jpg',
      releaseDate: '2026-02-01',
      voteAverage: 7.9,
    },
    {
      id: 'tmdb-3',
      title: 'Film C',
      overview: '',
      backdropPath: 'c.jpg',
      releaseDate: '2026-03-01',
      voteAverage: 7.5,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    nowPlayingHighlights = vi.fn().mockResolvedValue(highlights);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TmdbService,
          useValue: { nowPlayingHighlights },
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  /** Cree le composant seulement apres la configuration du test courant. */
  async function load(): Promise<void> {
    fixture = TestBed.createComponent(LoginHeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  }

  it('affiche la premiere affiche et une pastille par film', async () => {
    await load();

    const element = fixture.nativeElement as HTMLElement;
    expect(nowPlayingHighlights).toHaveBeenCalledWith(5);
    expect(element.querySelector('.hero-content h2')?.textContent).toContain('Film A');
    expect(element.querySelectorAll('.hero-slide').length).toBe(3);
    expect(element.querySelectorAll('.hero-slide.active').length).toBe(1);
    expect(element.querySelectorAll('.hero-dot').length).toBe(3);
  });

  it('avance automatiquement apres six secondes', async () => {
    await load();

    await vi.advanceTimersByTimeAsync(6000);
    fixture.detectChanges();

    expect(component.activeIndex()).toBe(1);
    expect((fixture.nativeElement as HTMLElement)
      .querySelector('.hero-content h2')?.textContent).toContain('Film B');
  });

  it('met le diaporama en pause et le reprend', async () => {
    await load();

    const pause = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.hero-pause');
    pause?.click();
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(12000);
    expect(component.activeIndex()).toBe(0);

    pause?.click();
    await vi.advanceTimersByTimeAsync(6000);
    expect(component.activeIndex()).toBe(1);
  });

  it('selectionne une affiche avec les pastilles', async () => {
    await load();

    const dots = (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.hero-dot');
    dots[2].click();
    fixture.detectChanges();

    expect(component.activeIndex()).toBe(2);
    expect(dots[2].getAttribute('aria-current')).toBe('true');
  });

  it('affiche un repli lorsque TMDB ne renvoie aucun film', async () => {
    nowPlayingHighlights.mockResolvedValueOnce([]);

    await load();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.hero-empty')?.textContent).toContain('Diaporama indisponible.');
    expect(element.querySelector('.hero-dot')).toBeNull();
  });

  it('ne demarre pas le diaporama avec prefers-reduced-motion', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    await load();

    expect((fixture.nativeElement as HTMLElement).querySelector('.hero-pause')).toBeNull();
    await vi.advanceTimersByTimeAsync(6000);
    expect(component.activeIndex()).toBe(0);
  });});
