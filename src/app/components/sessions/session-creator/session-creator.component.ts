import {Component, OnInit} from '@angular/core';
import {environment} from '../../../../environments/environment';
import {HttpClient} from '@angular/common/http';
import {AuthenticationService} from '../../../services/authentication.service';
import {AbstractControl, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {plainToClass} from 'class-transformer';
import {Playlist} from '../../../models/playlist';
import {Router} from '@angular/router';

@Component({
  selector: 'app-session-creator',
  templateUrl: './session-creator.component.html',
  styleUrls: ['./session-creator.component.scss']
})
export class SessionCreatorComponent implements OnInit {

  sessionForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  playlists: Playlist[] = [];

  constructor(private router: Router,
              private formBuilder: FormBuilder,
              private http: HttpClient,
              private authenticationService: AuthenticationService) {
  }

  // convenience getter for easy access to form fields
  get f(): { [key: string]: AbstractControl } {
    return this.sessionForm.controls;
  }

  ngOnInit(): void {
    this.sessionForm = this.formBuilder.group({
      name: ['', Validators.required],
      playlist: ['', Validators.required]
    });


    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser()};
    this.http.get(`http://${environment.dbServer}/playlists/all`, options)
      .subscribe(valueArray => {
        const noPlaylist = new Playlist();
        noPlaylist.name = 'none';
        noPlaylist.id = -1;
        this.playlists = [noPlaylist];
        (valueArray as any[]).forEach((rawSession) => this.playlists.push(plainToClass(Playlist, rawSession)));
      });
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    // stop here if form is invalid
    if (this.sessionForm.invalid) {
      return;
    }

    this.loading = true;
    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text'};

    this.http.put(`http://${environment.dbServer}/sessions/`, this.f.name.value, options)
      .subscribe(sessionId => {
        this.addSongs(Number(sessionId));
      });
  }

  private addSongs(sessionId: number): void {
    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text'};

    this.http.put(`http://${environment.dbServer}/sessions/${sessionId}/addpl`, this.f.playlist.value, options)
      .subscribe(response => {
        this.joinSession(sessionId);
      });

  }

  private joinSession(sessionId: number): void {
    this.router.navigateByUrl(`/sessions/${sessionId}/lobby`).catch(console.error);
  }
}
