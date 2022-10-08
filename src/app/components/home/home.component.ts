import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  greeting: string;
  welcomeMessages: string[] = [
    //nam at back
    'Welcome {User}',
    'Pleased to meet you {User}',
    'Hello {User}',
    'Well, if it isn´t {User}',
    //name in middle
    'Oh it´s {User}, nice to meet you',
    'Hi {User}, you look dashing today!',
  ];

  constructor(private authenticator: AuthenticationService) {}

  ngOnInit() {
    const username = this.authenticator.currentUserValue.username;
    this.greeting = this.welcomeMessages[
      Math.floor(Math.random() * this.welcomeMessages.length)
    ].replace('{User}', `${username}`);
  }
}
