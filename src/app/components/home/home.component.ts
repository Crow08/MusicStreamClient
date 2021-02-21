import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {AuthenticationService} from '../../services/authentication.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit {
  $player: HTMLAudioElement;
  songId: string;



  @ViewChild('audioPlayer') set playerRef(ref: ElementRef<HTMLAudioElement>) {
    this.$player = ref.nativeElement;
  }

  constructor(private http: HttpClient, private authenticationService: AuthenticationService) {
  }

  ngAfterViewInit(): void {
    this.$player.volume = 0.2;
  }

  browseSessions(): void {
    const options =  {headers: this.authenticationService.getAuthHeaderForCurrentUser()};
    this.http.get(`http://${environment.dbServer}/sessions/all`, options)
      .subscribe(value => console.log(value));
  }

  joinSession(): void {

  }

  createSession(): void {
    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text' };
    this.http.put(`http://${environment.dbServer}/sessions/`, 'TEST SESSION', options)
      .subscribe(value => console.log(value));
  }

  browseSongs(): void {
    const options =  {headers: this.authenticationService.getAuthHeaderForCurrentUser()};
    this.http.get(`http://${environment.dbServer}/songs/all`, options)
      .subscribe(value => console.log(value));
  }

  loadSong(): void {
    const username = this.authenticationService.currentUserValue.username;
    const password = this.authenticationService.currentUserValue.password;

    this.$player.src = `http://${username}:${password}@${environment.dbServer}/songs/${this.songId}/data`;
    this.$player.load();
    this.$player.play();
    console.log(`SongId: ${this.songId}`)
  }
}
