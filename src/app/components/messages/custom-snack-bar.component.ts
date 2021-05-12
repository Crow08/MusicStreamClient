import {Component, Inject} from '@angular/core';
import {MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Component({
  selector: 'app-snack-bar-component-custom',
  template: `<div class="snackBarWrapper">{{message}}</div>`,
  styles: [`
    .snackBarWrapper {
      text-align: center;
      display: block;
      background-color: darkgreen;
      margin-left: -16px;
      margin-right: -16px;
      margin-top: -14px;
      margin-bottom: -16px;
      height: 48px;
      border-radius: 3px;
      vertical-align:middle;
      line-height: 48px;
      font-size:16px;
      font-weight: bold;
    }
  `],
})
export class CustomSnackBarComponent {
  message: String;
  fontSize: String;
  background: String;
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) {message},
    @Inject(MAT_SNACK_BAR_DATA) {background},
    ) {
      this.message = message;
      this.background = background;
    console.log(message);
    console.log(background);
  }

/*USE THIS TO OPEN DAT SNACKBAR! (DON´T FORGET TO IMPORT)

  testSnack(){
    this.snackBar.openFromComponent(CustomPositiveSnackBarComponent,{
      data: {
        background: "red",
        message: "This could be your ad!"},
        duration:60000
    });
  }
*/
}
