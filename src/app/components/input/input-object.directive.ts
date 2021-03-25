import {ClassConstructor} from 'class-transformer/types/interfaces';
import {HttpHelperService} from '../../services/http-helper.service';
import {Directive, EventEmitter, Input, Output} from '@angular/core';
import {ObjectSelectInputData, SelectObject} from '../util/object-select/object-select.component';
import {AddObjectInputData} from '../util/add-object-button/add-object-button.component';

@Directive()
export class InputObjectDirective {
  multiMode: boolean;

  @Input() selectedOptions: SelectObject[];
  @Output() selectedOptionsChange = new EventEmitter<SelectObject[]>();

  addObjectInputData: AddObjectInputData;
  selectObjectData: ObjectSelectInputData;

  constructor(private httpHelperService: HttpHelperService, multiMode) {
    this.multiMode = multiMode;
  }

  getDataForSelect(path: string, clazz: ClassConstructor<any>): Promise<any[]> {
    return this.httpHelperService.getArray(path, clazz);
  }
}
