import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  CreationDialogInputData,
  NewObjectDialogComponent,
} from '../../dialog/new-object-dialog/new-object-dialog.component';
import { ServerResultSuccessSnackBarComponent } from '../../messages/server-result-success-snack-bar.component';
import { ServerResultErrorSnackBarComponent } from '../../messages/server-result-error-snack-bar.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HttpHelperService } from '../../../services/http-helper.service';

export class AddObjectInputData extends CreationDialogInputData {
  postPath: string;

  constructor(
    displayName: string,
    stringProperties: { displayName: string; key: string; value: string }[],
    postPath: string
  ) {
    super(displayName, stringProperties);
    this.postPath = postPath;
  }
}

@Component({
  selector: 'app-add-object-button',
  templateUrl: './add-object-button.component.html',
  styleUrls: ['./add-object-button.component.scss'],
})
export class AddObjectButtonComponent {
  @Output() objectAdded = new EventEmitter<any>();
  @Input() private objectInputData: AddObjectInputData;

  constructor(
    private httpHelperService: HttpHelperService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog
  ) {}

  addObject(): void {
    this.createNewObjectDialog();
  }

  private createNewObjectDialog(): void {
    const dialogRef = this.dialog.open(NewObjectDialogComponent, {
      width: '250px',
      data: this.objectInputData,
    });
    dialogRef.afterClosed().subscribe((result) => this.onDialogClose(result));
  }

  private onDialogClose(result: any): void {
    if (!!result) {
      this.httpHelperService
        .post(this.objectInputData.postPath, result.name)
        .then(() => {
          this.snackBar.openFromComponent(
            ServerResultSuccessSnackBarComponent,
            {
              duration: 2000,
            }
          );
          this.objectAdded.emit(result);
        })
        .catch(() =>
          this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
            duration: 2000,
          })
        );
    }
  }
}
