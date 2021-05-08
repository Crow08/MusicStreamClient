import {Injectable} from '@angular/core';
import {InjectableRxStompConfig} from '@stomp/ng2-stompjs';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WsConfigService {

  configParameter = {
    login: '',
    usercode: '',
    session: '0'
  };

  constructor() {
  }

  updateWsConfig(config: { login?: string, auth?: string, session?: number }): void {
    if (config.session) {
      this.configParameter.session = String(config.session);
    }
    if (config.login) {
      this.configParameter.login = config.login;
    }
    if (config.auth) {
      this.configParameter.usercode = config.auth;
    }
  }


  myRxStompConfig(): InjectableRxStompConfig {
    return {
      // Which server?
      brokerURL: `ws://${environment.dbServer}/ws`,

      // Headers
      // Typical keys: login, passcode, host
      connectHeaders: this.configParameter,

      // How often to heartbeat?
      // Interval in milliseconds, set to 0 to disable
      heartbeatIncoming: 0, // Typical value 0 - disabled
      heartbeatOutgoing: 20000, // Typical value 20000 - every 20 seconds

      // Wait in milliseconds before attempting auto reconnect
      // Set to 0 to disable
      // Typical value 500 (500 milli seconds)
      reconnectDelay: 5000,

      // Will log diagnostics on console
      // It can be quite verbose, not recommended in production
      // Skip this key to stop logging to console
      debug: (msg: string): void => {
        // console.log(new Date(), msg);
      }
    };
  }
}
