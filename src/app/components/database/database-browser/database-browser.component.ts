import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Song } from 'src/app/models/song';
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
  styleUrls: ['./database-browser.component.scss']
})
export class DatabaseBrowserComponent implements OnInit {
  isLoadingResults = false;
  currentSongData: Song[] = [];

  constructor(private formBuilder: FormBuilder,
    private httpHelperService: HttpHelperService,
    private snackBar: MatSnackBar,
    private playlistDialog: MatDialog,
    private editSongDialog: MatDialog,
    private deleteSongDialog: MatDialog,
    private messageHandler: HttpCodeMessageGenerator,
    private wsService: WsService,
    private sessionService: SessionService) {
  }

  dataSource: Observable<Song[]>;
  displayedColumns: string[] = ['select', 'title', 'album', 'artist', 'genre', 'menu'];
  modeSelect;
  dataBaseData: ObjectSelectInputData;
  selectedOptions: GenericDataObject[] = [];
  selection = new SelectionModel<Song>(true, []);
  inSession: Boolean;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  searchQuery: FormGroup = this.formBuilder.group({
    searchObject: ['song', { updateOn: 'change' }],
    searchKeyword: [undefined, { updateOn: 'change' }],
  });

  ngOnInit(): void{
    if (this.sessionService.sessionId){
      this.inSession = true;
    }else{
      this.inSession = false;
    }
  }

  onSelectionChange(): void {
    this.dataSource = of([]);
    this.selectedOptions = [];
    switch (this.modeSelect) {
      case 'artist':
        this.httpHelperService.getArray('/artists/all', Artist)
          .then((artists) => {
            this.dataBaseData = new ObjectSelectInputData('Artist', artists.map(artist => new GenericDataObject(artist.id, artist.name)));
          });
        break;
      case 'genre':
        this.httpHelperService.getArray('/genres/all', Genre)
          .then((genres) => {
            this.dataBaseData = new ObjectSelectInputData('Genre', genres.map(genre => new GenericDataObject(genre.id, genre.name)));
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
    this.isAllSelected() ?
      this.selection.clear() :
      this.currentSongData.forEach(row => this.selection.select(row));
  }

  submitSearch(): void {
    this.selection = new SelectionModel<Song>(true, []);
    this.dataSource = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        delay(0),
        switchMap(() => {
          this.isLoadingResults = true;
          let searchQuery: Promise<Song[]>;
          let searchArray = this.selectedOptions.map(song => song.id);
          switch (this.searchQuery.value.searchObject) {
            case 'song':
              if (this.searchQuery.value.searchKeyword !== null && this.searchQuery.value.searchKeyword !== '') {
                searchQuery = this.httpHelperService.getArray(`/songs/getSongsByKeyword/${this.searchQuery.value.searchKeyword}?sort=${this.sort.active}&order=${this.sort.direction}&page=${this.paginator.pageIndex}&pagesize=${this.paginator.pageSize}`, Song);
              } else {
                searchQuery = this.httpHelperService.getArray(`/songs/all?sort=${this.sort.active}&order=${this.sort.direction}&page=${this.paginator.pageIndex}&pagesize=${this.paginator.pageSize}`, Song);
              }
              break;
            case 'artist':
              searchArray = this.selectedOptions.map(song => song.id);
              searchQuery = this.httpHelperService.getArray(`/songs/getSongsByArtist/${searchArray}?sort=${this.sort.active}&order=${this.sort.direction}&page=${this.paginator.pageIndex}&pagesize=${this.paginator.pageSize}`, Song);
              break;
            case 'genre':
              searchArray = this.selectedOptions.map(song => song.id);
              searchQuery = this.httpHelperService.getArray(`/songs/getSongsByGenre/${searchArray}?sort=${this.sort.active}&order=${this.sort.direction}&page=${this.paginator.pageIndex}&pagesize=${this.paginator.pageSize}`, Song);
              break;
            default:
          }
          return from(searchQuery);
        }),
        tap(songs => {
          // Flip flag to show that loading has finished.
          if (!!songs) {
            if (songs.length === 0) {
              this.snackBar.openFromComponent(CustomSnackBarComponent, {
                data: {
                  message: 'Didn\'t find the thing you were looking for. Feel free to add it!'
                },
                duration: 4000
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
    this.paginator.pageIndex = 0;
  }

  displayGenreNames(genres: Genre[]): string {
    return genres.map(value => value.name).join(', ');

  }

  openPlaylistDialog(songs: Song[]): void {
    const dialogRef = this.playlistDialog.open(AddToPlaylistDialogComponent, {
      data: {
        songIds: songs.map((song) => song.id)
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log(`Dialog result: ${result}`);
    });
  }

  openEditSongDialog(song: any): void {
    const dialogRef = this.editSongDialog.open(EditSongDialogComponent, {
      data: { song }
    });
    dialogRef.afterClosed().subscribe(result => {
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
      }
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.httpHelperService.put(`/songs/deleteSongById/${song.id}`, null)
          .then(() => {
            this.submitSearch();
            this.snackBar.openFromComponent(CustomSnackBarComponent, {
              data: {
                message: 'deleteMessage'
              },
              duration: 2000
            });
          })
          .catch(() => this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
            duration: 2000
          }));
      }
    });
  }

  deleteSongs(songs: Song[]): void {
    console.log(songs);
    const dialogRef = this.deleteSongDialog.open(YesNoDialogComponent, {
      maxWidth: '400px',
      data: {
        title: 'Delete all selected songs?',
        yesButton: 'With pleasure!',
        noButton: 'Nah!',
      }
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.httpHelperService.put(`/songs/deleteSongs`, songs)
          .then(() => {
            this.submitSearch();
            this.snackBar.openFromComponent(CustomSnackBarComponent, {
              data: {
                message: 'deleteMessage'
              },
              duration: 2000
            });
          })
          .catch(() => this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
            duration: 2000
          }));
      }
    });
  }

  addSongToQueue(song: Song): void {
    this.wsService.publishSessionCommand(`addSongToQueue`, JSON.stringify(song));
  }

  addSongsToQueue(songs: Song[]): void {
    this.wsService.publishSessionCommand(`addSongsToQueue`, JSON.stringify(songs));
  }
}
