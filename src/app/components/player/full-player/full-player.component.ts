import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { PlayerComponent } from '../player.component';
import { ActivatedRoute } from '@angular/router';
import { HttpHelperService } from '../../../services/http-helper.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { MediaService } from '../../../services/media.service';
import { WsService } from '../../../services/ws.service';
import { SessionService } from '../../../services/session.service';
import { SettingsService } from '../../../services/settings.service';
import { LatencyComponent } from '../../latency/latency.component';
import { Subscription } from 'rxjs';
import { AutoplayService } from '../../../services/autoplay.service';

@Component({
  selector: 'app-full-player',
  templateUrl: './full-player.component.html',
  styleUrls: ['./full-player.component.scss'],
})
export class FullPlayerComponent extends PlayerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('latencyComponent') latencyComponent: LatencyComponent | undefined;
  @ViewChild('videoWrapper') videoWrapper: ElementRef | undefined;
  private hideCursorTimeout: number | null = null;
  private singleVideoClickTimeout: number | null = null;
  private readonly mediaSubscriptions = new Subscription();

  constructor(
    route: ActivatedRoute,
    httpHelperService: HttpHelperService,
    authenticationService: AuthenticationService,
    mediaService: MediaService,
    wsService: WsService,
    private sessionService: SessionService,
    public settingsService: SettingsService,
    autoplayService: AutoplayService
  ) {
    super();
    this.httpHelperService = httpHelperService;
    this.authenticationService = authenticationService;
    this.mediaService = mediaService;
    this.wsService = wsService;
    this.autoplayService = autoplayService;

    this.autoplayService.check();
    sessionService.joinSession(Number(route.snapshot.paramMap.get('sessionId')));

    // MediaService is app-wide: these subscriptions have to end with this component (see ngOnDestroy)
    this.mediaSubscriptions.add(
      this.mediaService.mediaEndedSubject.subscribe(() => {
        this.publishCommand(`end/${PlayerComponent.currentMedia.id}`);
      })
    );
    this.mediaSubscriptions.add(this.mediaService.timeUpdate.subscribe(() => this.correctDrift()));
    this.mediaSubscriptions.add(
      this.mediaService.mediaCanPlayThrough.subscribe(() => {
        console.log('READY');
        const id = this.authenticationService.currentUserValue?.id;
        const time = Math.round(this.mediaService.getCurrentTime() * 1000);
        !!id && this.indicateReadyFor(PlayerComponent.preparedMediaId, time);
      })
    );
  }

  get autoplayBlocked(): boolean {
    return this.autoplayService.blocked.value;
  }

  ngOnDestroy(): void {
    this.sessionService.cancelJoin();
    this.mediaSubscriptions.unsubscribe();
  }

  get isFullscreen(): boolean {
    return document.fullscreenElement != null;
  }

  @ViewChild('videoPlayer') set videoPlayer(videoPlayer: ElementRef) {
    PlayerComponent.videoElement = videoPlayer.nativeElement;
  }

  ngAfterViewInit(): void {
    this.wsService.subscribeToSessionTopic((body) => this.processCommand(body));
    this.sessionService.requestJoin();
  }

  protected override onJoined(): void {
    this.sessionService.acknowledgeJoin();
  }

  getLatencyComponent(): LatencyComponent | undefined {
    return this.latencyComponent;
  }

  isVideoMode() {
    return this.mediaService.isVideoMode();
  }

  fullscreen() {
    if (!this.videoWrapper) {
      console.error('Page not loaded properly!');
      return;
    }
    this.videoWrapper.nativeElement.requestFullscreen();
    document.onmousemove = () => {
      if (!!this.hideCursorTimeout) {
        clearTimeout(this.hideCursorTimeout);
      }
      if (!!this.videoWrapper) {
        this.videoWrapper.nativeElement.style.cursor = 'default';
      }
      this.hideCursorTimeout = setTimeout(() => {
        if (!!this.videoWrapper) {
          this.videoWrapper.nativeElement.style.cursor = 'none';
        }
      }, 1000);
    };
  }

  exitFullscreen() {
    document.onmousemove = () => undefined;
    if (!!this.hideCursorTimeout) {
      clearTimeout(this.hideCursorTimeout);
    }
    if (!!this.videoWrapper) {
      this.videoWrapper.nativeElement.style.cursor = 'default';
    }
    document.exitFullscreen().catch(console.error);
  }

  onVideoClick() {
    if (!!this.singleVideoClickTimeout) {
      // double click
      clearTimeout(this.singleVideoClickTimeout);
      this.singleVideoClickTimeout = null;
      this.isFullscreen ? this.exitFullscreen() : this.fullscreen();
    } else {
      // single click
      this.singleVideoClickTimeout = setTimeout(() => {
        this.publishCommand(this.playerState === 'STOP' ? 'start' : this.playerState === 'PAUSE' ? 'resume' : 'pause');
        this.singleVideoClickTimeout = null;
      }, 250);
    }
  }

  timeSkip() {
    this.jumpOffset(this.settingsService.defaultTimeSkipLength * 1000);
  }
}
