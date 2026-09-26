import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type AutoplayPolicy = 'allowed' | 'allowed-muted' | 'disallowed';

/**
 * Tracks whether the browser allows media playback with sound. Browsers block playback until the user has interacted
 * with the page, but playback in a session is started by server commands, not by clicks.
 */
@Injectable({
  providedIn: 'root',
})
export class AutoplayService {
  readonly blocked = new BehaviorSubject<boolean>(false);
  private pendingActions: (() => void)[] = [];
  private listening = false;

  private readonly interactionListener = () => this.onUserInteraction();

  /**
   * Determines whether playback is allowed without trying to play anything.
   * Uses the Autoplay Policy Detection API where available (Firefox) and the page's user activation otherwise, which
   * reliably indicates an allowed playback but may report a block that browser exceptions (e.g. Chrome's Media
   * Engagement Index) would have lifted.
   */
  check(): void {
    const policy = (navigator as { getAutoplayPolicy?: (type: string) => AutoplayPolicy }).getAutoplayPolicy?.(
      'mediaelement'
    );
    const allowed = policy ? policy === 'allowed' : navigator.userActivation?.hasBeenActive ?? false;
    this.setBlocked(!allowed);
  }

  /**
   * Marks playback with sound as blocked, e.g. after a play() request was rejected by the browser.
   *
   * @param retry action to run once the user has interacted with the page.
   */
  reportBlocked(retry: () => void): void {
    this.pendingActions.push(retry);
    this.setBlocked(true);
  }

  private setBlocked(blocked: boolean): void {
    this.blocked.next(blocked);
    if (blocked && !this.listening) {
      // any interaction unlocks playback for the whole page
      ['pointerdown', 'keydown'].forEach((type) => document.addEventListener(type, this.interactionListener, true));
      this.listening = true;
    }
  }

  private onUserInteraction(): void {
    ['pointerdown', 'keydown'].forEach((type) => document.removeEventListener(type, this.interactionListener, true));
    this.listening = false;
    this.blocked.next(false);
    const actions = this.pendingActions;
    this.pendingActions = [];
    actions.forEach((action) => action());
  }
}
