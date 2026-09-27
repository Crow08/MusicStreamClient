import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WsConfigService } from './ws-config.service';
import { RxStompService } from '@stomp/ng2-stompjs';
import { RxStompState } from '@stomp/rx-stomp';
import { AuthenticationService } from './authentication.service';
import { WsService } from './ws.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  public sessionId: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(null);

  constructor(
    private router: Router,
    private wsConfigService: WsConfigService,
    private rxStompService: RxStompService,
    private authenticationService: AuthenticationService,
    private wsService: WsService
  ) {
    this.rxStompService.configure(this.wsConfigService.myRxStompConfig());

    // after a lost connection the client missed commands: join again to get the current state of the session
    let connectedBefore = false;
    this.rxStompService.connectionState$.subscribe((state) => {
      if (state === RxStompState.OPEN) {
        if (connectedBefore && this.joinedSessionId !== null) {
          console.log('Reconnected: joining the session again');
          this.sendJoin(this.joinedSessionId, 500);
        }
        connectedBefore = true;
      }
    });
  }

  private joinedSessionId: number | null = null;

  joinSession(sessionId: number): void {
    this.init(sessionId);
    this.router.navigateByUrl(`/sessions/${sessionId}/lobby`).catch(console.error);
    this.joinedSessionId = sessionId;
    this.sendJoin(sessionId, 1000);
  }

  /**
   * @param delay time for the session topic to be subscribed, so the join response is not missed.
   */
  private sendJoin(sessionId: number, delay: number): void {
    setTimeout(() => {
      if (!!this.authenticationService.currentUserValue && this.joinedSessionId === sessionId) {
        this.wsService.publishSessionCommand(`join/${this.authenticationService.currentUserValue.id}`, 'join');
      }
    }, delay);
  }

  init(sessionId: number) {
    const currentSession = this.sessionId.getValue();
    if (currentSession !== sessionId && currentSession !== null) {
      this.leaveSession();
    }
    this.sessionId.next(sessionId);
    this.wsConfigService.updateWsConfig({
      session: sessionId,
    });
    this.rxStompService.configure(this.wsConfigService.myRxStompConfig());
  }

  private leaveSession(): void {
    if (this.sessionId.getValue() !== undefined && !!this.authenticationService.currentUserValue) {
      this.sessionId.next(null);
      this.joinedSessionId = null;
      this.wsService.publishSessionCommand(`leave/${this.authenticationService.currentUserValue.id}`, 'leave');
    }
  }
}
