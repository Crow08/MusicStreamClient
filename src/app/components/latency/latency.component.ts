import { AfterViewInit, Component } from '@angular/core';
import { AuthenticationService } from '../../services/authentication.service';
import { WsService } from '../../services/ws.service';

@Component({
  selector: 'app-latency',
  templateUrl: './latency.component.html',
  styleUrls: ['./latency.component.scss'],
})
export class LatencyComponent implements AfterViewInit {
  latency: number = 0;
  serverTimeOffset: number = 0;

  private pingStart: number = 0;
  private latencySamples: number[] = [];
  private isMeasurementPending = false;

  constructor(private wsService: WsService, private authenticationService: AuthenticationService) {}

  ngAfterViewInit(): void {
    this.initWebsocketLatency();
  }

  public startLatencyMeasurement(): void {
    this.pingStart = new Date().getTime();
    this.isMeasurementPending = true;
  }

  public endLatencyMeasurement(): boolean {
    let enoughSamples = false;
    if (this.isMeasurementPending) {
      const pingEnd = new Date().getTime();
      const latency = pingEnd - this.pingStart; // full round trip
      this.latencySamples.push(latency);
      if (this.latencySamples.length > 10) {
        this.latencySamples.shift();
        const totalLatency = this.latencySamples.reduce((pv, cv) => pv + cv, 0);
        this.latency = totalLatency / this.latencySamples.length;
        enoughSamples = true;
      }
      this.isMeasurementPending = false;
    }
    return enoughSamples;
  }

  private initWebsocketLatency(): void {
    if (!!this.authenticationService.currentUserValue) {
      this.wsService.subscribeToUtilLatencyTopic(this.authenticationService.currentUserValue, (body) => this.receivePong(body));
      this.pingServer();
    }
  }

  private pingServer(): void {
    if (!!this.authenticationService.currentUserValue) {
      this.startLatencyMeasurement();
      this.wsService.publishUtilCommand(`latency/${this.authenticationService.currentUserValue.id}`, 'ping');
    }
  }

  private receivePong(value: string): void {
    if (this.endLatencyMeasurement()) {
      this.calculateServerTimeOffset(Number(value));
      this.wsService.unsubscribeFromUtilLatencyTopic();
    } else {
      this.pingServer();
    }
  }

  private calculateServerTimeOffset(serverTime: number): void {
    this.serverTimeOffset = this.pingStart - (serverTime - this.latency / 2);
    console.log('Server Time: ' + (serverTime - this.latency / 2));
    console.log('Client Time: ' + this.pingStart);
    console.log('Server Time Offset:' + this.serverTimeOffset);
  }
}
