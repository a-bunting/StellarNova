import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, take, tap } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from 'src/environments/environment';
import { AuthenticateService, User } from './authenticate.service';
import { DatabaseResult } from './interfaces';

export interface ServerMessage {
  type: string; message: string; data: any;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  // incokming messages that components can subscribe to
  serverMessage: BehaviorSubject<ServerMessage> = new BehaviorSubject<ServerMessage>(null);
  // user object
  user: User;
  // first load
  firstLoad: boolean = true;

  constructor(
    private http: HttpClient,
    private authService: AuthenticateService
  ) {
    // get the user and once user data is found subscribe tot he websockets...
    this.authService.user.subscribe((user: User) => {
      this.user = user;

      if(this.firstLoad && user !== null) {
        this.firstLoad = false;
        this.webSockets();
      }
    });
  }

  galaxyId: number = -1;

  setGalaxyId(galaxyId: number): void { this.galaxyId = galaxyId; }

  ws: WebSocketSubject<any>;

  webSockets(): void {
    if(!this.user) return;

    // deserializer is from this: https://github.com/ReactiveX/rxjs/issues/4166
    // read it one day to see whyt his error persists,,,
    this.ws = webSocket({url: `${environment.websocketUrl}`});
    this.ws.next({
      type: 'sub',
      email: this.user.email,
      username: this.user.username,
      galaxyId: this.galaxyId
    })

    this.ws.subscribe(
      {
        next: (data: ServerMessage) => {
          switch(data.type) {
            case "tick": this.timeUntilNextTick = data.data.timeUntilNextTick; break;
          }
          // and send the data to any other interested parties!
          this.serverMessage.next(data);
      },
        error: (error) => { console.log(`Error in socket: ${error}`); this.reconnectToWebsockets(); }
    });
  }

  endWebsockets(): void {
    console.log(`closing connection...`);
    this.ws.unsubscribe();
    this.ws.complete();
  }

  /**
   * Reconnects the server after the websockets get disconnected...
   * (tries to!)
   * @param tmeout number 2000 default
   */
  reconnectToWebsockets(timeout: number = 2000): void {
    setTimeout(() => { this.webSockets(); }, timeout);
  }

  // delete when satisfied websockets work well...
  sendTestMessage(): void {
    this.ws.next({ msg: 'hello' });
  }

  timeUntilNextTick: number = -1;
  nextTick: number;

  setTickTimer(duration: number): void {
    this.timeUntilNextTick = duration;
    clearInterval(this.nextTick);
    // set the interval for the next tick countdown...
    this.nextTick = window.setInterval(() => {
      (this.timeUntilNextTick - 1) < 0 ? clearInterval(this.nextTick) : this.timeUntilNextTick--;
    }, 1000);
  }

  /**
   * loads the galaxy data for a particular galaxy...
   *
   * @param galaxyId
   * @returns
   */
  loadGalaxyData(galaxyId: number): Observable<DatabaseResult> {
    return this.http.get<DatabaseResult>(`${environment.apiUrl}/galaxy/getUserGalaxyData?galaxyId=${galaxyId}`).pipe(take(1));
  }

  warpToSector(galaxyId: number, sectorId: number): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/galaxy/moveTo`, { destinationId: sectorId, galaxyId: galaxyId, movestyle: 'warp' }).pipe(take(1));
  }

  moveToSector(galaxyId: number, sectorId: number, engines: number): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/galaxy/moveTo`, { destinationId: sectorId, galaxyId: galaxyId, engines: engines }).pipe(take(1));
  }

  getDistanceCalculation(galaxyId: number, from: number, to: number, engine: number = 1): Observable<DatabaseResult> {
    return this.http.get<DatabaseResult>(`${environment.apiUrl}/galaxy/distanceToSector?galaxyId=${galaxyId}&from=${from}&to=${to}&engine=${engine}`).pipe(take(1));
  }
}
