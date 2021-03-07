import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {Subscription} from 'rxjs';
import {LatencyComponent} from '../latency/latency.component';
import {ActivatedRoute} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {RxStompService} from '@stomp/ng2-stompjs';
import {AuthenticationService} from '../../services/authentication.service';
import {environment} from '../../../environments/environment';
import {plainToClass} from 'class-transformer';
import {Song} from '../../models/song';
import {AudioService} from '../../services/audio.service';

enum PlayerState {
  WAITING = 'WAITING',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  STOP = 'STOP'
}

@Component({
  selector: 'app-session-lobby',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements AfterViewInit, OnInit {

  private static topic: Subscription;

  playerState: PlayerState = PlayerState.STOP;
  loopMode = false;
  queue: string[] = [];
  sessionId: number;
  currentSong: Song;
  progression = 0;
  songTimeOffset = 0;
  volume: number = 0.05;
  volumeCheck;


  @ViewChild('latencyComponent') latencyComponent: LatencyComponent;


  constructor(private route: ActivatedRoute,
              private http: HttpClient,
              private rxStompService: RxStompService,
              private authenticationService: AuthenticationService,
              private audioService: AudioService) {
  }

  ngOnInit(): void {
    const routeParams = this.route.snapshot.paramMap;
    this.sessionId = Number(routeParams.get('sessionId'));
    this.audioService.addProgressionListener((progression) => this.progression = progression);
  }

  ngAfterViewInit(): void {
    this.subscribeControlsTopic();
    setTimeout(() => this.publishCommand(`join/${this.authenticationService.currentUserValue.id}`), 1000 );

  }

  publishCommand(name: string): void {
    if (this.sessionId) {
      this.latencyComponent.startLatencyMeasurement();
      this.rxStompService.publish({destination: `/app/sessions/${this.sessionId}/commands/${name}`, body: name});
    } else {
      alert('No active Session!');
    }
  }

  loadNewSong(songId: number, startTime: number, offset: number, directPlay = true): void {
    if (songId === -1) {
      this.playerState = PlayerState.STOP;
      return;
    }
    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text'};
    const basePath = `http://${environment.dbServer}/songs/${songId}/data`;
    this.http.get(`${basePath}${(offset === 0 ? '' : `/${offset}`)}?X-NPE-PSU-Duration=PT1H`, options).subscribe(
      url => {
        this.songTimeOffset = offset;
        this.prepareSongStart(url, startTime, 0, directPlay);
      },
      error => {
        if (error.status === 422) {
          this.http.get(`${basePath}?X-NPE-PSU-Duration=PT1H`, options).subscribe(
            url => {
              this.songTimeOffset = 0;
              this.prepareSongStart(url, startTime, offset, directPlay);
            },
            console.error
          );
          return;
        }
      }
    );
    this.http.get(`http://${environment.dbServer}/songs/${songId}`, options).subscribe(
      rawSong => {
        this.currentSong = plainToClass(Song, JSON.parse(rawSong));
      },
      console.error
    );
  }

  startVolume(): void{
    this.volumeCheck = setInterval( ()=>{this.audioService.setVolume(this.volume)},100);
  }

  endVolume(): void{
    clearInterval(this.volumeCheck);
  }

  private subscribeControlsTopic(): void {
    if (PlayerComponent.topic) {
      PlayerComponent.topic.unsubscribe();
    }
    PlayerComponent.topic = this.rxStompService.watch(`/topic/sessions/${this.sessionId}`).subscribe((message: any) => {
      this.processCommand(message.body);
    });
  }

  private prepareSongStart(url: string, startTime: number, offset: number, directPlay: boolean): void {
    this.audioService.setSrc(url);
    this.audioService.setCurrentTime(offset / 1000);
    if (directPlay) {
      this.schedulePlay(startTime + this.latencyComponent.serverTimeOffset);
    }
  }

  private schedulePlay(startTime: number): void {
    this.playerState = PlayerState.WAITING;
    setTimeout(() => {
      this.audioService.play().catch(reason => console.error(reason));
      this.playerState = PlayerState.PLAY;
    }, startTime - (new Date()).getTime());
  }

  private processCommand(jsonString: string): void {
    this.latencyComponent.endLatencyMeasurement();
    const commandObject = JSON.parse(jsonString);
    switch (commandObject.type) {
      case 'Start':
        this.audioService.stop();
        this.loadNewSong(commandObject.songId, commandObject.time, 0);
        break;
      case 'Pause':
        this.audioService.pauseAtPosition(commandObject.position - this.songTimeOffset);
        this.playerState = PlayerState.PAUSE;
        break;
      case 'Resume':
        this.schedulePlay(commandObject.time);
        break;
      case 'Stop':
        this.audioService.stop();
        this.currentSong = undefined;
        this.playerState = PlayerState.STOP;
        break;
      case 'Join':
        if (commandObject.userId === this.authenticationService.currentUserValue.id) {
          this.loopMode = commandObject.loopMode;
          this.queue = commandObject.queue;
          switch (commandObject.sessionState) {
            case 'PLAY':
              this.loadNewSong(commandObject.songId, commandObject.time, commandObject.startOffset);
              break;
            case 'STOP':
              this.audioService.stop();
              this.playerState = PlayerState.STOP;
              break;
            case 'PAUSE':
              this.loadNewSong(commandObject.songId, commandObject.time, commandObject.startOffset, false);
              this.playerState = PlayerState.STOP;
              break;
          }
        }
        break;
      case 'Update':
        switch (commandObject.updateType) {
          case 'LoopMode':
            this.loopMode = commandObject.loopMode;
            break;
          case 'Queue':
            this.queue = commandObject.queue;
            break;
        }
        break;
    }
  }
}
