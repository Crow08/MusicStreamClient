import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {AuthenticationService} from '../../services/authentication.service';
import {Playlist} from '../../models/playlist';
import {Genre} from '../../models/genre';
import {plainToClass} from 'class-transformer';
import {AbstractControl, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Artist} from '../../models/artist';
import {MatSnackBar} from '@angular/material/snack-bar';

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

  constructor(private http: HttpClient,
              private authenticationService: AuthenticationService,
              private formBuilder: FormBuilder,
              private snackBar: MatSnackBar) {
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

    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser()};
    this.http.get(`http://${environment.dbServer}/genres/all`, options)
      .subscribe(valueArray => {
        this.genres = [];
        (valueArray as any[]).forEach((rawGenre) => this.genres.push(plainToClass(Genre, rawGenre)));
      });
    this.http.get(`http://${environment.dbServer}/playlists/all`, options)
      .subscribe(valueArray => {
        this.playlists = [];
        (valueArray as any[]).forEach((rawPlaylist) => this.playlists.push(plainToClass(Playlist, rawPlaylist)));
      });
    this.http.get(`http://${environment.dbServer}/artists/all`, options)
      .subscribe(valueArray => {
        this.artists = [];
        (valueArray as any[]).forEach((rawArtist) => this.artists.push(plainToClass(Artist, rawArtist)));
      });
  }

  onFileSelected(): void {
    const inputNode: HTMLInputElement = document.querySelector('#file');
    this.files = inputNode.files;
  }

  upload(): void {
    if (!this.files) {
      return;
    }

    this.loading = true;

    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text'};
    const formData: FormData = new FormData();
    for (let i = 0; i < this.files.length; i++) {
      const file = this.files.item(i);
      formData.append('file', file, file.name);
    }
    formData.append('artistId', this.f.artist.value);
    formData.append('genre', this.f.genre.value);
    formData.append('playlistId', this.f.playlist.value);

    this.http.post(`http://${environment.dbServer}/songs/`, formData, options).subscribe(
      value => {
        this.loading = false;
        const inputNode: HTMLInputElement = document.querySelector('#file');
        inputNode.files = undefined;
        this.files = undefined;
        this.snackBar.openFromComponent(UploadResultComponent, {
          duration: 2000000,
        });
      },
      error => console.error(error)
    );
  }
}

@Component({
  selector: 'app-snack-bar-component-upload-result',
  template: `<span class="result-bar">
    Upload successful!
  </span>`,
  styles: [`
    :host {
      text-align: center;
      display: block;
    }

    .result-bar {
      color: darkgreen;
      font-weight: bold;
    }
  `],
})
export class UploadResultComponent {
}
