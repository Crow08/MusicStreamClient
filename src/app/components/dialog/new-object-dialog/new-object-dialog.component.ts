import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

export class CreationDialogInputData {
  displayName: string;
  stringProperties: { displayName: string, key: string, value: string }[];
}

@Component({
  selector: 'app-new-artist-dialog',
  templateUrl: './new-object-dialog.component.html',
  styleUrls: ['./new-object-dialog.component.scss']
})
export class NewObjectDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<NewObjectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreationDialogInputData) {
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  getData(): object {
    const returnVal = this.data.stringProperties.reduce((obj, prop) => {
      obj[prop.key] = prop.value;
      return obj;
    }, {});
    console.log(returnVal);
    return returnVal;
  }
}
