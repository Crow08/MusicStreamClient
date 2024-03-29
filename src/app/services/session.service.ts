import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WsConfigService } from './ws-config.service';
import { RxStompService } from '@stomp/ng2-stompjs';
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
  }

  joinSession(sessionId: number): void {
    this.init(sessionId);
    this.router.navigateByUrl(`/sessions/${sessionId}/lobby`).catch(console.error);

    setTimeout(() => {
      if (!!this.authenticationService.currentUserValue) {
        this.wsService.publishSessionCommand(`join/${this.authenticationService.currentUserValue.id}`, 'join');
      }
    }, 1000);
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
      this.wsService.publishSessionCommand(`leave/${this.authenticationService.currentUserValue.id}`, 'leave');
    }
  }
}
