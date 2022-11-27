import { Inject, Injectable, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Platform } from '@angular/cdk/platform';
import { availableThemes } from './services/settings.service';

@Injectable({ providedIn: 'root' })
export class ThemeAwareOverlayContainer extends OverlayContainer implements OnDestroy {
  constructor(@Inject(DOCUMENT) document: any, platform: Platform) {
    super(document, platform);
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  override getContainerElement(): HTMLElement {
    this.appendTheme();
    return super.getContainerElement();
  }

  protected override _createContainer(): void {
    super._createContainer();
    this.appendTheme();
  }

  private appendTheme(): void {
    if (!this._containerElement) {
      return;
    }
    const toBeRemoved: string[] = [];
    this._containerElement.classList.forEach((containerClass) => {
      if (!!availableThemes.find((themeClass) => themeClass.className === containerClass)) {
        toBeRemoved.push(containerClass);
      }
    });
    toBeRemoved.forEach((themeClass) => this._containerElement.classList.remove(themeClass));
    const themeContainer = document.querySelector('#app-theme-container');
    if (!!themeContainer) {
      this._containerElement.classList.add(themeContainer.className);
    }
  }
}
