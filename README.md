# ToDo

## Features

- Browse-Funktion (Songs könnnen getaggt und zu Playlist hinzugefügt werden, viele Quick-Optionen, Details-Button -
  DetailsSeite - für erweiterte Features)
- Songs-Details-Seite
- Upload-Funktion (Bulk und Einzel, evtl Zip?)
- Player-Anzeige (Quickoptionen zum Bearbeiten)
- user-liste (wer hört zu?)
- Miniatur-Player (während man andere Sachen auf der Seite macht)
- Auto-Playlist anhand von Tags

- make it look good

## Tobis Notes
- deleting (just database for now), use delete or sth. like save()
- Custom Text Snackbars (one good, one bad)
- Use that snackbars to display error/return of playlist-add (with the catch-line)
- mass add to playlist (steal from normal add2playlist)
- [DONE] close dialog on selection
- new edit-song-dialog, autofill input-boxes with song data (more stealing)

- [DONE] add trash-can to allready played songs
- [DONE] player-queue mat-chip has smaller font, add some water to grow that poor guy



## Bugs
- Song/User-Rating doesn't show on initializing session
- When changing songs after rating, the stars sometimes display a wrong rating
  -> Start Server, Join/Host session, Press Play and rate 5 stars then skip, next song still displays 5 stars (wrong rating, right one would be 0)