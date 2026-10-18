import { Injectable } from '@angular/core';
import { WsService } from './ws.service';
import { AuthenticationService } from './authentication.service';
import { UserState } from '../models/userStatus';

/**
 * Minimum time (ms) between two reports that only change the drift or latency: the drift is measured several times a
 * second, the latency with every timed command (including these reports).
 */
const REPORT_INTERVAL = 2000;
/** Drift changes (ms) smaller than this are not reported. */
const DRIFT_REPORT_THRESHOLD = 50;
/** Latency changes (ms) smaller than this are not reported. */
const LATENCY_REPORT_THRESHOLD = 5;

/**
 * Reports the playback status of this client (loading/ready, latency, drift) to the session, which shows it to the
 * other users. Changes of the state are reported right away, drift and latency changes at most every REPORT_INTERVAL.
 */
@Injectable({
  providedIn: 'root',
})
export class UserStatusService {
  private state: UserState = 'IDLE';
  private latency: number | null = null;
  private reportedLatency: number | null = null;
  private drift: number | null = null;
  private reportedDrift: number | null = null;
  private lastReport = 0;
  private pendingReport: number | null = null;
  /** The server only accepts reports of session members, i.e. after the own join. */
  private joined = false;

  constructor(private wsService: WsService, private authenticationService: AuthenticationService) {}

  /** Starts (and sends the current status) or stops reporting. */
  setJoined(joined: boolean): void {
    this.joined = joined;
    if (joined) {
      this.report();
    } else {
      this.cancelPendingReport();
      // the next session starts without media
      this.state = 'IDLE';
      this.drift = null;
      this.reportedDrift = null;
    }
  }

  setState(state: UserState): void {
    if (this.state !== state) {
      this.state = state;
      this.report();
    }
  }

  setLatency(latency: number): void {
    this.latency = latency;
    if (this.reportedLatency === null) {
      this.report();
    } else if (Math.abs(latency - this.reportedLatency) >= LATENCY_REPORT_THRESHOLD) {
      this.scheduleReport();
    }
  }

  /** @param drift expected minus actual playback position in ms, null when not playing. */
  setDrift(drift: number | null): void {
    this.drift = drift === null ? null : Math.round(drift);
    if (this.drift === null || this.reportedDrift === null) {
      // playback started or ended
      if (this.drift !== this.reportedDrift) {
        this.report();
      }
    } else if (Math.abs(this.drift - this.reportedDrift) >= DRIFT_REPORT_THRESHOLD) {
      this.scheduleReport();
    }
  }

  private scheduleReport(): void {
    if (this.pendingReport === null) {
      const delay = Math.max(0, this.lastReport + REPORT_INTERVAL - new Date().getTime());
      this.pendingReport = setTimeout(() => {
        this.pendingReport = null;
        this.report();
      }, delay);
    }
  }

  private cancelPendingReport(): void {
    if (this.pendingReport !== null) {
      clearTimeout(this.pendingReport);
      this.pendingReport = null;
    }
  }

  private report(): void {
    this.cancelPendingReport();
    const id = this.authenticationService.currentUserValue?.id;
    if (!this.joined || !id) {
      return;
    }
    this.lastReport = new Date().getTime();
    this.reportedDrift = this.drift;
    this.reportedLatency = this.latency;
    const status = { state: this.state, latency: this.latency, drift: this.drift };
    this.wsService.publishSessionCommand(`status/${id}`, JSON.stringify(status));
  }
}
