import {AfterViewInit, Component} from '@angular/core';
import {Subscription} from 'rxjs';
import {AuthenticationService} from '../../services/authentication.service';
import {RxStompService} from '@stomp/ng2-stompjs';

@Component({
  selector: 'app-latency',
  templateUrl: './latency.component.html',
  styleUrls: ['./latency.component.scss']
})
export class LatencyComponent implements AfterViewInit {

  latency: number;
  serverTimeOffset: number;

  private topic: Subscription;
  private pingStart: number;
  private latencySamples: number[] = [];
  private isMeasurementPending = false;

  constructor(private rxStompService: RxStompService,
              private authenticationService: AuthenticationService) {
  }

  ngAfterViewInit(): void {
    this.initWebsocketLatency();
  }

  public startLatencyMeasurement(): void {
    this.pingStart = (new Date()).getTime();
    this.isMeasurementPending = true;
  }

  public endLatencyMeasurement(): boolean {
    let enoughSamples = false;
    if (this.isMeasurementPending) {
      const pingEnd = (new Date()).getTime();
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
    this.topic = this.rxStompService.watch(`/topic/util/latency/${this.authenticationService.currentUserValue.id}`)
      .subscribe((message: any) => {
        this.receivePong(message.body);
      });
    this.pingServer();
  }

  private pingServer(): void {
    this.startLatencyMeasurement();
    this.rxStompService.publish({destination: `/app/util/latency/${this.authenticationService.currentUserValue.id}`, body: 'ping'});
  }

  private receivePong(body): void {
    if (this.endLatencyMeasurement()) {
      this.calculateServerTimeOffset(Number(body));
      this.topic.unsubscribe();
    } else {
      this.pingServer();
    }
  }

  private calculateServerTimeOffset(serverTime: number): void {
    this.serverTimeOffset = this.pingStart - (serverTime - (this.latency / 2));
    console.log('Server Time: ' + (serverTime - (this.latency / 2)));
    console.log('Client Time: ' + this.pingStart);
    console.log('Server Time Offset:' + this.serverTimeOffset);
  }
}
