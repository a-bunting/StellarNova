import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Data, Router } from '@angular/router';
import { BehaviorSubject, Observable, take, tap } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from 'src/environments/environment';
import { RednovaConsoleLog } from '../console/console.component';
import { GoodStore, SectorData } from '../game/game.component';
import { AuthenticateService, User } from './authenticate.service';
import { DatabaseResult } from './interfaces';

export interface ServerMessage {
  type: string; message: string; data: any;
}

export interface MenuData {
  component: string; data?: { id?: number | string }
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
  // sectior data
  sectorData: BehaviorSubject<SectorData> = new BehaviorSubject<SectorData>(null);
  // load menu
  loadMenuItem: BehaviorSubject<MenuData> = new BehaviorSubject<MenuData>(null);

  constructor(
    private http: HttpClient,
    private authService: AuthenticateService,
    private router: Router
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

  loadSectorData(galaxyId: number): void {
    this.loadGalaxyData(galaxyId).subscribe({
      next: (res: DatabaseResult) => {
        console.log(res.data);
        this.sectorData.next(res.data);
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
            case "tick": this.timeUntilNextTick = data.data.timeUntilNextTick; this.setTickTimer(data.data.timeUntilNextTick); break;
            case "subscribed": this.timeUntilNextTick = data.data.timeUntilNextTick; break;
            case "moveToSector": { this.sectorData.value.system.ships.push(data.data); this.sectorData.next(this.sectorData.value); break; }
            // NEED TO FINISH THIS AND IMPLEMENT IN THE BACKEND.
            case "leavingSector": { this.sectorData.value.system.ships.push(data.data); this.sectorData.next(this.sectorData.value); break; }
            case "criticalServerFailure": { this.router.navigate(['/'], { queryParams: { message: data.message }}) }
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

  addGoodsToShip(goodId: string, goodName: string, quantity: number): void {
    let shipStorage: GoodStore[] = [...JSON.parse(this.sectorData.value.ship.storage)];
    const goodLocator: number = shipStorage.findIndex((a: GoodStore) => a.id === goodId);

    if(goodLocator === -1) {
      const newGood: GoodStore = { id: goodId, name: goodName, quantity: quantity };
      shipStorage.push(newGood);
    } else {
      shipStorage[goodLocator].quantity += quantity;
    }

    const newSectorData: SectorData = { ...this.sectorData.value, ship: { ...this.sectorData.value.ship, storage: JSON.stringify(shipStorage)} };
    this.sectorData.next(newSectorData);
  }

  modifyShipCash(change: number): void {
    const newSectorData: SectorData = { ...this.sectorData.value, ship: { ...this.sectorData.value.ship, money: this.sectorData.value.ship.money + change } };
    let iterations: number = 0;

    // make it look good...
    const newInterval: number = window.setInterval(() => {
      // not sure why this usually adds as a string but this works...
      this.sectorData.value.ship.money = +this.sectorData.value.ship.money + +(change / 100);
      iterations++;
      if(iterations === 100)  {
        this.sectorData.next(newSectorData);
        clearInterval(newInterval);
      }
    }, (1 * 1000) / 100)
  }

  // loads a planet and lets anybody interested know...
  loadPlanet(planetId: number): void {
    this.loadMenuItem.next({
      component: 'planet', data: { id: planetId }
    });
  }

  clearLoadedComponent(): void {
    console.log('clearing');
    this.loadMenuItem.next(null);
  }

  public consoleLog: RednovaConsoleLog[] = [];

  consoleLogger(message: string, type: string, warning: boolean = false): void {
    // set a timer...
    const timer: number = window.setTimeout(() => {
      this.consoleLog.splice(0, 1);
    }, 9000); // delay should be the duration you want it to be shown + the fadeouttime of 1s.
    // add to the console log...
    this.consoleLog.push({message, type, warning, timer});
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

  getPlanetData(galaxyId: number, planetId: number): Observable<DatabaseResult> {
    return this.http.get<DatabaseResult>(`${environment.apiUrl}/planet/getPlanetData?galaxyId=${galaxyId}&planetId=${planetId}`).pipe(take(1));
  }

  buyResources(galaxyId: number, planetId: number, sectorId: number, goods: { id: string, quantity: number }): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/planet/buyResources`, { galaxyId: galaxyId, planetId: planetId, goods: goods, sectorId: sectorId }).pipe(take(1));
  }

  sellResources(galaxyId: number, planetId: number, sectorId: number, goods: { id: string, quantity: number }): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/planet/sellResources`, { galaxyId: galaxyId, planetId: planetId, goods: goods, sectorId: sectorId }).pipe(take(1));
  }

  buildBuilding(planetIndex: number, building: { id: number, quantity: number }): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/planet/buildBuilding`, { galaxyId: this.galaxyId, sectorId: this.sectorData.value.system.sectorid, planetIndex, building }).pipe(take(1));
  }

  destroyBuilding(planetIndex: number, building: { id: number, quantity: number }): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/planet/destroyBuilding`, { galaxyId: this.galaxyId, sectorId: this.sectorData.value.system.sectorid, planetIndex, building }).pipe(take(1));
  }

  updateTrading(planetIndex: number, tradingStatus: boolean): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/planet/updateTrading`, { galaxyId: this.galaxyId, sectorId: this.sectorData.value.system.sectorid, planetIndex, tradingStatus }).pipe(take(1));
  }
}
