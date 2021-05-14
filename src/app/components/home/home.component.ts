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

  testSnack(): void{
    this.snackBar.openFromComponent(CustomSnackBarComponent, {
      panelClass: ['test-style2'],
      data: {
        message: 'This could be your ad!'},
        duration: 60000
    });
  }
}
