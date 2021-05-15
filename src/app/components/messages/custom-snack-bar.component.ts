import {Component, Inject} from '@angular/core';
import {MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Component({
  selector: 'app-snack-bar-component-custom',
  template: `{{message}}`,
  styles: [`
    :host {
      text-align: center;
      display: block;
      font-size: 16px;
      font-weight: bold;
    }

    ::ng-deep .mat-snack-bar-container.mat-snack-bar-center.http-error-notification {
      background: rgb(255, 47, 47);
    }
  `],
})
export class CustomSnackBarComponent {
  message: string;

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) {message},
    ) {
      // set message at the start. message is always there
      this.message = message;
  }
/*USE THIS TO OPEN DAT SNACKBAR! (DON´T FORGET TO IMPORT)

  testSnack(){
    this.snackBar.openFromComponent(CustomSnackBarComponent,{
      data: {
        theme: "true",
        customCSS:"background-color: red; color:darkslategrey; border:solid black 3px;",
        message: "This could be your ad!"},
        duration:60000
    });
  }
*/
}
