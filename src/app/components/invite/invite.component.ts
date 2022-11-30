import { Component } from '@angular/core';
import { HttpHelperService } from '../../services/http-helper.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-invite',
  templateUrl: './invite.component.html',
  styleUrls: ['./invite.component.scss'],
})
export class InviteComponent {
  link: string = '';
  constructor(private httpHelperService: HttpHelperService) {}

  getInviteLink() {
    this.httpHelperService
      .putPlain('/users/register?X-NPE-PSU-Duration=PT1H', null)
      .then((value) => {
        let psu = value as string;
        psu = psu.substring(environment.dbServer.length, psu.length);
        this.link = environment.frontendServer + '/register?invite=' + window.btoa(encodeURIComponent(psu));
      })
      .catch();
  }
}
