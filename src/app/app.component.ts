import {Component, OnInit} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {Router} from '@angular/router';
import { SiteOptionsDialogComponent } from './components/dialog/site-options-dialog/site-options-dialog.component';
import {AuthenticationService} from './services/authentication.service';
import { SessionService } from './services/session.service';

class Theme {
  className: string;
  displayName: string;

  constructor(
    className: string,
     displayName: string
     ) {
    this.className = className;
    this.displayName = displayName;
  }
}

export const availableThemes = [
  new Theme('parrot-theme', 'Parrot'),
  new Theme('turtle-theme', 'Turtle'),
  new Theme('shark-theme', 'Shark')
];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  themeClass = 'parrot-theme';
  availableThemes = availableThemes;
  currentTheme = availableThemes[0];

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private settingsDialog: MatDialog,
    private sessionService: SessionService
  ) {
  }

  isDesktopLayout = true;
  inSession: Boolean;
  sessionInfo = "Join a session!";

  ngOnInit(): void {
    this.isDesktopLayout = window.innerWidth >= 991;
    window.onresize = () => this.isDesktopLayout = window.innerWidth >= 991;
    this.sessionService.sessionId.subscribe((id)=> {
      if (id){
        this.inSession = true;
        this.sessionInfo = `Session-ID: ${id}`;
      }else{
        this.inSession = false;
      }
    });
  }

  selectTheme(theme: Theme): void {
    this.currentTheme = theme;
  }

  logout(): void {
    this.authenticationService.logout();
    this.router.navigate(['/login']).catch(reason => console.error(reason));
  }

  openSettingsDialog(): void {
    const dialogRef = this.settingsDialog.open(SiteOptionsDialogComponent, {
      panelClass: 'options-dialog'
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log(`Dialog result: ${result}`);
    });
  }
}
