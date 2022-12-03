import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Media } from 'src/app/models/media';
import { HttpHelperService } from '../../../services/http-helper.service';
import { MatPaginator } from '@angular/material/paginator';
import { ObjectSelectInputData } from '../../util/object-select/object-select.component';
import { Artist } from 'src/app/models/artist';
import { Genre } from 'src/app/models/genre';
import { GenericDataObject } from 'src/app/models/genericDataObject';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { from, merge, Observable, of } from 'rxjs';
import { catchError, delay, startWith, switchMap, tap } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { ServerResultErrorSnackBarComponent } from '../../messages/server-result-error-snack-bar.component';
import { MatDialog } from '@angular/material/dialog';
import { AddToPlaylistDialogComponent } from '../../dialog/add-to-playlist-dialog/add-to-playlist-dialog.component';
import { YesNoDialogComponent } from '../../dialog/yes-no-dialog/yes-no-dialog.component';
import { CustomSnackBarComponent } from '../../messages/custom-snack-bar.component';
import { HttpCodeMessageGenerator } from '../../messages/http-code-message-generator';
import { EditSongDialogComponent } from '../../dialog/edit-song-dialog/edit-song-dialog.component';
import { WsService } from 'src/app/services/ws.service';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-database-browser',
  templateUrl: './database-browser.component.html',
  styleUrls: ['./database-browser.component.scss'],
})
export class DatabaseBrowserComponent implements OnInit {
  isLoadingResults = false;
  currentSongData: Media[] = [];
  dataSource: Observable<Media[]> = of([]);
  displayedColumns: string[] = ['select', 'title', 'album', 'artist', 'genre', 'menu'];
  modeSelect = 'song';
  dataBaseData: ObjectSelectInputData = new ObjectSelectInputData('', []);
  selectedOptions: GenericDataObject[] = [];
  selection = new SelectionModel<Media>(true, []);
  inSession = false;
  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;
  @ViewChild(MatSort) sort: MatSort | undefined;
  searchQuery: UntypedFormGroup = this.formBuilder.group({
    searchObject: ['song', { updateOn: 'change' }],
    searchKeyword: [undefined, { updateOn: 'change' }],
  });
  totalItems = 0;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private httpHelperService: HttpHelperService,
    private snackBar: MatSnackBar,
    private playlistDialog: MatDialog,
    private editSongDialog: MatDialog,
    private deleteSongDialog: MatDialog,
    private messageHandler: HttpCodeMessageGenerator,
    private wsService: WsService,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    this.sessionService.sessionId.subscribe((id) => {
      this.inSession = !!id;
    });
  }

  onSelectionChange(): void {
    this.dataSource = of([]);
    this.selectedOptions = [];
    switch (this.modeSelect) {
      case 'artist':
        this.httpHelperService.getArray('/api/v1/artists/all', Artist).then((artists) => {
          this.dataBaseData = new ObjectSelectInputData(
            'Artist',
            artists.map((artist) => new GenericDataObject(artist.id, artist.name))
          );
        });
        break;
      case 'genre':
        this.httpHelperService.getArray('/api/v1/genres/all', Genre).then((genres) => {
          this.dataBaseData = new ObjectSelectInputData(
            'Genre',
            genres.map((genre) => new GenericDataObject(genre.id, genre.name))
          );
        });
        break;
      default:
    }
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.currentSongData.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle(): void {
    this.isAllSelected() ? this.selection.clear() : this.currentSongData.forEach((row) => this.selection.select(row));
  }

  submitSearch(): void {
    if (!this.sort || !this.paginator) {
      console.error('Page not loaded properly!');
      return;
    }
    this.selection = new SelectionModel<Media>(true, []);
    this.dataSource = merge(this.sort.sortChange, this.paginator.page).pipe(
      startWith({}),
      delay(0),
      switchMap((_) => {
        this.isLoadingResults = true;
        let songList: Promise<Media[]> = Promise.reject();
        let searchArray = this.selectedOptions.map((song) => song.id);
        switch (this.searchQuery.value.searchObject) {
          case 'song':
            if (!this.sort || !this.paginator) {
              console.error('Page not loaded properly!');
              return Promise.reject();
            }
            if (this.searchQuery.value.searchKeyword !== null && this.searchQuery.value.searchKeyword !== '') {
              songList = this.httpHelperService.getArray(
                `/api/v1/media/getSongsByKeyword/${this.searchQuery.value.searchKeyword}?sort=${this.sort.active}` +
                  `&order=${this.sort.direction}&page=${this.paginator.pageIndex}&pageSize=${this.paginator.pageSize}`,
                Media
              );
            } else {
              const page = this.httpHelperService.getPage(
                `/api/v1/media/all?sort=${this.sort.active}&order=${this.sort.direction}&page=${this.paginator.pageIndex}` +
                  `&pageSize=${this.paginator.pageSize}`,
                Media
              );
              songList = new Promise((resolve, reject) =>
                page
                  .then((value) => {
                    resolve(value.content);
                    this.totalItems = value.numberOfElements;
                  })
                  .catch(reject)
              );
            }
            break;
          case 'artist':
            if (!this.sort || !this.paginator) {
              console.error('Page not loaded properly!');
              return Promise.reject();
            }
            searchArray = this.selectedOptions.map((song) => song.id);
            songList = this.httpHelperService.getArray(
              `/media/getSongsByArtist/${searchArray}?sort=${this.sort.active}&order=${this.sort.direction}` +
                `&page=${this.paginator.pageIndex}&pagesize=${this.paginator.pageSize}`,
              Media
            );
            break;
          case 'genre':
            if (!this.sort || !this.paginator) {
              console.error('Page not loaded properly!');
              return Promise.reject();
            }
            searchArray = this.selectedOptions.map((song) => song.id);
            songList = this.httpHelperService.getArray(
              `/media/getSongsByGenre/${searchArray}?sort=${this.sort.active}&order=${this.sort.direction}` +
                `&page=${this.paginator.pageIndex}&pagesize=${this.paginator.pageSize}`,
              Media
            );
            break;
          default:
        }
        return from(songList);
      }),
      tap((songs) => {
        // Flip flag to show that loading has finished.
        if (!!songs) {
          if (songs.length === 0) {
            this.snackBar.openFromComponent(CustomSnackBarComponent, {
              data: {
                message: "Didn't find the thing you were looking for. Feel free to add it!",
              },
              duration: 4000,
            });
          }
          this.currentSongData = songs;
        }
        this.isLoadingResults = false;
      }),
      catchError((e) => {
        this.messageHandler.calculateReturnCodeMessage(e.status);
        this.isLoadingResults = false;
        return of([]);
      })
    );
  }

  resetPaging(): void {
    if (!!this.paginator) {
      this.paginator.pageIndex = 0;
    }
  }

  displayGenreNames(genres: Genre[]): string {
    return genres.map((value) => value.name).join(', ');
  }

  openPlaylistDialog(songs: Media[]): void {
    const dialogRef = this.playlistDialog.open(AddToPlaylistDialogComponent, {
      data: {
        songIds: songs.map((song) => song.id),
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
    });
  }

  openEditSongDialog(song: any): void {
    const dialogRef = this.editSongDialog.open(EditSongDialogComponent, {
      data: { song },
    });
    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
      if (result) {
        this.submitSearch();
      }
    });
  }

  deleteSong(song: any): void {
    const dialogRef = this.deleteSongDialog.open(YesNoDialogComponent, {
      maxWidth: '400px',
      data: {
        title: 'Send song into oblivion?',
        yesButton: 'Hell yeah!',
        noButton: 'God, no!',
      },
    });

    dialogRef.afterClosed().subscribe((dialogResult) => {
      if (dialogResult) {
        this.httpHelperService
          .put(`/api/v1/media/deleteSongById/${song.id}`, null)
          .then(() => {
            this.submitSearch();
            this.snackBar.openFromComponent(CustomSnackBarComponent, {
              data: {
                message: 'deleteMessage',
              },
              duration: 2000,
            });
          })
          .catch(() =>
            this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
              duration: 2000,
            })
          );
      }
    });
  }

  deleteSongs(songs: Media[]): void {
    console.log(songs);
    const dialogRef = this.deleteSongDialog.open(YesNoDialogComponent, {
      maxWidth: '400px',
      data: {
        title: 'Delete all selected songs?',
        yesButton: 'With pleasure!',
        noButton: 'Nah!',
      },
    });

    dialogRef.afterClosed().subscribe((dialogResult) => {
      if (dialogResult) {
        this.httpHelperService
          .put(`/api/v1/media/deleteSongs`, songs)
          .then(() => {
            this.submitSearch();
            this.snackBar.openFromComponent(CustomSnackBarComponent, {
              data: {
                message: 'deleteMessage',
              },
              duration: 2000,
            });
          })
          .catch(() =>
            this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
              duration: 2000,
            })
          );
      }
    });
  }

  addSongToQueue(song: Media): void {
    this.wsService.publishSessionCommand(`addSongToQueue`, JSON.stringify(song));
    //this needs work, we cant just claim that it works everytime! #Arrow-function
    this.snackBar.openFromComponent(CustomSnackBarComponent, {
      data: {
        message: 'successMessage',
      },
      duration: 2000,
    });
  }

  addSongsToQueue(songs: Media[]): void {
    this.wsService.publishSessionCommand(`addSongsToQueue`, JSON.stringify(songs));
    //this needs work, we cant just claim that it works everytime! #Arrow-function
    this.snackBar.openFromComponent(CustomSnackBarComponent, {
      data: {
        message: 'successMessage',
      },
      duration: 2000,
    });
  }

  playSongNext(song: Media): void {
    this.wsService.publishSessionCommand(`playSongNext`, JSON.stringify(song));
    //this needs work, we cant just claim that it works everytime! #Arrow-function
    this.snackBar.openFromComponent(CustomSnackBarComponent, {
      data: {
        message: 'successMessage',
      },
      duration: 2000,
    });
  }

  playSongNow(song: Media): void {
    this.wsService.publishSessionCommand(`playSongNext`, JSON.stringify(song));
    setTimeout(() => this.wsService.publishSessionCommand(`skip`, `skip`), 1000);
  }
}
