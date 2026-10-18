import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { RxStompService } from '@stomp/ng2-stompjs';
import { RxStompState } from '@stomp/rx-stomp';
import { AuthenticationService } from './authentication.service';

/**
 * Session commands that are handled quickly and have small payloads in both directions (including the broadcast
 * response), so their round trip time is close to the network latency. Commands sending or returning lists (join,
 * queue changes) are not timed.
 */
const TIMED_COMMANDS = new Set([
  'status',
  'ready',
  'start',
  'skip',
  'previous',
  'jump',
  'pause',
  'resume',
  'stop',
  'loop',
  'end',
]);
/** Only samples of this period (ms) are used, so changes of the clocks (e.g. NTP adjustments) are picked up. */
const SAMPLE_WINDOW = 2 * 60 * 1000;
/** Tagged commands without a response within this time (ms) are forgotten (e.g. dropped commands). */
const PENDING_TIMEOUT = 10 * 1000;
/** Number of pings sent after connecting, so the offset is known before the first start. */
const PING_COUNT = 10;
/** Time (ms) after which the next ping is sent without a response, e.g. if the ping arrived before the subscription. */
const PING_TIMEOUT = 2000;

interface ClockSample {
  /** Client time of the measurement. */
  time: number;
  roundTrip: number;
  offset: number;
}

/**
 * Determines the clock offset to the server and the latency like NTP. Samples come from a burst of pings after every
 * (re)connect and passively from timed session commands: the server returns the tag (STOMP header "sync-id") of a
 * command together with its receive and send time on the messages sent while handling it.
 */
@Injectable({
  providedIn: 'root',
})
export class ClockSyncService {
  /** Client clock minus server clock in ms, from the sample with the shortest round trip in the window. */
  readonly serverTimeOffset = new BehaviorSubject<number>(0);
  /** Median round trip time in ms of the samples in the window, null before the first sample. */
  readonly latency = new BehaviorSubject<number | null>(null);

  /** Distinguishes the tags of this client from those of others, all clients receive the broadcasts. */
  private readonly tagPrefix = Math.random().toString(36).substring(2, 10);
  private nextTag = 0;
  /** Client send time by tag. */
  private readonly pending = new Map<string, number>();
  private samples: ClockSample[] = [];
  private burst: Subscription | null = null;

  constructor(private rxStompService: RxStompService, private authenticationService: AuthenticationService) {
    // measured again after every reconnect: the network path, and with it the latency, may have changed
    this.rxStompService.connectionState$.subscribe((state) => state === RxStompState.OPEN && this.measure());
  }

  /** Returns the headers to send with the given session command, empty if it is not timed. */
  tagCommand(command: string): { [key: string]: string } {
    return TIMED_COMMANDS.has(command.split('/')[0]) ? { 'sync-id': this.createTag() } : {};
  }

  /**
   * Evaluates the headers of a received message: only the first response to an own tagged command is a sample.
   *
   * @return the tag of the own command, null for other messages.
   */
  onResponse(headers: { [key: string]: string }): string | null {
    const tag = headers['sync-id'];
    const sent = tag !== undefined ? this.pending.get(tag) : undefined;
    if (sent === undefined) {
      return null;
    }
    this.pending.delete(tag);
    const serverReceived = Number(headers['server-received']);
    const serverSent = Number(headers['server-sent']);
    if (Number.isFinite(serverReceived) && Number.isFinite(serverSent)) {
      this.addSample(sent, serverReceived, serverSent, new Date().getTime());
    }
    return tag;
  }

  /** Sends a burst of pings to the server, one at a time. Running bursts are cancelled. */
  measure(): void {
    this.burst?.unsubscribe();
    this.burst = null;
    const user = this.authenticationService.currentUserValue;
    if (!user) {
      return;
    }
    let sent = 0;
    let current: string | null = null;
    let pingTimeout: ReturnType<typeof setTimeout> | undefined;
    const ping = () => {
      clearTimeout(pingTimeout);
      if (sent++ >= PING_COUNT) {
        this.burst?.unsubscribe();
        this.burst = null;
        return;
      }
      // tagged like a session command: a late answer can not be mistaken for the answer to the next ping
      current = this.createTag();
      pingTimeout = setTimeout(ping, PING_TIMEOUT);
      this.rxStompService.publish({
        destination: `/app/util/latency/${user.id}`,
        body: 'ping',
        headers: { 'sync-id': current },
      });
    };
    this.burst = this.rxStompService.watch(`/topic/util/latency/${user.id}`).subscribe((message) => {
      if (this.onResponse(message.headers) === current) {
        ping();
      }
    });
    this.burst.add(() => clearTimeout(pingTimeout));
    ping();
  }

  private createTag(): string {
    const now = new Date().getTime();
    this.pending.forEach((sent, tag) => now - sent > PENDING_TIMEOUT && this.pending.delete(tag));
    const tag = `${this.tagPrefix}-${++this.nextTag}`;
    this.pending.set(tag, now);
    return tag;
  }

  /**
   * Adds a measurement. The server times are assumed to lie halfway through the round trip without the server
   * processing time; the shorter the round trip, the smaller the possible error.
   */
  addSample(clientSent: number, serverReceived: number, serverSent: number, clientReceived: number): void {
    // the times are whole milliseconds: on a fast connection the difference can be slightly negative
    const roundTrip = Math.max(0, clientReceived - clientSent - (serverSent - serverReceived));
    const offset = Math.round((clientSent - serverReceived + (clientReceived - serverSent)) / 2);
    this.samples = this.samples.filter((sample) => clientReceived - sample.time <= SAMPLE_WINDOW);
    this.samples.push({ time: clientReceived, roundTrip, offset });

    const best = this.samples.reduce((a, b) => (b.roundTrip < a.roundTrip ? b : a));
    if (best.offset !== this.serverTimeOffset.value) {
      console.log(`Server time offset: ${best.offset}ms (round trip ${best.roundTrip}ms)`);
      this.serverTimeOffset.next(best.offset);
    }
    const roundTrips = this.samples.map((sample) => sample.roundTrip).sort((a, b) => a - b);
    const median = Math.round(roundTrips[Math.floor(roundTrips.length / 2)]);
    if (median !== this.latency.value) {
      this.latency.next(median);
    }
  }
}
