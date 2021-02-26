import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {AuthenticationService} from '../../services/authentication.service';
import {Session} from '../../models/session';
import {plainToClass} from 'class-transformer';
import {RxStompService} from '@stomp/ng2-stompjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit {
  $player: HTMLAudioElement;
  sessionId: string;
  sessions: Session[] = [];

  @ViewChild('audioPlayer') set playerRef(ref: ElementRef<HTMLAudioElement>) {
    this.$player = ref.nativeElement;
  }

  constructor(private http: HttpClient,
              private authenticationService: AuthenticationService,
              private rxStompService: RxStompService) {
  }

  ngAfterViewInit(): void {
    this.$player.volume = 0.2;
  }

  browseSessions(): void {
    const options =  {headers: this.authenticationService.getAuthHeaderForCurrentUser()};
    this.http.get(`http://${environment.dbServer}/sessions/all`, options)
      .subscribe(valueArray => {
        this.sessions = [];
        (valueArray as any[]).forEach((rawSession) => this.sessions.push(plainToClass(Session, rawSession)));
      });
  }

  joinSession(id: string): void {
    this.sessionId = id;
    console.log('SESSION ID IS: ' + this.sessionId);
    this.rxStompService.watch(`/topic/sessions/${this.sessionId}`).subscribe((message: any) => {
      console.log(message.body);
    });
  }

  createSession(): void {
    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text' };
    this.http.put(`http://${environment.dbServer}/sessions/`, 'TEST SESSION', options)
      .subscribe(value => {
        console.log(value);
      });
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
}
