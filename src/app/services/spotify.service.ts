///<reference types="@types/spotify-web-playback-sdk"/>
import { Injectable } from '@angular/core';
import { HttpHelperService } from './http-helper.service';
import { HttpParams } from '@angular/common/http';
import { Song } from '../models/song';
import { Tag } from '../models/tag';

interface LoginToken {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyService {
  clientHost = 'http://localhost:4200';
  redirectPath = '/spotify/redirect';
  spotifyAuthUrl = 'https://accounts.spotify.com/authorize';
  spotifyClientId = 'e81973b027b3414f82a39cb0527b7fc2';
  private static _loginToken: LoginToken = {
    token: undefined,
    refreshToken: undefined,
    expiresIn: undefined,
  };
  private static _deviceId: string;
  private static refreshJob: NodeJS.Timeout;

  constructor(private httpHelper: HttpHelperService) {}

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

  get loginToken(): LoginToken {
    console.log(SpotifyService._loginToken);
    return SpotifyService._loginToken;
  }

  get deviceId(): string {
    return SpotifyService._deviceId;
  }

  set deviceId(value: string) {
    SpotifyService._deviceId = value;
  }

  exchangeAuthCodeForToken(authCode: string) {
    this.httpHelper
      .post('/spotify/login', authCode)
      .then((loginToken) => {
        this.loginToken = loginToken as LoginToken;
      })
      .catch(console.error);
  }

  refreshToken() {
    console.log(this.loginToken);
    this.httpHelper
      .post('/spotify/refresh', this.loginToken.refreshToken)
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

  testPlay() {
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
          console.log(
            'The Web Playback SDK successfully connected to Spotify!'
          );
        }
      })
      .catch(console.error);
    player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
      this.deviceId = device_id;
      this.play('spotify:track:0gkVD2tr14wCfJhqhdE94L').catch(console.error);
    });
  }

  play(uri: string) {
    let body = JSON.stringify({
      uris: [uri],
      position_ms: 0,
    });

    return fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
      {
        body,
        headers: {
          Authorization: `Bearer ${this.loginToken.token}`,
          'Content-Type': 'application/json',
        },
        method: 'PUT',
      }
    );
  }

  /**
   * Get songs via playlist url.
   * @param {string} url - Url to get song from.
   * @param {number} offset - Offset for playlist entries and paging.
   * @param {number} limit - Playlist entries(max is 100)
   * @param {Song[]} songs - optional initial song list.
   * @returns {Promise<Song[]>} - Songs from playlist url.
   */
  getSongsViaPlaylistUrl(url, offset = 0, limit = 100, songs = []) {
    return new Promise((resolve, reject) => {
      const playlistId = url
        .toString()
        .split('playlist/')[1]
        .split('/')[0]
        .split('?')[0];

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
          } else if (
            typeof data.items === 'undefined' ||
            data.items.length <= 0
          ) {
            reject(
              new Error(
                'Playlist cannot be read, make sure the playlist is public! [SP]'
              )
            );
            return;
          }

          data.items.forEach((info) => {
            const song = new Song();
            song.title = info.track.name;
            song.album = info.track.album.name;
            song.artist = info.track.artists[0].name;
            song.tags = [new Tag(1, 'spotify')];
            song.uri = info.track.uri;
            songs.push(song);
          });

          if (data.next === null) {
            resolve(songs);
          } else {
            this.getSongsViaPlaylistUrl(
              url,
              data.next.split('offset=')[1],
              data.next.split('limit=')[1],
              songs
            )
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
   * @returns {Promise<Song>} - Song from url.
   */
  getSongViaUrl(url) {
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
          const song = new Song();
          song.title = data.name;
          song.album = data.album.name;
          song.artist = data.artists[0].name;
          song.tags = [new Tag(1, 'spotify')];
          song.uri = data.uri;
          return resolve([song]);
        })
        .catch(reject);
    });
  }

  /**
   * Get songs via query (without url).
   * @param {string} query - Url to get song from.
   * @param {number} limit - Number of songs to be fetched.
   * @returns {Promise<Song[]>} - Array of songs from url.
   */
  getSongsViaSearchQuery(query, limit = 10) {
    return new Promise((resolve, reject) => {
      fetch(
        `https://api.spotify.com/v1/search?q=${query}&type=track&limit=${limit}&offset=0`
      )
        .then((response) => response.text())
        .then((text) => {
          if (typeof text === 'undefined') {
            reject(new Error('Something went wrong. Try again! [SP]'));
            return;
          }
          const data = JSON.parse(text);
          if (
            typeof data === 'undefined' ||
            typeof data.tracks === 'undefined' ||
            typeof data.tracks.items === 'undefined'
          ) {
            return reject(new Error('Something went wrong. Try again! [SP]'));
          }
          if (data.tracks.items.length < 1) {
            return reject(new Error(`No results for Query: "${query}"! [SP]`));
          }
          const songs = [];
          data.tracks.items.forEach((item) => {
            const song = new Song();
            song.title = item.name;
            song.album = item.album.name;
            song.artist = item.artists[0].name;
            song.tags = [new Tag(1, 'spotify')];
            song.uri = item.uri;
            songs.push(song);
          });
          return resolve(songs);
        })
        .catch(reject);
    });
  }
}
