import {Component, OnInit} from '@angular/core';
import {AbstractControl, UntypedFormBuilder, UntypedFormGroup, Validators,} from '@angular/forms';
import {Playlist} from '../../../models/playlist';
import {Router} from '@angular/router';
import {HttpHelperService} from '../../../services/http-helper.service';
import {SessionService} from '../../../services/session.service';

@Component({
  selector: 'app-session-creator',
  templateUrl: './session-creator.component.html',
  styleUrls: ['./session-creator.component.scss'],
})
export class SessionCreatorComponent implements OnInit {
  sessionForm: UntypedFormGroup;
  loading = false;
  submitted = false;
  error = '';

  playlists: Playlist[] = [];

  constructor(
    private router: Router,
    private formBuilder: UntypedFormBuilder,
    private httpHelperService: HttpHelperService,
    private sessionService: SessionService
  ) {
  }

  // convenience getter for easy access to form fields
  get f(): { [key: string]: AbstractControl } {
    return this.sessionForm.controls;
  }

  ngOnInit(): void {
    this.sessionForm = this.formBuilder.group({
      name: ['', Validators.required],
      playlist: ['', Validators.required],
    });

    this.httpHelperService
      .getArray('/playlists/all', Playlist)
      .then((value) => (this.playlists = value))
      .catch(console.error);
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    // stop here if form is invalid
    if (this.sessionForm.invalid) {
      return;
    }

    this.loading = true;

    this.httpHelperService
      .post('/sessions/', this.f.name.value)
      .then((sessionId) => this.addSongs(Number(sessionId)))
      .catch(console.error);
  }

  private addSongs(sessionId: number): void {
    this.httpHelperService
      .put(`/sessions/${sessionId}/addpl`, this.f.playlist.value)
      .then(() => this.sessionService.joinSession(sessionId))
      .catch(console.error);
  }
}
