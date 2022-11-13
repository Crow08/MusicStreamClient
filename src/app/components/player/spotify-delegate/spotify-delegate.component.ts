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
  playerContainer: ElementRef;
  private spotifyPlayerLoaded: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private spotifyService: SpotifyService
  ) {
    route.queryParams.subscribe((urlQueryParams) => {
      if (
        router.url.startsWith(spotifyService.redirectPath) &&
        !!urlQueryParams?.code
      ) {
        spotifyService.exchangeAuthCodeForToken(urlQueryParams.code);
        router.navigateByUrl('/').catch(console.error);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initDelegatePlayer();
    window['onSpotifyWebPlaybackSDKReady'] = () => {
      this.spotifyPlayerLoaded = true;
    };
  }

  private initDelegatePlayer() {
    const scriptTag = document.createElement('script');
    scriptTag.src = 'https://sdk.scdn.co/spotify-player.js';
    scriptTag.type = 'text/javascript';
    scriptTag.async = false;
    this.playerContainer.nativeElement.appendChild(scriptTag);
  }

  getAuthUrl() {
    return this.spotifyService.getAuthUrl();
  }

  testPlay() {
    this.spotifyService.testPlay();
  }
}
