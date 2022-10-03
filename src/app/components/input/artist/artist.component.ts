import {Component, OnInit} from '@angular/core';
import {ObjectSelectInputData} from '../../util/object-select/object-select.component';
import {AddObjectInputData} from '../../util/add-object-button/add-object-button.component';
import {InputObjectDirective} from '../input-object.directive';
import {HttpHelperService} from '../../../services/http-helper.service';
import {ServerResultErrorSnackBarComponent} from '../../messages/server-result-error-snack-bar.component';
import {Artist} from '../../../models/artist';
import {MatSnackBar} from '@angular/material/snack-bar';
import {GenericDataObject} from '../../../models/genericDataObject';

@Component({
  selector: 'app-input-artist',
  templateUrl: '../input-object.component.html',
  styleUrls: ['../input-object.component.scss'],
})
export class ArtistComponent extends InputObjectDirective implements OnInit {
  constructor(
    httpHelperService: HttpHelperService,
    private snackBar: MatSnackBar
  ) {
    super(httpHelperService, false);
  }

  ngOnInit(): void {
    this.addObjectInputData = new AddObjectInputData(
      'Artist',
      [{displayName: 'Name', key: 'name', value: ''}],
      '/artists/'
    );
    this.getData();
  }

  objectAdded(): void {
    this.getData();
  }

  private getData(): void {
    super
      .getDataForSelect('/artists/all', Artist)
      .then((value) => {
        this.selectObjectData = new ObjectSelectInputData(
          'Artist',
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
