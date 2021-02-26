import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {environment} from '../../../environments/environment';
import {RxStompService} from '@stomp/ng2-stompjs';
import {Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AuthenticationService} from '../../services/authentication.service';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements AfterViewInit {
  private topic: Subscription;
  $player: HTMLAudioElement;
  sessionId: string;

  constructor(private http: HttpClient,
              private rxStompService: RxStompService,
              private authenticationService: AuthenticationService) { }

  @ViewChild('audioPlayer') set playerRef(ref: ElementRef<HTMLAudioElement>) {
    this.$player = ref.nativeElement;
  }

  ngAfterViewInit(): void {
    this.$player.volume = 0.2;
  }

  private subscribeControlsTopic(): void {
    if(this.topic){
      this.topic.unsubscribe();
    }
    this.topic = this.rxStompService.watch(`/topic/sessions/${this.sessionId}`).subscribe((message: any) => {
      console.log(message.body);
    });
  }

  startSong(): void {
    if (this.sessionId) {
      this.rxStompService.publish({destination: `/app/sessions/${this.sessionId}/commands/start`, body: 'text'});
    } else {
      alert('No active Session!');
    }
  }

  pauseSong(): void {
    if (this.sessionId) {
      this.rxStompService.publish({destination: `/app/sessions/${this.sessionId}/commands/pause`, body: 'text'});
    } else {
      alert('No active Session!');
    }
  }

  resumeSong(): void {
    if (this.sessionId) {
      this.rxStompService.publish({destination: `/app/sessions/${this.sessionId}/commands/resume`, body: 'text'});
    } else {
      alert('No active Session!');
    }
  }

  stopSong(): void {
    if (this.sessionId) {
      this.rxStompService.publish({destination: `/app/sessions/${this.sessionId}/commands/stop`, body: 'text'});
    } else {
      alert('No active Session!');
    }
  }

  skipSong(): void {
    if (this.sessionId) {
      this.rxStompService.publish({destination: `/app/sessions/${this.sessionId}/commands/skip`, body: 'text'});
    } else {
      alert('No active Session!');
    }
  }

  loadSong(songId): void {
    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text' };
    this.http.get(`http://${environment.dbServer}/songs/${songId}/data?X-NPE-PSU-Duration=PT1H`, options).subscribe(url => {
      const startSchedule = (new Date()).getMilliseconds() + 1000;

      console.log(url);
      this.$player.src = url;
      this.$player.currentTime = 0;
      setTimeout(() => {
        this.$player.play().then(value => {
            console.log(value);
          }
        ).catch(reason => console.error(reason));
      }, startSchedule - (new Date()).getMilliseconds());
    });
  }

}
