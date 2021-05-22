import {Injectable} from '@angular/core';
import {SessionService} from './session.service';
import {RxStompService} from '@stomp/ng2-stompjs';

@Injectable({
  providedIn: 'root'
})
export class WsService {

  constructor(private sessionService: SessionService,
              private rxStompService: RxStompService) {
  }

  static SessionControlsTopic;

  publishSessionCommand(name: string, body: string): void {
    if (this.sessionService.sessionId) {
      this.rxStompService.publish({destination: `/app/sessions/${this.sessionService.sessionId}/commands/${name}`, body});
    } else {
      console.error('No active Session!');
    }
  }

  subscribeToSessionControls(callback: (body: string) => void): void {
    if (WsService.SessionControlsTopic.topic) {
      WsService.SessionControlsTopic.topic.unsubscribe();
    }
    WsService.SessionControlsTopic = this.rxStompService.watch(`/topic/sessions/${this.sessionService.sessionId}`)
      .subscribe((message: any) => {
     callback(message.body);
    });
  }
}
