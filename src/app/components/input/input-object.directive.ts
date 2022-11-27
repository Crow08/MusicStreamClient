import { ClassConstructor } from 'class-transformer/types/interfaces';
import { HttpHelperService } from '../../services/http-helper.service';
import { Directive, EventEmitter, Input, Output } from '@angular/core';
import { ObjectSelectInputData } from '../util/object-select/object-select.component';
import { AddObjectInputData } from '../util/add-object-button/add-object-button.component';
import { GenericDataObject } from '../../models/genericDataObject';

@Directive()
export class InputObjectDirective {
  multiMode: boolean;

  @Input() selectedOptions!: GenericDataObject[];
  @Output() selectedOptionsChange = new EventEmitter<GenericDataObject[]>();

  addObjectInputData: AddObjectInputData = new AddObjectInputData('', [], '');
  selectObjectData: ObjectSelectInputData = new ObjectSelectInputData('', []);

  constructor(private httpHelperService: HttpHelperService, multiMode: boolean) {
    this.multiMode = multiMode;
  }

  getDataForSelect(path: string, clazz: ClassConstructor<any>): Promise<any[]> {
    return this.httpHelperService.getArray(path, clazz);
  }

  onChange(): void {
    this.selectedOptionsChange.emit(this.selectedOptions);
  }
}
