import { Injectable } from '@angular/core';
import { RxStompService } from '@stomp/ng2-stompjs';
import { filter, first, Subject, Subscription, timeout } from 'rxjs';
import { WsConfigService } from './ws-config.service';
import { ClockSyncService } from './clock-sync.service';

/** Time to wait for an error response before a command is considered successful. */
const ERROR_RESPONSE_TIMEOUT = 1000;

export interface CommandError {
  message: string;
  destination: string;
}

@Injectable({
  providedIn: 'root',
})
export class WsService {
  /** Failed commands of this client, reported by the server. */
  readonly errors = new Subject<CommandError>();

  private static SessionControlsTopic: Subscription | undefined;

  constructor(
    private wsConfigService: WsConfigService,
    private rxStompService: RxStompService,
    private clockSyncService: ClockSyncService
  ) {
    this.rxStompService.watch('/user/queue/errors').subscribe((message) => {
      const error = JSON.parse(message.body) as CommandError;
      console.error(`Command ${error.destination} failed: ${error.message}`);
      this.errors.next(error);
    });
  }

  publishSessionCommand(name: string, body: string): void {
    if (this.wsConfigService.configParameter.session) {
      const headers = this.clockSyncService.tagCommand(name);
      this.rxStompService.publish({ destination: this.getSessionCommandDestination(name), body, headers });
    } else {
      console.error('No active Session!');
    }
  }

  /**
   * Publishes a session command and resolves to false if the server reports an error for it, true otherwise.
   * Commands are broadcast to all clients, so success is assumed when no error arrives in time.
   */
  publishSessionCommandWithResult(name: string, body: string): Promise<boolean> {
    const destination = this.getSessionCommandDestination(name);
    const result = new Promise<boolean>((resolve) => {
      this.errors
        .pipe(
          filter((error) => error.destination === destination),
          first(),
          timeout(ERROR_RESPONSE_TIMEOUT)
        )
        .subscribe({ next: () => resolve(false), error: () => resolve(true) });
    });
    this.publishSessionCommand(name, body);
    return result;
  }

  private getSessionCommandDestination(name: string): string {
    return `/app/sessions/${this.wsConfigService.configParameter.session}/commands/${name}`;
  }

  subscribeToSessionTopic(callback: (body: string) => void): void {
    if (WsService.SessionControlsTopic) {
      WsService.SessionControlsTopic.unsubscribe();
    }
    WsService.SessionControlsTopic = this.rxStompService
      .watch(`/topic/sessions/${this.wsConfigService.configParameter.session}`)
      .subscribe((message: any) => {
        this.clockSyncService.onResponse(message.headers);
        callback(message.body);
      });
  }

  unsubscribeFromSessionTopic(): void {
    if (WsService.SessionControlsTopic) {
      WsService.SessionControlsTopic.unsubscribe();
      WsService.SessionControlsTopic = undefined;
    }
  }
}
