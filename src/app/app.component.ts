import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {AuthenticationService} from './services/authentication.service';
import {User} from './models/user';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  currentUser: User;
  themeClass: string = 'parrot-theme';
  
  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
  ) {
    this.authenticationService.currentUser.subscribe(x => this.currentUser = x);
  }
  selectTheme(theme: string): void {
    this.themeClass = theme;
  }
  
  logout(): void {
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }
}
