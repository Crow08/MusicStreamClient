import { Component } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Playlist } from '../../../models/playlist';
import { Router } from '@angular/router';
import { HttpHelperService } from '../../../services/http-helper.service';
import { SessionService } from '../../../services/session.service';

@Component({
  selector: 'app-session-creator',
  templateUrl: './session-creator.component.html',
  styleUrls: ['./session-creator.component.scss'],
})
export class SessionCreatorComponent {
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
    this.sessionForm = this.formBuilder.group({
      name: ['', Validators.required],
      playlist: ['', Validators.required],
    });

    this.httpHelperService
      .getArray('/api/v1/playlists/all', Playlist)
      .then((value) => (this.playlists = value))
      .catch(console.error);
  }

  // convenience getter for easy access to form fields
  get getField(): { [key: string]: AbstractControl } {
    return this.sessionForm.controls;
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
      .post('/api/v1/sessions/', this.getField['name'].value)
      .then((sessionId) => this.addSongs(Number(sessionId)))
      .catch(console.error);
  }

  private addSongs(sessionId: number): void {
    this.httpHelperService
      .put(`/api/v1/sessions/${sessionId}/addpl`, this.getField['playlist'].value)
      .then(() => this.sessionService.joinSession(sessionId))
      .catch(console.error);
  }
}
