import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServerResultSuccessSnackBarComponent } from '../messages/server-result-success-snack-bar.component';
import { ServerResultErrorSnackBarComponent } from '../messages/server-result-error-snack-bar.component';
import { HttpHelperService } from '../../services/http-helper.service';
import { MatDialog } from '@angular/material/dialog';
import { AuthenticationService } from '../../services/authentication.service';
import { GenericDataObject } from '../../models/genericDataObject';

@Component({
  selector: 'app-import',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
})
export class UploadComponent {
  loading = false;
  files: FileList | null = null;
  uploadForm: UntypedFormGroup;

  selectedArtist: GenericDataObject[] = [];
  selectedAlbum: GenericDataObject[] = [];
  selectedGenres: GenericDataObject[] = [];
  selectedTags: GenericDataObject[] = [];
  selectedPlaylists: GenericDataObject[] = [];

  constructor(
    private httpHelperService: HttpHelperService,
    private authenticationService: AuthenticationService,
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    public dialog: MatDialog
  ) {
    this.uploadForm = this.uploadForm = this.formBuilder.group({
      files: [undefined],
    });
  }

  onFilesSelected(): void {
    const inputNode: HTMLInputElement | null = document.querySelector('#file');
    if (inputNode) {
      this.files = inputNode.files;
    }
  }

  upload(): void {
    if (!this.files || this.files.length === 0) {
      return;
    }

    this.loading = true;

    const formData: FormData = new FormData();
    for (let i = 0; i < this.files.length; i++) {
      const file = this.files.item(i);
      if (file) {
        formData.append('files', file, file.name);
      }
    }
    formData.append(
      'data',
      JSON.stringify({
        artistId: this.selectedArtist.map((value) => value.id)[0],
        albumId: this.selectedAlbum.map((value) => value.id)[0],
        playlists: this.selectedPlaylists.map((value) => value.id),
        genres: this.selectedGenres.map((value) => value.id),
        tags: this.selectedTags.map((value) => value.id),
      })
    );

    this.httpHelperService
      .post('/api/v1/songs/upload/', formData)
      .then(() => {
        this.loading = false;
        const inputNode: HTMLInputElement | null = document.querySelector('#file');
        if (inputNode) {
          inputNode.files = null;
        }
        this.files = null;
        this.snackBar.openFromComponent(ServerResultSuccessSnackBarComponent, {
          duration: 2000,
        });
      })
      .catch((error) => {
        this.loading = false;
        this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
          duration: 2000,
        });
        console.error(error);
      });
  }
}
