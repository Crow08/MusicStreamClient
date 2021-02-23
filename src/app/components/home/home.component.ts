import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, ViewChild} from '@angular/core';
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
  songId: string;

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
    this.rxStompService.watch('/topic/greetings').subscribe((message: any) => {
      console.log(message.body);
    });
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
    this.rxStompService.publish({destination: '/app/hello', body: 'world'});
  }

  createSession(): void {
    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text' };
    this.http.put(`http://${environment.dbServer}/sessions/`, 'TEST SESSION', options)
      .subscribe(value => console.log(value));
  }

  browseSongs(): void {
    const options =  {headers: this.authenticationService.getAuthHeaderForCurrentUser()};
    this.http.get(`http://${environment.dbServer}/songs/all`, options)
      .subscribe(value => console.log(value));
  }

  loadSong(): void {
    const username = this.authenticationService.currentUserValue.username;
    const password = this.authenticationService.currentUserValue.password;

    this.$player.src = `http://${environment.dbServer}/songs/${this.songId}/data`;
    this.$player.load();
    this.$player.play();
    console.log(`SongId: ${this.songId}`);
  }
}
