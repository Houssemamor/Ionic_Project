import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationKey } from './translations';
import { TranslationParams, TranslationService } from './translation.service';

/**
 * Pipe de traduction. Impur volontairement : le resultat depend de la langue
 * courante, pas d'un argument du template, et doit donc etre recalcule quand
 * le signal de langue change, meme sans autre changement de binding.
 */
@Pipe({
  name: 'translate',
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly translations = inject(TranslationService);

  transform(key: TranslationKey, params?: TranslationParams): string {
    return this.translations.t(key, params);
  }
}
