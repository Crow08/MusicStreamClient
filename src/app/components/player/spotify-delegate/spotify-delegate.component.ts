import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SpotifyService } from '../../../services/spotify.service';

@Component({
  selector: 'app-spotify-delegate',
  templateUrl: './spotify-delegate.component.html',
  styleUrls: ['./spotify-delegate.component.scss'],
})
export class SpotifyDelegateComponent implements AfterViewInit {
  @ViewChild('playerContainer')
  playerContainer: ElementRef | undefined;
  private spotifyPlayerLoaded: boolean = false;
  static info: string = 'Not logged in.';

  constructor(private route: ActivatedRoute, private router: Router, private spotifyService: SpotifyService) {
    route.queryParams.subscribe((urlQueryParams) => {
      if (router.url.startsWith(spotifyService.redirectPath) && !!urlQueryParams?.['code']) {
        spotifyService
          .exchangeAuthCodeForToken(urlQueryParams['code'])
          .then(() => (SpotifyDelegateComponent.info = 'Logged in.'))
          .catch(() => (SpotifyDelegateComponent.info = 'Failed to log in.'));
        router.navigateByUrl('/').catch(console.error);
      }
    });
  }

  get info(): string {
    return SpotifyDelegateComponent.info;
  }

  ngAfterViewInit(): void {
    this.initDelegatePlayer();
    window['onSpotifyWebPlaybackSDKReady'] = () => {
      this.spotifyPlayerLoaded = true;
    };
  }

  getAuthUrl() {
    return this.spotifyService.getAuthUrl();
  }

  createPlayer() {
    this.spotifyService.createPlayer().then((value) => (SpotifyDelegateComponent.info = value));
  }

  testPlay() {
    this.spotifyService.testPlay();
  }

  private initDelegatePlayer() {
    const scriptTag = document.createElement('script');
    scriptTag.src = 'https://sdk.scdn.co/spotify-player.js';
    scriptTag.type = 'text/javascript';
    scriptTag.async = false;
    if (!!this.playerContainer) {
      this.playerContainer.nativeElement.appendChild(scriptTag);
    }
  }
}
