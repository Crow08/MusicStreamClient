import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {WsConfigService} from './ws-config.service';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  constructor(private router: Router,
              private wsConfigService: WsConfigService) {
  }

  sessionId: number;

  joinSession(sessionId: number): void {
    this.leaveSession();
    this.sessionId = sessionId;
    this.router.navigateByUrl(`/sessions/${sessionId}/lobby`).catch(console.error);
    this.wsConfigService.updateWsConfig({
      session: this.sessionId,
    });
  }

  private leaveSession(): void {
    if (this.sessionId !== undefined){
      this.sessionId = undefined;
      // TODO: notify server.
    }
  }
}
