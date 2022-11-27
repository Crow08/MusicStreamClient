import { Component, Input, OnInit } from '@angular/core';
import { ObjectSelectInputData } from '../../util/object-select/object-select.component';
import { AddObjectInputData } from '../../util/add-object-button/add-object-button.component';
import { HttpHelperService } from '../../../services/http-helper.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServerResultErrorSnackBarComponent } from '../../messages/server-result-error-snack-bar.component';
import { InputObjectDirective } from '../input-object.directive';
import { Playlist } from '../../../models/playlist';
import { GenericDataObject } from '../../../models/genericDataObject';

@Component({
  selector: 'app-input-playlist',
  templateUrl: '../input-object.component.html',
  styleUrls: ['../input-object.component.scss'],
})
export class PlaylistComponent extends InputObjectDirective implements OnInit {
  @Input() override multiMode = true;

  constructor(httpHelperService: HttpHelperService, private snackBar: MatSnackBar) {
    super(httpHelperService, true);
  }

  ngOnInit(): void {
    this.addObjectInputData = new AddObjectInputData(
      'Playlist',
      [{ displayName: 'Name', key: 'name', value: '' }],
      '/playlists/'
    );
    this.getData();
  }

  objectAdded(): void {
    this.getData();
  }

  private getData(): void {
    super
      .getDataForSelect('/playlists/all', Playlist)
      .then((value) => {
        this.selectObjectData = new ObjectSelectInputData(
          'Playlist',
          value.map((object) => new GenericDataObject(object.id, object.name))
        );
      })
      .catch(() =>
        this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
          duration: 2000,
        })
      );
  }
}
