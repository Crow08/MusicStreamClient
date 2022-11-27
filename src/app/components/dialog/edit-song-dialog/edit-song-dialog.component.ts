import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GenericDataObject } from 'src/app/models/genericDataObject';
import { HttpHelperService } from 'src/app/services/http-helper.service';
import { CustomSnackBarComponent } from '../../messages/custom-snack-bar.component';
import { HttpCodeMessageGenerator } from '../../messages/http-code-message-generator';
import { Song } from '../../../models/song';

@Component({
  selector: 'app-edit-song-dialog',
  templateUrl: './edit-song-dialog.component.html',
  styleUrls: ['./edit-song-dialog.component.scss'],
})
export class EditSongDialogComponent {
  currentSong: Song;
  selectedTitle: string;
  selectedAlbum;
  selectedArtist;
  selectedGenres;
  selectedTags;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { song: Song },
    private httpHelperService: HttpHelperService,
    private snackBar: MatSnackBar,
    private messageHandler: HttpCodeMessageGenerator,
    private dialogRef: MatDialogRef<EditSongDialogComponent>
  ) {
    this.currentSong = data.song;

    this.selectedTitle = this.currentSong.title;
    this.selectedAlbum = [
      new GenericDataObject(
        this.currentSong.album.id,
        this.currentSong.album.name
      ),
    ];
    this.selectedArtist = [
      new GenericDataObject(
        this.currentSong.artist.id,
        this.currentSong.artist.name
      ),
    ];
    this.selectedGenres = this.currentSong.genres.map(
      (value) => new GenericDataObject(value.id, value.name)
    );
    this.selectedTags = this.currentSong.tags.map(
      (value) => new GenericDataObject(value.id, value.name)
    );
  }

  saveSong(): void {
    const alteredSong = new Song();
    alteredSong.id = this.currentSong.id;
    alteredSong.title = this.selectedTitle;
    alteredSong.album = this.selectedAlbum[0];
    alteredSong.artist = this.selectedArtist[0];
    alteredSong.genres = this.selectedGenres;
    alteredSong.tags = this.selectedTags;
    this.httpHelperService
      .put(`/songs/editSong`, alteredSong)
      .then(() => {
        this.snackBar.openFromComponent(CustomSnackBarComponent, {
          data: {
            message: 'successMessage',
          },
          duration: 2000,
        });
        this.dialogRef.close(true);
      })
      .catch((e) => {
        this.messageHandler.calculateReturnCodeMessage(e.status, {
          e404: 'Song not found! How did you do that?',
        });
      });
  }
}
