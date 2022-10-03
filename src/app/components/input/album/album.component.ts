import {Component, OnInit} from '@angular/core';
import {ObjectSelectInputData} from '../../util/object-select/object-select.component';
import {AddObjectInputData} from '../../util/add-object-button/add-object-button.component';
import {HttpHelperService} from '../../../services/http-helper.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ServerResultErrorSnackBarComponent} from '../../messages/server-result-error-snack-bar.component';
import {InputObjectDirective} from '../input-object.directive';
import {Album} from '../../../models/album';
import {GenericDataObject} from '../../../models/genericDataObject';

@Component({
  selector: 'app-input-album',
  templateUrl: '../input-object.component.html',
  styleUrls: ['../input-object.component.scss'],
})
export class AlbumComponent extends InputObjectDirective implements OnInit {
  constructor(
    httpHelperService: HttpHelperService,
    private snackBar: MatSnackBar
  ) {
    super(httpHelperService, false);
  }

  ngOnInit(): void {
    this.addObjectInputData = new AddObjectInputData(
      'Album',
      [{displayName: 'Name', key: 'name', value: ''}],
      '/albums/'
    );
    this.getData();
  }

  objectAdded(): void {
    this.getData();
  }

  private getData(): void {
    super
      .getDataForSelect('/albums/all', Album)
      .then((value) => {
        this.selectObjectData = new ObjectSelectInputData(
          'Album',
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
