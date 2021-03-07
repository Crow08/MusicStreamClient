import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {AuthenticationService} from './services/authentication.service';

class Theme {
  className: string;
  displayName: string;
  constructor(className: string, displayName: string) {
    this.className = className;
    this.displayName = displayName;
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  themeClass = 'parrot-theme';
  availableThemes = [
    new Theme('parrot-theme', 'Parrot'),
    new Theme('turtle-theme', 'Turtle'),
    new Theme('shark-theme', 'Shark')
  ];
  currentTheme = this.availableThemes[0];

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {
  }

  selectTheme(theme: Theme): void {
    this.currentTheme = theme;
  }

  logout(): void {
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }
}
