import { MatSnackBar } from '@angular/material/snack-bar';
import { WsService } from './services/ws.service';
import { CustomSnackBarComponent } from './components/messages/custom-snack-bar.component';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthenticationService } from './services/authentication.service';
import { SessionService } from './services/session.service';
import { SettingsService } from './services/settings.service';

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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.wsService.errors.subscribe((error) =>
      this.snackBar.openFromComponent(CustomSnackBarComponent, {
        data: { message: error.message },
        panelClass: ['http-error-notification'],
        duration: 4000,
      })
    );
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

  logout(): void {
    this.authenticationService.logout();
    this.router.navigate(['/login']).catch((reason) => console.error(reason));
  }

  getCurrentThemeClassName(): string {
    return this.settingsService.currentTheme.className;
  }
}
