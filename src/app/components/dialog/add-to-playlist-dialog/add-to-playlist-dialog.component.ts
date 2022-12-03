import { Component, Inject, OnInit } from '@angular/core';
import { GenericDataObject } from 'src/app/models/genericDataObject';
import { HttpHelperService } from '../../../services/http-helper.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServerResultSuccessSnackBarComponent } from '../../messages/server-result-success-snack-bar.component';
import { HttpCodeMessageGenerator } from '../../messages/http-code-message-generator';

@Component({
  selector: 'app-add-to-playlist-dialog',
  templateUrl: './add-to-playlist-dialog.component.html',
  styleUrls: ['./add-to-playlist-dialog.component.scss'],
})
export class AddToPlaylistDialogComponent implements OnInit {
  selectedOptions: GenericDataObject[] = [];
  songIds: number[] = [];

  constructor(
    private httpHelperService: HttpHelperService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<AddToPlaylistDialogComponent>,
    private messageHandler: HttpCodeMessageGenerator,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.songIds = this.data.songIds;
  }

  onChange(): void {
    if (this.songIds.length == 1) {
      this.addSongToPlaylist(this.songIds[0], this.selectedOptions[0].id);
      console.log('one song');
    } else {
      this.addSongsToPlaylist(this.songIds, this.selectedOptions[0].id);
      console.log(`${this.songIds.length} songs`);
    }
  }

  addSongToPlaylist(songId: number, playlistId: number): void {
    this.httpHelperService
      .put(`/api/v1/playlists/${playlistId}/addSongToPlaylist/${songId}`, null)
      .then(() => {
        this.snackBar.openFromComponent(ServerResultSuccessSnackBarComponent, {
          duration: 2000,
        });
        this.dialogRef.close();
      })
      .catch((e) => {
        this.messageHandler.calculateReturnCodeMessage(e.status, {
          e409: 'Duplicate Song! Try for more variety!',
          e404: 'Playlist not found!',
        });
      });
  }

  addSongsToPlaylist(songIds: number[], playlistId: number): void {
    this.httpHelperService
      .putPlain(`/api/v1/playlists/${playlistId}/addSongsToPlaylist/`, songIds)
      .then((result) => {
        this.messageHandler.customMessage(result);
      })
      .catch((e) => {
        this.messageHandler.calculateReturnCodeMessage(e.status, {
          e409: 'All selected songs are already in the playlist!',
          e404: 'Playlist not found!',
        });
      });
  }
}
