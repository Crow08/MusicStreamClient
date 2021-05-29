import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WsConfigService } from './ws-config.service';
import { RxStompService } from '@stomp/ng2-stompjs';
import { AuthenticationService } from './authentication.service';
import { WsService } from './ws.service';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  constructor(private router: Router,
    private wsConfigService: WsConfigService,
    private rxStompService: RxStompService,
    private authenticationService: AuthenticationService,
    private wsService: WsService) {
    this.rxStompService.configure(this.wsConfigService.myRxStompConfig());
  }

  public sessionId: number;

  joinSession(sessionId: number): void {
    this.leaveSession();
    this.sessionId = sessionId;
    this.router.navigateByUrl(`/sessions/${sessionId}/lobby`).catch(console.error);
    this.wsConfigService.updateWsConfig({
      session: this.sessionId,
    });
    this.rxStompService.configure(this.wsConfigService.myRxStompConfig());

    setTimeout(() => this.wsService.publishSessionCommand(`join/${this.authenticationService.currentUserValue.id}`, 'join'), 1000);
  }

  private leaveSession(): void {
    if (this.sessionId !== undefined) {
      this.sessionId = undefined;
      setTimeout(() => this.wsService.publishSessionCommand(`leave/${this.authenticationService.currentUserValue.id}`, 'leave'), 1000);
    }
  }
}
