import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { PlayerComponent } from '../player.component';
import { ActivatedRoute } from '@angular/router';
import { HttpHelperService } from '../../../services/http-helper.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { MediaService } from '../../../services/media.service';
import { WsService } from '../../../services/ws.service';
import { SessionService } from '../../../services/session.service';
import { LatencyComponent } from '../../latency/latency.component';

@Component({
  selector: 'app-full-player',
  templateUrl: './full-player.component.html',
  styleUrls: ['./full-player.component.scss'],
})
export class FullPlayerComponent
  extends PlayerComponent
  implements AfterViewInit, OnInit
{
  @ViewChild('latencyComponent') latencyComponent: LatencyComponent;
  @ViewChild('videoWrapper') videoWrapper: ElementRef;

  get isFullscreen(): boolean {
    return document.fullscreenElement != null;
  }

  @ViewChild('videoPlayer') set videoPlayer(videoPlayer: ElementRef) {
    PlayerComponent.videoElement = videoPlayer.nativeElement;
  }

  constructor(
    route: ActivatedRoute,
    httpHelperService: HttpHelperService,
    authenticationService: AuthenticationService,
    mediaService: MediaService,
    wsService: WsService,
    sessionService: SessionService
  ) {
    super();
    this.httpHelperService = httpHelperService;
    this.authenticationService = authenticationService;
    this.mediaService = mediaService;
    this.wsService = wsService;
    const routeParams = route.snapshot.paramMap;
    sessionService.joinSession(Number(routeParams.get('sessionId')));
  }

  ngOnInit(): void {
    this.mediaService.mediaEndedSubject.subscribe(() => {
      this.publishCommand(`end/${PlayerComponent.currentMedia.id}`);
    });
  }

  ngAfterViewInit(): void {
    this.wsService.subscribeToSessionTopic((body) => this.processCommand(body));
  }

  getLatencyComponent(): LatencyComponent {
    return this.latencyComponent;
  }

  isVideoMode() {
    return this.mediaService.isVideoMode();
  }

  private hideCursorTimeout: NodeJS.Timeout | null = null;

  fullscreen() {
    this.videoWrapper.nativeElement.requestFullscreen();
    document.onmousemove = () => {
      if (!!this.hideCursorTimeout) {
        clearTimeout(this.hideCursorTimeout);
      }
      this.videoWrapper.nativeElement.style.cursor = 'default';
      this.hideCursorTimeout = setTimeout(() => {
        this.videoWrapper.nativeElement.style.cursor = 'none';
      }, 1000);
    };
  }

  exitFullscreen() {
    document.onmousemove = undefined;
    clearTimeout(this.hideCursorTimeout);
    this.videoWrapper.nativeElement.style.cursor = 'default';
    document.exitFullscreen().catch(console.error);
  }

  private singleVideoClickTimeout: NodeJS.Timeout | null = null;

  onVideoClick() {
    if (!!this.singleVideoClickTimeout) {
      // double click
      clearTimeout(this.singleVideoClickTimeout);
      this.singleVideoClickTimeout = null;
      this.isFullscreen ? this.exitFullscreen() : this.fullscreen();
    } else {
      // single click
      this.singleVideoClickTimeout = setTimeout(() => {
        this.publishCommand(
          this.playerState === 'STOP'
            ? 'start'
            : this.playerState === 'PAUSE'
            ? 'resume'
            : 'pause'
        );
        this.singleVideoClickTimeout = null;
      }, 250);
    }
  }
}
