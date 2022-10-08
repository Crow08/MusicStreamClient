import { Component } from '@angular/core';
import { ObjectSelectComponent } from '../object-select/object-select.component';
import { GenericDataObject } from '../../../models/genericDataObject';

@Component({
  selector: 'app-object-multi-select',
  templateUrl: './object-multi-select.component.html',
  styleUrls: ['./object-multi-select.component.scss'],
})
export class ObjectMultiSelectComponent extends ObjectSelectComponent {
  inputText: any;

  constructor() {
    super();
  }

  optionClicked(event: MouseEvent, option: GenericDataObject): void {
    event.stopPropagation();
    this.toggleSelection(option);
  }

  toggleSelection(option: GenericDataObject): void {
    if (this.isSelected(option)) {
      this.selectedOptions.splice(
        this.selectedOptions.findIndex((value) => value.id === option.id),
        1
      );
    } else {
      this.selectedOptions.push(option);
    }
    this.setOptionsSelected(this.selectedOptions);
    this.objectControl.reset();
  }

  display = (): string | undefined => '';

  isSelected(option: GenericDataObject): boolean {
    return (
      this.selectedOptions.findIndex((value) => value.id === option.id) !== -1
    );
  }
}
