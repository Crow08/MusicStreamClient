import {Component, Inject, OnInit} from '@angular/core';
import {GenericDataObject} from 'src/app/models/genericDataObject';
import {HttpHelperService} from '../../../services/http-helper.service';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ServerResultErrorSnackBarComponent} from '../../messages/server-result-error-snack-bar.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ServerResultSuccessSnackBarComponent} from '../../messages/server-result-success-snack-bar.component';

@Component({
  selector: 'app-add-to-playlist-dialog',
  templateUrl: './add-to-playlist-dialog.component.html',
  styleUrls: ['./add-to-playlist-dialog.component.scss']
})
export class AddToPlaylistDialogComponent implements OnInit {

  selectedOptions: GenericDataObject[] = [];

  songId: number;

  constructor(private httpHelperService: HttpHelperService,
              private snackBar: MatSnackBar,
              @Inject(MAT_DIALOG_DATA) public data: any) {
  }

  ngOnInit(): void {
    this.songId = this.data.songId;

  }

  onChange(): void {
    this.addSongToPlaylist(this.songId, this.selectedOptions[0].id);
  }

  addSongToPlaylist(songId: number, playlistId: number): void {
    this.httpHelperService.put(`/playlists/${playlistId}/addSongToPlaylist/${songId}`, null)
      .then(() => {
        this.snackBar.openFromComponent(ServerResultSuccessSnackBarComponent, {
          duration: 2000,
        });
      })
      .catch((e) => {
        console.log(e);
        console.log(e.status);
        this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
          duration: 2000,
        });
      });
  }

  addSongsToPlaylist(songIds: number[], playlistId: number): void {
    this.httpHelperService.put(`/playlists/${playlistId}/addSongsToPlaylist/`, songIds)
      .then(() => {
        this.snackBar.openFromComponent(ServerResultSuccessSnackBarComponent, {
          duration: 2000,
        });
      })
      .catch(() => this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
        duration: 2000,
      }));
  }
}
