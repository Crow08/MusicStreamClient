import {Inject, Injectable, InjectionToken, OnDestroy} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {OverlayContainer} from '@angular/cdk/overlay';
import {Platform} from '@angular/cdk/platform';

export const OVERLAY_PARENT_HTML = new InjectionToken<string>('OVERLAY_PARENT_HTML');

@Injectable({providedIn: 'root'})
export class ThemeAwareOverlayContainer extends OverlayContainer implements OnDestroy {
  constructor(@Inject(DOCUMENT) document: any, platform: Platform) {
    super(document, platform);
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  protected _createContainer(): void {
    super._createContainer();
    this.appendTheme();
  }

  private appendTheme(): void {
    if (!this._containerElement) {
      return;
    }
    this._containerElement.classList.add(document.querySelector('#app-theme-container').className);
  }
}
