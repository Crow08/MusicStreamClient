import { MatSnackBar } from '@angular/material/snack-bar';
import { WsService } from './services/ws.service';
import { CustomSnackBarComponent } from './components/messages/custom-snack-bar.component';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthenticationService } from './services/authentication.service';
import { SessionService } from './services/session.service';
import { SettingsService } from './services/settings.service';
import { PlayerEngineService } from './services/player-engine.service';
import { SpotifyService } from './services/spotify.service';
import { SpotifyPlayerService } from './services/spotify-player.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  isDesktopLayout = true;
  inSession = false;
  sessionInfo = '';

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private settingsDialog: MatDialog,
    private sessionService: SessionService,
    private settingsService: SettingsService,
    private wsService: WsService,
    private snackBar: MatSnackBar,
    // the playback of the session lives in this service: it has to exist as long as the app
    private playerEngine: PlayerEngineService,
    private spotifyService: SpotifyService,
    private spotifyPlayer: SpotifyPlayerService
  ) {}

  ngOnInit(): void {
    this.wsService.errors.subscribe((error) =>
      this.snackBar.openFromComponent(CustomSnackBarComponent, {
        data: { message: error.message },
        panelClass: ['http-error-notification'],
        duration: 4000,
      })
    );
    // the Spotify player of a user who connected it once is connected again with every start of the app
    this.authenticationService.currentUserChanges.subscribe((user) => {
      if (user) {
        this.spotifyService.canRestore && this.spotifyPlayer.connect();
      } else {
        this.spotifyPlayer.disconnect();
        this.spotifyService.forgetSession();
      }
    });
    this.isDesktopLayout = window.innerWidth >= 991;
    window.onresize = () => (this.isDesktopLayout = window.innerWidth >= 991);
    this.sessionService.sessionId.subscribe((id) => {
      if (id) {
        this.inSession = true;
        this.sessionInfo = `Session-ID: ${id}`;
      } else {
        this.inSession = false;
      }
    });
  }

  /** The controls of the session are shown on every page but the lobby, which has the full player. */
  get showMiniPlayer(): boolean {
    const url = this.router.url.split('?')[0];
    return this.inSession && !url.endsWith('lobby') && !url.endsWith('login') && !url.endsWith('register');
  }

  logout(): void {
    // stops the playback of the session
    this.sessionService.leaveSession();
    this.authenticationService.logout();
    this.router.navigate(['/login']).catch((reason) => console.error(reason));
  }

  getCurrentThemeClassName(): string {
    return this.settingsService.currentTheme.className;
  }
}
