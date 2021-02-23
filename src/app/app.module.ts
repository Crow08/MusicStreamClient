import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AuthGuard } from './auth.guard';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { LoaderComponent } from './components/loader/loader.component';
import {InjectableRxStompConfig, RxStompService, rxStompServiceFactory} from '@stomp/ng2-stompjs';
import {myRxStompConfig} from './my-rx-stomp.config';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HomeComponent,
    LoaderComponent
  ],
  imports: [
    FormsModule,
    BrowserModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forRoot([{ path: '', component: HomeComponent, canActivate: [AuthGuard] },
      { path: 'login', component: LoginComponent },
      { path: '**', redirectTo: '' }], { relativeLinkResolution: 'legacy' })
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
