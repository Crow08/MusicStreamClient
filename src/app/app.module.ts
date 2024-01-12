import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { RxStompService, rxStompServiceFactory } from '@stomp/ng2-stompjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SessionBrowserComponent } from './components/sessions/browser/session-browser.component';
import { SessionCreatorComponent } from './components/sessions/session-creator/session-creator.component';
import { LatencyComponent } from './components/latency/latency.component';
import { UploadComponent } from './components/upload/upload.component';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ThemeAwareOverlayContainer } from './ThemeAwareOverlayContainer';
import { ServerResultSuccessSnackBarComponent } from './components/messages/server-result-success-snack-bar.component';
import { ServerResultErrorSnackBarComponent } from './components/messages/server-result-error-snack-bar.component';
import { CustomSnackBarComponent } from './components/messages/custom-snack-bar.component';
import { MaterialModule } from './material.module';
import { NewObjectDialogComponent } from './components/dialog/new-object-dialog/new-object-dialog.component';
import { RatingStarComponent } from './components/rating-star/rating-star.component';
import { ObjectMultiSelectComponent } from './components/util/object-multi-select/object-multi-select.component';
import { ObjectSelectComponent } from './components/util/object-select/object-select.component';
import { DatabaseBrowserComponent } from './components/database/database-browser/database-browser.component';
import { ArtistComponent } from './components/input/artist/artist.component';
import { AlbumComponent } from './components/input/album/album.component';
import { TagComponent } from './components/input/tag/tag.component';
import { GenreComponent } from './components/input/genre/genre.component';
import { PlaylistComponent } from './components/input/playlist/playlist.component';
import { AddObjectButtonComponent } from './components/util/add-object-button/add-object-button.component';
import { AddToPlaylistDialogComponent } from './components/dialog/add-to-playlist-dialog/add-to-playlist-dialog.component';
import { YesNoDialogComponent } from './components/dialog/yes-no-dialog/yes-no-dialog.component';
import { EditSongDialogComponent } from './components/dialog/edit-song-dialog/edit-song-dialog.component';
import { MiniPlayerComponent } from './components/player/mini-player/mini-player.component';
import { FullPlayerComponent } from './components/player/full-player/full-player.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SpotifyDelegateComponent } from './components/player/spotify-delegate/spotify-delegate.component';
import { PlayerTrackComponent } from './components/player/player-track/player-track.component';
import { RegisterComponent } from './components/register/register.component';
import { InviteComponent } from './components/invite/invite.component';
import { JoinDialogComponent } from './components/player/join-dialog/join-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HomeComponent,
    SessionBrowserComponent,
    SessionCreatorComponent,
    LatencyComponent,
    UploadComponent,
    ServerResultSuccessSnackBarComponent,
    ServerResultErrorSnackBarComponent,
    CustomSnackBarComponent,
    NewObjectDialogComponent,
    RatingStarComponent,
    ObjectMultiSelectComponent,
    ObjectSelectComponent,
    DatabaseBrowserComponent,
    ArtistComponent,
    AlbumComponent,
    TagComponent,
    GenreComponent,
    PlaylistComponent,
    AddObjectButtonComponent,
    AddToPlaylistDialogComponent,
    YesNoDialogComponent,
    EditSongDialogComponent,
    MiniPlayerComponent,
    FullPlayerComponent,
    SettingsComponent,
    SpotifyDelegateComponent,
    PlayerTrackComponent,
    RegisterComponent,
    InviteComponent,
    JoinDialogComponent,
  ],
  imports: [
    FormsModule,
    BrowserModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forRoot(
      [
        { path: '', component: HomeComponent, canActivate: [AuthGuard] },
        { path: 'login', component: LoginComponent },
        { path: 'register', component: RegisterComponent },
        {
          path: 'sessions/browse',
          component: SessionBrowserComponent,
          canActivate: [AuthGuard],
        },
        {
          path: 'database/browse',
          component: DatabaseBrowserComponent,
          canActivate: [AuthGuard],
        },
        {
          path: 'upload',
          component: UploadComponent,
          canActivate: [AuthGuard],
        },
        {
          path: 'sessions/create',
          component: SessionCreatorComponent,
          canActivate: [AuthGuard],
        },
        {
          path: 'sessions/:sessionId/lobby',
          component: FullPlayerComponent,
          canActivate: [AuthGuard],
        },
        {
          path: 'settings',
          component: SettingsComponent,
          canActivate: [AuthGuard],
        },
        {
          path: 'spotify/redirect',
          component: SpotifyDelegateComponent,
          canActivate: [AuthGuard],
        },
        { path: '**', redirectTo: '' },
      ],
      { relativeLinkResolution: 'legacy' }
    ),
    BrowserAnimationsModule,
    MaterialModule,
  ],
  providers: [
    {
      provide: OverlayContainer,
      useClass: ThemeAwareOverlayContainer,
    },
    {
      provide: RxStompService,
      useFactory: rxStompServiceFactory,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
