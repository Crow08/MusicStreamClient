import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { PlayerComponent } from '../player.component';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { HttpHelperService } from '../../../services/http-helper.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { MediaService } from '../../../services/media.service';
import { WsService } from '../../../services/ws.service';
import { SessionService } from '../../../services/session.service';
import { SettingsService } from '../../../services/settings.service';
import { LatencyComponent } from '../../latency/latency.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { JoinDialogComponent } from '../join-dialog/join-dialog.component';

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
  private joinDialogRef: MatDialogRef<JoinDialogComponent, boolean> | null = null;

  constructor(
    route: ActivatedRoute,
    httpHelperService: HttpHelperService,
    authenticationService: AuthenticationService,
    mediaService: MediaService,
    wsService: WsService,
    sessionService: SessionService,
    public settingsService: SettingsService,
    dialog: MatDialog
  ) {
    super();
    this.httpHelperService = httpHelperService;
    this.authenticationService = authenticationService;
    this.mediaService = mediaService;
    this.wsService = wsService;
    const routeParams = route.snapshot.paramMap;

    this.displayJoinButton(dialog, sessionService, routeParams);

    this.mediaService.mediaEndedSubject.subscribe(() => {
      this.publishCommand(`end/${PlayerComponent.currentMedia.id}`);
    });
    this.mediaService.mediaCanPlayThrough.subscribe(() => {
      console.log('READY');
      const id = this.authenticationService.currentUserValue?.id;
      const time = Math.round(this.mediaService.getCurrentTime() * 1000);
      !!id && this.indicateReadyFor(PlayerComponent.preparedMediaId, time);
    });
  }

  displayJoinButton(dialog: MatDialog, sessionService: SessionService, routeParams: ParamMap) {
    const sessionId = Number(routeParams.get('sessionId'));
    sessionService.init(sessionId);

    // the dialog only exists to get a user interaction, which the browser requires before media can be played
    if (navigator.userActivation?.hasBeenActive) {
      sessionService.joinSession(sessionId);
      return;
    }
    this.joinDialogRef = dialog.open<JoinDialogComponent, void, boolean>(JoinDialogComponent, { disableClose: true });
    this.joinDialogRef.afterClosed().subscribe((join) => {
      this.joinDialogRef = null;
      if (join) {
        sessionService.joinSession(sessionId);
      }
    });
  }

  ngOnDestroy(): void {
    // leaving the lobby must not leave the dialog open on other pages or join the session
    this.joinDialogRef?.close(false);
  }

  get isFullscreen(): boolean {
    return document.fullscreenElement != null;
  }

  @ViewChild('videoPlayer') set videoPlayer(videoPlayer: ElementRef) {
    PlayerComponent.videoElement = videoPlayer.nativeElement;
  }

  ngAfterViewInit(): void {
    this.wsService.subscribeToSessionTopic((body) => this.processCommand(body));
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
