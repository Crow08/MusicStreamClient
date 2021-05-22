import {Injectable} from '@angular/core';
import {SessionService} from './session.service';
import {RxStompService} from '@stomp/ng2-stompjs';
import {User} from '../models/user';
import {Subscription} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WsService {
  private static utilLatencyTopic: Subscription;
  private static SessionControlsTopic: Subscription;

  constructor(private sessionService: SessionService,
              private rxStompService: RxStompService) {
  }

  publishSessionCommand(name: string, body: string): void {
    if (this.sessionService.sessionId) {
      this.rxStompService.publish({destination: `/app/sessions/${this.sessionService.sessionId}/commands/${name}`, body});
    } else {
      console.error('No active Session!');
    }
  }

  publishUtilCommand(name: string, body: string): void {
    this.rxStompService.publish({destination: `/app/util/${name}`, body: 'ping'});
  }

  subscribeToSessionTopic(callback: (body: string) => void): void {
    if (WsService.SessionControlsTopic) {
      WsService.SessionControlsTopic.unsubscribe();
    }
    WsService.SessionControlsTopic = this.rxStompService.watch(`/topic/sessions/${this.sessionService.sessionId}`)
      .subscribe((message: any) => {
        callback(message.body);
      });
  }

  subscribeToUtilLatencyTopic(user: User, callback: (body: string) => void): void {
    if (WsService.utilLatencyTopic) {
      WsService.utilLatencyTopic.unsubscribe();
    }
    WsService.utilLatencyTopic = this.rxStompService.watch(`/topic/util/latency/${user.id}`)
      .subscribe((message: any) => {
        callback(message.body);
      });
  }

  unsubscribeFromSessionTopic(): void {
    if (WsService.SessionControlsTopic) {
      WsService.SessionControlsTopic.unsubscribe();
      WsService.SessionControlsTopic = undefined;
    }
  }

  unsubscribeFromUtilLatencyTopic(): void {
    if (WsService.utilLatencyTopic) {
      WsService.utilLatencyTopic.unsubscribe();
      WsService.utilLatencyTopic = undefined;
    }
  }

}
