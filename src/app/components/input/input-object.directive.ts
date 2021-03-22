import {ClassConstructor} from 'class-transformer/types/interfaces';
import {HttpHelperService} from '../../services/http-helper.service';
import {Component, Directive, Input} from '@angular/core';

@Directive()
export class InputObjectDirective {
  @Input() multiMode: boolean;

  constructor(private httpHelperService: HttpHelperService) {
  }

  getDataForSelect(path: string, clazz: ClassConstructor<any>): Promise<any[]> {
    return this.httpHelperService.getArray(path, clazz);
  }
}
