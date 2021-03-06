import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {HttpClientModule} from '@angular/common/http';
import {RouterModule} from '@angular/router';

import {AuthGuard} from './auth.guard';
import {AppComponent} from './app.component';
import {LoginComponent} from './components/login/login.component';
import {HomeComponent} from './components/home/home.component';
import {LoaderComponent} from './components/loader/loader.component';
import {InjectableRxStompConfig, RxStompService, rxStompServiceFactory} from '@stomp/ng2-stompjs';
import {myRxStompConfig} from './my-rx-stomp.config';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCardModule} from '@angular/material/card';
import {MatListModule} from '@angular/material/list';
import {SessionBrowserComponent} from './components/sessions/browser/session-browser.component';
import {SessionCreatorComponent} from './components/sessions/session-creator/session-creator.component';
import {MatOptionModule} from '@angular/material/core';
import {MatSelectModule} from '@angular/material/select';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {LatencyComponent} from './components/latency/latency.component';
import {PlayerComponent} from './components/player/player.component';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatButtonToggleModule} from '@angular/material/button-toggle';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HomeComponent,
    LoaderComponent,
    PlayerComponent,
    SessionBrowserComponent,
    SessionCreatorComponent,
    LatencyComponent,
    PlayerComponent
  ],
  imports: [
    FormsModule,
    BrowserModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forRoot([{path: '', component: HomeComponent, canActivate: [AuthGuard]},
      {path: 'login', component: LoginComponent},
      {path: 'sessions/browse', component: SessionBrowserComponent, canActivate: [AuthGuard]},
      {path: 'sessions/create', component: SessionCreatorComponent, canActivate: [AuthGuard]},
      {path: 'sessions/:sessionId/lobby', component: PlayerComponent, canActivate: [AuthGuard]},
      {path: '**', redirectTo: ''}], {relativeLinkResolution: 'legacy'}),
    BrowserAnimationsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatListModule,
    MatOptionModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatProgressBarModule,
    MatButtonToggleModule
  ],
  providers: [{
    provide: InjectableRxStompConfig,
    useValue: myRxStompConfig,
  },
    {
      provide: RxStompService,
      useFactory: rxStompServiceFactory,
      deps: [InjectableRxStompConfig],
    }],
  bootstrap: [AppComponent]
})
export class AppModule {
}
