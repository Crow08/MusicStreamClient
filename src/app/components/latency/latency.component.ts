import { AfterViewInit, Component } from '@angular/core';
import { AuthenticationService } from '../../services/authentication.service';
import { WsService } from '../../services/ws.service';

/** Number of ping/pong round trips used to determine the clock offset to the server. */
const SAMPLE_COUNT = 10;

@Component({
  selector: 'app-latency',
  templateUrl: './latency.component.html',
  styleUrls: ['./latency.component.scss'],
})
export class LatencyComponent implements AfterViewInit {
  /** Average round trip time in ms, for display. */
  latency: number = 0;
  /** Client clock minus server clock in ms. */
  serverTimeOffset: number = 0;

  private pingStart: number = 0;
  private latencySamples: number[] = [];
  private bestRoundTrip = Number.POSITIVE_INFINITY;
  private isMeasurementPending = false;

  constructor(private wsService: WsService, private authenticationService: AuthenticationService) {}

  ngAfterViewInit(): void {
    this.initWebsocketLatency();
  }

  private initWebsocketLatency(): void {
    if (!!this.authenticationService.currentUserValue) {
      this.wsService.subscribeToUtilLatencyTopic(this.authenticationService.currentUserValue, (body) => this.receivePong(body));
      this.pingServer();
    }
  }

  private pingServer(): void {
    if (!!this.authenticationService.currentUserValue) {
      this.pingStart = new Date().getTime();
      this.isMeasurementPending = true;
      this.wsService.publishUtilCommand(`latency/${this.authenticationService.currentUserValue.id}`, 'ping');
    }
  }

  private receivePong(value: string): void {
    if (!this.isMeasurementPending) {
      return;
    }
    this.isMeasurementPending = false;
    const roundTrip = new Date().getTime() - this.pingStart;
    this.latencySamples.push(roundTrip);
    this.latency = Math.round(this.latencySamples.reduce((pv, cv) => pv + cv, 0) / this.latencySamples.length);

    // The server time is assumed to be taken halfway through the round trip. The shorter the round trip, the smaller
    // the possible error, so the sample with the shortest round trip determines the offset (like NTP). The offset is
    // available after the first sample and refined with every better one.
    if (roundTrip < this.bestRoundTrip) {
      this.bestRoundTrip = roundTrip;
      this.serverTimeOffset = Math.round(this.pingStart + roundTrip / 2 - Number(value));
      console.log(`Server time offset: ${this.serverTimeOffset}ms (round trip ${roundTrip}ms)`);
    }

    if (this.latencySamples.length < SAMPLE_COUNT) {
      this.pingServer();
    } else {
      this.wsService.unsubscribeFromUtilLatencyTopic();
    }
  }
}
