import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: `
    <div
      class="h-1.5 w-full overflow-hidden rounded-full transition-colors"
      role="progressbar"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="100"
      [attr.aria-valuenow]="ariaValueNow()"
      [attr.aria-label]="ariaLabel() || null"
      [class.bg-dark-elevated]="isDark()"
      [class.bg-light-border]="!isDark()"
    >
      <div
        class="h-full rounded-full transition-all"
        [class.bg-accent]="true"
        [style.width.%]="percent() || 0"
      ></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  readonly percent = input<number | null>(0);
  readonly isDark = input(false);
  readonly ariaLabel = input('');

  readonly ariaValueNow = () => Math.round(this.percent() || 0);
}
