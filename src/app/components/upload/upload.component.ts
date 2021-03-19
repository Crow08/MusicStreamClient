import {Component, OnInit} from '@angular/core';
import {Playlist} from '../../models/playlist';
import {Genre} from '../../models/genre';
import {FormBuilder, FormGroup} from '@angular/forms';
import {Artist} from '../../models/artist';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ServerResultSuccessSnackBarComponent} from '../messages/server-result-success-snack-bar.component';
import {ServerResultErrorSnackBarComponent} from '../messages/server-result-error-snack-bar.component';
import {HttpHelperService} from '../../services/http-helper.service';
import {MatDialog} from '@angular/material/dialog';
import {CreationDialogInputData, NewObjectDialogComponent} from '../dialog/new-object-dialog/new-object-dialog.component';
import {AuthenticationService} from '../../services/authentication.service';
import {Album} from '../../models/album';
import {Tag} from '../../models/tag';
import {ClassConstructor} from 'class-transformer/types/interfaces';
import {ObjectMultiSelectInputData, SelectObject} from '../util/object-select/object-select.component';

@Component({
  selector: 'app-import',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit {
  loading = false;
  files: FileList;

  uploadForm: FormGroup;

  artistSelectData: ObjectMultiSelectInputData;
  albumSelectData: ObjectMultiSelectInputData;
  tagSelectData: ObjectMultiSelectInputData;
  genreSelectData: ObjectMultiSelectInputData;
  playlistSelectData: ObjectMultiSelectInputData;

  selectedArtist: SelectObject[] = [];
  selectedAlbum: SelectObject[] = [];
  selectedGenres: SelectObject[] = [];
  selectedTags: SelectObject[] = [];
  selectedPlaylists: SelectObject[] = [];


  constructor(private httpHelperService: HttpHelperService,
              private authenticationService: AuthenticationService,
              private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              public dialog: MatDialog) {
  }

  ngOnInit(): void {
    this.uploadForm = this.formBuilder.group({
      files: [undefined]
    });

    this.getArtists();
    this.getAlbum();
    this.getPlaylists();
    this.getGenres();
    this.getTags();
  }

  onFilesSelected(): void {
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
      formData.append('files', file, file.name);
    }
    formData.append('data', JSON.stringify({
      artistId: this.selectedArtist.map(value => value.id)[0],
      albumId: this.selectedAlbum.map(value => value.id)[0],
      playlists: this.selectedPlaylists.map(value => value.id),
      genres: this.selectedGenres.map(value => value.id),
      tags: this.selectedTags.map(value => value.id)
    }));

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
        this.loading = false;
        this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
          duration: 2000,
        });
        console.error(error);
      });
  }

  addArtist(): void {
    this.createNewObjectDialog({
      displayName: 'Artist',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, '/artists/', () => this.getArtists());
  }

  addAlbum(): void {
    this.createNewObjectDialog({
      displayName: 'Album',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, '/albums/', () => this.getAlbum());
  }

  addGenre(): void {
    this.createNewObjectDialog({
      displayName: 'Genre',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, '/genres/', () => this.getGenres());
  }

  addPlaylist(): void {
    this.createNewObjectDialog({
      displayName: 'Playlist',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, '/playlists/', () => this.getPlaylists());
  }

  addTag(): void {
    this.createNewObjectDialog({
      displayName: 'Tag',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, '/tags/', () => this.getTags());
  }

  private getArtists(): void {
    this.getDataForSelect('/artists/all', Artist, (value => this.artistSelectData = value));
  }

  private getAlbum(): void {
    this.getDataForSelect('/albums/all', Album, (value => this.albumSelectData = value));
  }

  private getPlaylists(): void {
    this.getDataForSelect('/playlists/all', Playlist, (value => this.playlistSelectData = value));
  }

  private getGenres(): void {
    this.getDataForSelect('/genres/all', Genre, (value => this.genreSelectData = value));
  }

  private getTags(): void {
    this.getDataForSelect('/tags/all', Tag, (value => this.tagSelectData = value));
  }

  private getDataForSelect(path: string, clazz: ClassConstructor<any>, setValueCB: (value: ObjectMultiSelectInputData) => void):
    void {
    this.httpHelperService.getArray(path, clazz)
      .then(value =>
        setValueCB(new ObjectMultiSelectInputData(clazz.name, value.map(object => new SelectObject(object.id, object.name))))
      )
      .catch(() => this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
        duration: 2000,
      }));
  }

  private createNewObjectDialog(data: CreationDialogInputData, postPath: string, fetchCallback: () => void): void {
    const dialogRef = this.dialog.open(NewObjectDialogComponent, {
      width: '250px',
      data
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!!result) {
        this.httpHelperService.post(postPath, result.name)
          .then(() => {
            this.snackBar.openFromComponent(ServerResultSuccessSnackBarComponent, {
              duration: 2000,
            });
            fetchCallback();
          })
          .catch(() => this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
            duration: 2000,
          }));
      }
    });
  }
}
