import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {InputObjectDirective} from '../input-object.directive';
import {ObjectSelectInputData, SelectObject} from '../../util/object-select/object-select.component';
import {AddObjectInputData} from '../../util/add-object-button/add-object-button.component';
import {HttpHelperService} from '../../../services/http-helper.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ServerResultErrorSnackBarComponent} from '../../messages/server-result-error-snack-bar.component';
import {Tag} from '../../../models/tag';

@Component({
  selector: 'app-input-tag',
  templateUrl: '../input-object.component.html',
  styleUrls: ['../input-object.component.scss']
})
export class TagComponent extends InputObjectDirective implements OnInit {

  constructor(httpHelperService: HttpHelperService, private snackBar: MatSnackBar) {
    super(httpHelperService, true);
  }

  ngOnInit(): void {
    this.addObjectInputData = new AddObjectInputData('Tags', [{displayName: 'Name', key: 'name', value: ''}], '/tags/');
    this.getData();
  }

  private getData(): void {
    super.getDataForSelect('/tags/all', Tag)
      .then(value => {
        this.selectObjectData = new ObjectSelectInputData('Tag', value.map(object => new SelectObject(object.id, object.name)));
      })
      .catch(() => this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
        duration: 2000,
      }));
  }

  objectAdded(): void {
    this.getData();
  }
}
