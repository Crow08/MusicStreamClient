import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WsConfigService } from './ws-config.service';
import { RxStompService } from '@stomp/ng2-stompjs';
import { RxStompState } from '@stomp/rx-stomp';
import { AuthenticationService } from './authentication.service';
import { WsService } from './ws.service';
import { BehaviorSubject } from 'rxjs';

/** A join is repeated until the server confirms it, e.g. if it was processed before the topic subscription. */
const JOIN_ATTEMPTS = 3;
const JOIN_RETRY_DELAY = 2000;

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
          // give rx-stomp time to restore the topic subscription first
          this.requestJoin(500);
        }
        connectedBefore = true;
      }
    });
  }

  private joinedSessionId: number | null = null;
  /** Whether the server confirmed the join of the current session, i.e. the player knows the state of the session. */
  private joinAcknowledged = false;
  private joinRetry: ReturnType<typeof setTimeout> | null = null;

  /**
   * Opens the lobby of the session. The join itself is requested by the lobby once it listens to the session topic, so
   * the response can not be missed (see {@link requestJoin}).
   */
  joinSession(sessionId: number): void {
    this.init(sessionId);
    this.router.navigateByUrl(`/sessions/${sessionId}/lobby`).catch(console.error);
    this.joinedSessionId = sessionId;
  }

  /**
   * Requests the join unless the client is already in the session: the session continues when the lobby is opened
   * again, a new join would reload the media and interrupt the playback.
   */
  ensureJoined(): void {
    if (!this.joinAcknowledged) {
      this.requestJoin();
    }
  }

  /**
   * Sends the join for the current session and repeats it until {@link acknowledgeJoin} is called.
   */
  requestJoin(delay = 0): void {
    this.cancelJoin();
    let attempts = 0;
    const attempt = () => {
      const user = this.authenticationService.currentUserValue;
      if (!user || this.joinedSessionId === null) {
        return;
      }
      attempts++;
      this.wsService.publishSessionCommand(`join/${user.id}`, 'join');
      this.joinRetry = attempts < JOIN_ATTEMPTS ? setTimeout(attempt, JOIN_RETRY_DELAY) : null;
    };
    this.joinRetry = setTimeout(attempt, delay);
  }

  /** Called when the own join response arrived. */
  acknowledgeJoin(): void {
    this.joinAcknowledged = true;
    this.cancelJoin();
  }

  cancelJoin(): void {
    if (this.joinRetry !== null) {
      clearTimeout(this.joinRetry);
      this.joinRetry = null;
    }
  }

  init(sessionId: number) {
    const currentSession = this.sessionId.getValue();
    if (currentSession !== sessionId && currentSession !== null) {
      this.leaveSession();
    }
    // the session of the connection has to be set before the listeners of sessionId subscribe to its topic
    this.wsConfigService.updateWsConfig({
      session: sessionId,
    });
    this.rxStompService.configure(this.wsConfigService.myRxStompConfig());
    this.sessionId.next(sessionId);
  }

  /** Leaves the current session, which stops its playback. */
  leaveSession(): void {
    if (this.sessionId.getValue() !== undefined && !!this.authenticationService.currentUserValue) {
      this.cancelJoin();
      this.joinAcknowledged = false;
      this.sessionId.next(null);
      this.joinedSessionId = null;
      this.wsService.publishSessionCommand(`leave/${this.authenticationService.currentUserValue.id}`, 'leave');
    }
  }
}
