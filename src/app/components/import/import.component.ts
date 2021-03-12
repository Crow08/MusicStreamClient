import {Component, OnInit} from '@angular/core';
import {Playlist} from '../../models/playlist';
import {Genre} from '../../models/genre';
import {AbstractControl, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
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
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {ClassConstructor} from 'class-transformer/types/interfaces';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {
  loading = false;
  files: FileList;

  uploadForm: FormGroup;
  playlists: Playlist[] = [];
  genres: Genre[] = [];
  artists: Artist[] = [];
  albums: Album[] = [];
  tags: Tag[] = [];

  filteredPlaylists: Observable<Playlist[]>;
  filteredGenres: Observable<Genre[]>;
  filteredArtists: Observable<Artist[]>;
  filteredAlbums: Observable<Album[]>;
  filteredTags: Observable<Tag[]>;

  artistsControl = new FormControl();
  albumsControl = new FormControl();
  playlistsControl = new FormControl();
  genresControl = new FormControl();
  tagsControl = new FormControl();

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
      album: [undefined],
      playlist: [undefined],
      genre: [undefined],
      tag: [undefined],
      files: [undefined, Validators.required]
    });

    this.getArtists();
    this.getAlbum();
    this.getPlaylists();
    this.getGenres();
    this.getTags();

    this.filteredArtists = this.setUpFilter(this.artistsControl, () => this.artists);
    this.filteredAlbums = this.setUpFilter(this.albumsControl, () => this.albums);
    this.filteredPlaylists = this.setUpFilter(this.playlistsControl, () => this.playlists);
    this.filteredGenres = this.setUpFilter(this.genresControl, () => this.genres);
    this.filteredTags = this.setUpFilter(this.tagsControl, () => this.tags);
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
      artistId: this.f.artist.value,
      albumId: this.f.album.value,
      playlistId: this.f.playlist.value,
      genres: [this.f.genre.value],
      tags: [this.f.tag.value]
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
    }, '/artists/');
  }

  addGenre(): void {
    this.createNewObjectDialog({
      displayName: 'Genre',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, '/genres/');
  }

  addPlaylist(): void {
    this.createNewObjectDialog({
      displayName: 'Playlist',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, '/playlists/');
  }

  addAlbum(): void {
    this.createNewObjectDialog({
      displayName: 'Album',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, '/albums/');
  }

  addTag(): void {
    this.createNewObjectDialog({
      displayName: 'Tag',
      stringProperties: [{displayName: 'Name', key: 'name', value: ''}]
    }, '/tags/');
  }

  private getArtists(): void {
    this.getNewObjectData('/artists/all', Artist, this.artistsControl, (value => this.artists = value));
  }

  private getAlbum(): void {
    this.getNewObjectData('/albums/all', Album, this.albumsControl, (value => this.albums = value));
  }

  private getPlaylists(): void {
    this.getNewObjectData('/playlists/all', Playlist, this.playlistsControl, (value => this.playlists = value));
  }

  private getGenres(): void {
    this.getNewObjectData('/genres/all', Genre, this.genresControl, (value => this.genres = value));
  }

  private getTags(): void {
    this.getNewObjectData('/tags/all', Tag, this.tagsControl, (value => this.tags = value));
  }

  private getNewObjectData(path: string, clazz: ClassConstructor<any>, control: FormControl, setValueCB: (value: any[]) => void):
    void {
    this.httpHelperService.getArray(path, clazz)
      .then(value => {
        setValueCB(value);
        control.reset();
      })
      .catch(() => this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
        duration: 2000,
      }));
  }

  private createNewObjectDialog(data: CreationDialogInputData, postPath: string): void {
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
            this.getArtists();
          })
          .catch(() => this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
            duration: 2000,
          }));
      }
    });
  }

  private setUpFilter(formControl: FormControl, getValuesCB: () => any[]): Observable<any> {
    return formControl.valueChanges.pipe(
      startWith(''),
      map(filter => this.objectFilter(filter, getValuesCB()))
    );
  }

  private objectFilter(filter: string, array: any[]): any[] {
    if (!filter) {
      return array;
    }
    return array.filter(option => {
      return option.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0
        || option.id.toString().indexOf(filter.toLowerCase()) >= 0;
    });
  }
}
