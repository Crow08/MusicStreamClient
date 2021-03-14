import {Component} from '@angular/core';
import {ObjectSelectComponent, SelectObject} from '../object-select/object-select.component';


@Component({
  selector: 'app-object-multi-select',
  templateUrl: './object-multi-select.component.html',
  styleUrls: ['./object-multi-select.component.scss']
})
export class ObjectMultiSelectComponent extends ObjectSelectComponent {
  inputText: any;

  constructor() {
    super();
  }

  optionClicked(event: MouseEvent, option: SelectObject): void {
    event.stopPropagation();
    this.toggleSelection(option);
  }

  toggleSelection(option: SelectObject): void {
    option.selected = !option.selected;
    if (option.selected) {
      this.selectedOptions.push(option);
    } else {
      this.selectedOptions.splice(this.selectedOptions.findIndex(value => value.id === option.id), 1);
    }
    this.setOptionsSelected(this.selectedOptions);
    this.objectControl.reset();
  }

  display(): string | undefined {
    return '';
  }
}
