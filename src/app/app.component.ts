import {Component, OnInit} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Router} from '@angular/router';
import {SiteOptionsDialogComponent} from './components/dialog/site-options-dialog/site-options-dialog.component';
import {AuthenticationService} from './services/authentication.service';
import {SessionService} from './services/session.service';
import {SettingsService} from './services/settings.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  isDesktopLayout = true;
  inSession: boolean;
  sessionInfo = 'Join a session!';

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private settingsDialog: MatDialog,
    private sessionService: SessionService,
    private settingsService: SettingsService
  ) {
  }

  ngOnInit(): void {
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

  openSettingsDialog(): void {
    const dialogRef = this.settingsDialog.open(SiteOptionsDialogComponent, {
      panelClass: 'options-dialog',
    });
    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
    });
  }

  getCurrentThemeClassName(): string {
    return this.settingsService.currentTheme.className;
  }
}
