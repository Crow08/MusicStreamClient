import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Component({
  selector: 'app-snack-bar-component-custom',
  template: `{{ message }}`,
  styles: [
    `
      :host {
        text-align: center;
        display: block;
        font-size: 16px;
        font-weight: bold;
      }

      ::ng-deep
        .mat-snack-bar-container.mat-snack-bar-center.http-error-notification {
        background: rgb(255, 47, 47);
      }
    `,
  ],
})
export class CustomSnackBarComponent {
  message: string;
  successMessages: string[] = [
    //positive
    'Yay, it worked!',
    'Wow, good job!',
    'It worked, be proud!',
    'You made the world a better place',
    'You made the right choice',
    'You rock!',
    'Great success!',
    'Mission accomplished!',
    //ironic
    'You did it, but at what cost?',
    'So you went with that one, huh?',
    'Are you sure about that?',
    'Well, if you say so...',
    'Success! Wait what?',
    'Guess that worked...',
  ];
  deleteMessages: string[] = [
    //evil
    'Muhahahaha!',
    'Punish the weak!',
    'Burn in hell!',
    'Yes! Yes! Yeeees!',
    "Finally someone's cleaning up that mess",
    //sad
    'Damn, I liked that one',
    'What a waste',
    'Noooooooooooo!',
    'You will regret that!',
    'You monster!',
  ];

  constructor(@Inject(MAT_SNACK_BAR_DATA) { message }) {
    // set message at the start. message is always there
    switch (message) {
      case 'successMessage':
        this.message =
          this.successMessages[
            Math.floor(Math.random() * this.successMessages.length)
          ];
        break;
      case 'deleteMessage':
        this.message =
          this.deleteMessages[
            Math.floor(Math.random() * this.deleteMessages.length)
          ];
        break;
      default:
        this.message = message;
        break;
    }
  }
}
