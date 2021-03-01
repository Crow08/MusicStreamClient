import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {environment} from '../../../environments/environment';
import {RxStompService} from '@stomp/ng2-stompjs';
import {Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AuthenticationService} from '../../services/authentication.service';
import {ActivatedRoute} from '@angular/router';
import { Song } from 'src/app/models/song';
import { plainToClass } from 'class-transformer';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements AfterViewInit {
  private topic: Subscription;
  $player: HTMLAudioElement;
  sessionId: number;
  latency: number;

  constructor(private route: ActivatedRoute,
              private http: HttpClient,
              private rxStompService: RxStompService,
              private authenticationService: AuthenticationService) {
  }

  @ViewChild('audioPlayer') set playerRef(ref: ElementRef<HTMLAudioElement>) {
    this.$player = ref.nativeElement;
  }
  songTitle: string = "Welcome to this kinda good player";
  songArtist: string = "press Start to start (duh!)";

  ngAfterViewInit(): void {
    this.$player.volume = 0.1;
    const routeParams = this.route.snapshot.paramMap;
    this.sessionId = Number(routeParams.get('sessionId'));
    this.subscribeControlsTopic();
  }

  private subscribeControlsTopic(): void {
    if (this.topic) {
      this.topic.unsubscribe();
    }
    this.topic = this.rxStompService.watch(`/topic/sessions/${this.sessionId}`).subscribe((message: any) => {
      this.processCommand(message.body);
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

  doStartSong(songId: number, startTime: number, offset: number): void {
    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text'};
    this.http.get(`http://${environment.dbServer}/songs/${songId}/data/${offset}?X-NPE-PSU-Duration=PT1H`, options).subscribe(
      url => this.prepareSongStart(url, startTime, 0),
      error => {
        if (error.status === 422) {
          this.http.get(`http://${environment.dbServer}/songs/${songId}/data?X-NPE-PSU-Duration=PT1H`, options).subscribe(
            url => this.prepareSongStart(url, startTime, offset),
            console.error
          );
          return;
        }
        console.error(error);
      }
    );
    this.http.get(`http://${environment.dbServer}/songs/${songId}`, options).subscribe(
      rawSong => {
        const song = plainToClass(Song, JSON.parse(rawSong));
        this.songTitle = song.title;
        this.songArtist = `${song.artist==null?"Unknown Artist":song.artist}`;
      },
      console.error
    );
  }

  private doPauseSong(position: number): void {
    this.$player.pause();
    this.$player.currentTime = position / 1000;
  }

  private doResumeSong(startTime): void {
    this.schedulePlay(startTime);
  }

  private doStopSong(): void {
    this.$player.src = '';
  }

  private doSkipSong(songId: number, startTime: number): void {
    this.$player.src = '';
    this.doStartSong(songId, startTime, 0);

  }

  private prepareSongStart(url: string, startTime: number, offset: number): void {
    this.$player.src = url;
    this.$player.currentTime = offset / 1000;
    this.schedulePlay(startTime);
  }

  private schedulePlay(startTime: number): void {
    setTimeout(() => {
      this.$player.play().catch(reason => console.error(reason));
    }, startTime - (new Date()).getTime());
  }

  private processCommand(jsonString: string): void {
    const commandObject = JSON.parse(jsonString);
    switch (commandObject.type) {
      case 'Start':
        this.doStartSong(commandObject.songId, commandObject.time, commandObject.startOffset);
        break;
      case 'Pause':
        this.doPauseSong(commandObject.position);
        break;
      case 'Resume':
        this.doResumeSong(commandObject.time);
        break;
      case 'Stop':
        this.doStopSong();
        break;
      case 'Skip':
        this.doSkipSong(commandObject.songId, commandObject.time);
        break;
    }
  }
}
