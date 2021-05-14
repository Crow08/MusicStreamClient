import {Component, Inject} from '@angular/core';
import {MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Component({
  selector: 'app-snack-bar-component-custom',
  template: `<div [ngClass]="additionalClasses()" class="snackbarWrapper" style="{{customCSS}}">{{message}}</div>`,
  styles: [`
    .snackbarWrapper {
      text-align: center;
      display: block;
      margin-left: -16px;
      margin-right: -16px;
      margin-top: -14px;
      margin-bottom: -16px;
      padding-right: 10px;
      padding-left: 10px;
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
  customCSS: String;
  theme: Boolean;
  message: String;

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) {message, theme, customCSS},
    ) {
      //set message at the start. message is always there
      this.message = message;

      //apply custom css
      if (customCSS !== ""){
        this.customCSS = `${customCSS}`;
      }
      //apply theme background color...or not
      if (theme == "true"){
        this.theme = true;
      }else{
        this.theme = false;
      }
  }

//applies given theme - just one at the moment
additionalClasses(){
  if (this.theme){
    return "theme-snackbar"
  }else{
    return ""
  }

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
