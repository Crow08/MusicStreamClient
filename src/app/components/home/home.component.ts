import {Component} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomSnackBarComponent } from '../messages/custom-snack-bar.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  constructor(private snackBar: MatSnackBar){}

  testSnack(){
    this.snackBar.openFromComponent(CustomSnackBarComponent,{
      data: {
        theme: "true",
        customCSS:"background-color: red; color:darkslategrey; border:solid black 3px;",
        message: "This could be your ad!"},
        duration:60000
    });
  }
}
