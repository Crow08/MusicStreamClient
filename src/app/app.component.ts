import {Component, ChangeDetectorRef, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {AuthenticationService} from './services/authentication.service';
import {User} from './models/user';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  currentUser: User;
  themeClass: string;
  
  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.authenticationService.currentUser.subscribe(x => this.currentUser = x);
  }

  detectTheme(theme: string): void {
    this.themeClass = theme;
    //this.changeDetectorRef.detectChanges();
  }
  
  logout(): void {
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }
}
