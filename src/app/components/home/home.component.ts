import { Component } from '@angular/core';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  greeting: string;
  welcomeMessages: string[] = [
    'Welcome {User}',
    'Pleased to meet you {User}',
    'Hello {User}',
    'Well, if it isn´t {User}',
    'Oh it´s {User}, nice to meet you',
    'Hi {User}, you look dashing today!',
  ];

  constructor(private authenticator: AuthenticationService) {
    const username = this.authenticator.currentUserValue?.username ?? 'User';
    this.greeting = this.welcomeMessages[Math.floor(Math.random() * this.welcomeMessages.length)].replace(
      '{User}',
      `${username}`
    );
  }
}
