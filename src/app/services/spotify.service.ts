///<reference types="@types/spotify-web-playback-sdk"/>
import { Injectable } from '@angular/core';
import { HttpHelperService } from './http-helper.service';
import { HttpParams } from '@angular/common/http';
import { Media } from '../models/media';
import { Tag } from '../models/tag';
import { environment } from '../../environments/environment';
import { Song } from '../models/song';
import { Album } from '../models/album';
import { Artist } from '../models/artist';

interface LoginToken {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyService {
  private static refreshJob: number;
  clientHost = environment.frontendServer;
  redirectPath = '/spotify/redirect';
  spotifyAuthUrl = 'https://accounts.spotify.com/authorize';
  spotifyClientId = 'e81973b027b3414f82a39cb0527b7fc2';

  constructor(private httpHelper: HttpHelperService) {}

  private static _loginToken: LoginToken = {
    token: '',
    refreshToken: '',
    expiresIn: 0,
  };

  get loginToken(): LoginToken {
    console.log(SpotifyService._loginToken);
    return SpotifyService._loginToken;
  }

  set loginToken(loginToken: LoginToken) {
    console.log(loginToken);
    SpotifyService._loginToken.token = loginToken.token;
    SpotifyService._loginToken.expiresIn = loginToken.expiresIn;
    if (!!loginToken.refreshToken) {
      SpotifyService._loginToken.refreshToken = loginToken.refreshToken;
    }
    if (!!SpotifyService.refreshJob) {
      clearTimeout(SpotifyService.refreshJob);
    }
    SpotifyService.refreshJob = setTimeout(() => {
      this.refreshToken();
    }, (loginToken.expiresIn - 60) * 1000);
  }

  private static _deviceId: string;

  get deviceId(): string {
    return SpotifyService._deviceId;
  }

  set deviceId(value: string) {
    SpotifyService._deviceId = value;
  }

  exchangeAuthCodeForToken(authCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpHelper
        .post('/api/v1/spotify/login', authCode)
        .then((loginToken) => {
          this.loginToken = loginToken as LoginToken;
          resolve();
        })
        .catch(reject);
    });
  }

  refreshToken() {
    console.log(this.loginToken);
    this.httpHelper
      .post('/api/v1/spotify/refresh', this.loginToken.refreshToken)
      .then((loginToken) => {
        this.loginToken = loginToken as LoginToken;
      })
      .catch(console.error);
  }

  getAuthUrl() {
    const scopes = [
      'app-remote-control',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-read-private',
      'user-read-email',
    ];
    const params = new HttpParams()
      .set('client_id', this.spotifyClientId)
      .set('response_type', 'code')
      .set('redirect_uri', this.clientHost + this.redirectPath)
      .set('scope', scopes.join(' '));
    return this.spotifyAuthUrl + '?' + params.toString();
  }

  createPlayer(): Promise<string> {
    return new Promise((resolve, reject) => {
      const player = new Spotify.Player({
        name: 'Spotify delegate Player',
        getOAuthToken: (cb) => {
          cb(this.loginToken.token);
        },
        volume: 0.5,
      });
      player
        .connect()
        .then((success) => {
          if (success) {
            console.log('The Web Playback SDK successfully connected to Spotify!');
            return;
          }
        })
        .catch(reject);
      player.addListener('ready', ({ device_id }) => {
        resolve(`Ready with Device ID: ${device_id}`);
        this.deviceId = device_id;
      });
      player.addListener('initialization_error', reject);
    });
  }

  testPlay() {
    this.play('spotify:track:0gkVD2tr14wCfJhqhdE94L').catch(console.error);
  }

  play(uri: string) {
    let body = JSON.stringify({
      uris: [uri],
      position_ms: 0,
    });

    return fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      body,
      headers: {
        Authorization: `Bearer ${this.loginToken.token}`,
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    });
  }

  /**
   * Get songs via playlist url.
   * @param {string} url - Url to get song from.
   * @param {number} offset - Offset for playlist entries and paging.
   * @param {number} limit - Playlist entries(max is 100)
   * @param {Media[]} songs - optional initial song list.
   * @returns {Promise<Media[]>} - Songs from playlist url.
   */
  getSongsViaPlaylistUrl(url: string, offset = 0, limit = 100, songs: Media[] = []): Promise<Media[]> {
    return new Promise((resolve, reject) => {
      const playlistId = url.toString().split('playlist/')[1].split('/')[0].split('?')[0];

      fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?` +
          `offset=${offset}&limit=${limit}&fields=items(track(name,uri,duration_ms,artists(name), album(name))),next`,
        {
          headers: {
            Authorization: `Bearer ${this.loginToken.token}`,
            'Content-Type': 'application/json',
          },
          method: 'PUT',
        }
      )
        .then((response) => response.text())
        .then((text) => {
          if (typeof text === 'undefined') {
            reject(new Error('Something went wrong. Try again! [SP]'));
            return;
          }
          const data = JSON.parse(text);
          if (typeof data === 'undefined') {
            reject(new Error('Something went wrong. Try again! [SP]'));
            return;
          } else if (typeof data.items === 'undefined' || data.items.length <= 0) {
            reject(new Error('Playlist cannot be read, make sure the playlist is public! [SP]'));
            return;
          }

          data.items.forEach((info: any) => {
            const song = new Song(
              -1,
              'SONG',
              info.track.name,
              info.track.uri,
              [new Tag(1, 'spotify')],
              new Artist(-1, info.track.artists[0].name),
              new Album(-1, info.track.album.name),
              [],
              true
            );
            songs.push(song);
          });

          if (data.next === null) {
            resolve(songs);
          } else {
            this.getSongsViaPlaylistUrl(url, data.next.split('offset=')[1], data.next.split('limit=')[1], songs)
              .then(resolve)
              .catch(reject);
          }
        })
        .catch(reject);
    });
  }

  /**
   * Get song via url (without url).
   * @param {string} url - Url to get song from.
   * @returns {Promise<Media>[]} - Song from url.
   */
  getSongViaUrl(url: string): Promise<Media[]> {
    return new Promise((resolve, reject) => {
      const trackId = url.split('track/')[1].split('/')[0].split('?')[0];
      fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
          Authorization: `Bearer ${this.loginToken.token}`,
          'Content-Type': 'application/json',
        },
        method: 'PUT',
      })
        .then((response) => response.text())
        .then((text) => {
          if (typeof text === 'undefined') {
            reject(new Error('Something went wrong. Try again! [SP]'));
            return;
          }
          const data = JSON.parse(text);
          if (typeof data === 'undefined') {
            return reject(new Error('Something went wrong. Try again! [SP]'));
          }
          const song = new Song(
            -1,
            'SONG',
            data.name,
            data.uri,
            [new Tag(1, 'spotify')],
            new Artist(-1, data.artists[0].name),
            new Album(-1, data.album.name),
            [],
            true
          );
          return resolve([song]);
        })
        .catch(reject);
    });
  }

  /**
   * Get songs via query (without url).
   * @param {string} query - Url to get song from.
   * @param {number} limit - Number of songs to be fetched.
   * @returns {Promise<Media[]>} - Array of songs from url.
   */
  getSongsViaSearchQuery(query: string, limit = 10): Promise<Media[]> {
    return new Promise((resolve, reject) => {
      fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=${limit}&offset=0`)
        .then((response) => response.text())
        .then((text) => {
          if (typeof text === 'undefined') {
            reject(new Error('Something went wrong. Try again! [SP]'));
            return;
          }
          const data = JSON.parse(text);
          if (typeof data === 'undefined' || typeof data.tracks === 'undefined' || typeof data.tracks.items === 'undefined') {
            return reject(new Error('Something went wrong. Try again! [SP]'));
          }
          if (data.tracks.items.length < 1) {
            return reject(new Error(`No results for Query: "${query}"! [SP]`));
          }
          const songs: Media[] = [];
          data.tracks.items.forEach((item: any) => {
            const song = new Song(
              -1,
              'SONG',
              item.name,
              item.uri,
              [new Tag(1, 'spotify')],
              new Artist(-1, item.artists[0].name),
              new Album(-1, item.album.name),
              [],
              true
            );
            songs.push(song);
          });
          return resolve(songs);
        })
        .catch(reject);
    });
  }
}
