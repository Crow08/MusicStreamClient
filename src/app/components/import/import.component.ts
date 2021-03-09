import {Component, OnInit} from '@angular/core';
import {Playlist} from '../../models/playlist';
import {Genre} from '../../models/genre';
import {AbstractControl, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Artist} from '../../models/artist';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ServerResultSuccessSnackBarComponent} from '../messages/server-result-success-snack-bar.component';
import {ServerResultErrorSnackBarComponent} from '../messages/server-result-error-snack-bar.component';
import {HttpHelperService} from '../../services/http-helper.service';
import {MatDialog} from '@angular/material/dialog';
import {CreationDialogInputData, NewObjectDialogComponent} from '../dialog/new-object-dialog/new-object-dialog.component';
import {AuthenticationService} from '../../services/authentication.service';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {
  loading = false;
  files: FileList;

  playlists: Playlist[] = [];
  genres: Genre[] = [];
  uploadForm: FormGroup;
  artists: Artist[] = [];

  constructor(private httpHelperService: HttpHelperService,
              private authenticationService: AuthenticationService,
              private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              public dialog: MatDialog) {
  }

  // convenience getter for easy access to form fields
  get f(): { [key: string]: AbstractControl } {
    return this.uploadForm.controls;
  }

  ngOnInit(): void {
    this.uploadForm = this.formBuilder.group({
      artist: [undefined],
      genre: [undefined],
      playlist: [undefined],
      files: [undefined, Validators.required]
    });

    this.getGenres();

    this.getPlaylists();

    this.getArtists();
  }

  onFileSelected(): void {
    const inputNode: HTMLInputElement = document.querySelector('#file');
    this.files = inputNode.files;
  }

  upload(): void {
    if (!this.files || this.files.length === 0) {
      return;
    }

    this.loading = true;

    const formData: FormData = new FormData();
    for (let i = 0; i < this.files.length; i++) {
      const file = this.files.item(i);
      formData.append('file', file, file.name);
    }
    formData.append('artistId', this.f.artist.value);
    formData.append('genre', this.f.genre.value);
    formData.append('playlistId', this.f.playlist.value);

    this.httpHelperService.post('/songs/', formData)
      .then(() => {
        this.loading = false;
        const inputNode: HTMLInputElement = document.querySelector('#file');
        inputNode.files = undefined;
        this.files = undefined;
        this.snackBar.openFromComponent(ServerResultSuccessSnackBarComponent, {
          duration: 2000,
        });
      })
      .catch(error => {
        this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
          duration: 2000,
        });
        console.error(error);
      });
  }

  addArtist(): void {
    this.createNowObjectDialog({
      displayName: 'Artist',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, value => {
      this.httpHelperService.post('/artists/', value.name)
        .then(() => this.getArtists())
        .catch(console.error);
    });
  }

  addGenre(): void {
    this.createNowObjectDialog({
      displayName: 'Genre',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, value => {
      this.httpHelperService.post('/genres/', value.name)
        .then(() => this.getGenres())
        .catch(console.error);
    });
  }

  addPlaylist(): void {
    this.createNowObjectDialog({
      displayName: 'Playlist',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, value => {
      value.author_id = this.authenticationService.currentUserValue.id;
      this.httpHelperService.post('/playlists/', value)
        .then(() => this.getPlaylists())
        .catch(console.error);
    });
  }

  private getArtists(): void {
    this.httpHelperService.getArray('/artists/all', Artist)
      .then(value => this.artists = value)
      .catch(console.error);
  }

  private getPlaylists(): void {
    this.httpHelperService.getArray('/playlists/all', Playlist)
      .then(value => this.playlists = value)
      .catch(console.error);
  }

  private getGenres(): void {
    this.httpHelperService.getArray('/genres/all', Genre)
      .then(value => this.genres = value)
      .catch(console.error);
  }

  private createNowObjectDialog(data: CreationDialogInputData, dialogResultCB: (value: any) => void): void {
    const dialogRef = this.dialog.open(NewObjectDialogComponent, {
      width: '250px',
      data
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!!result) {
        dialogResultCB(result);
      }
    });
  }
}

