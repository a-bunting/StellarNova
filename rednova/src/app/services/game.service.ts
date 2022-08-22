import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Data, Router } from '@angular/router';
import { BehaviorSubject, Observable, take, tap } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from 'src/environments/environment';
import { RednovaConsoleLog } from '../console/console.component';
import { GoodStore, SectorData } from '../game/game.component';
import { TradeLogData } from '../trade/display-trade-log/display-trade-log.component';
import { TradeRoute, TradeRouteDisplay } from '../trade/trade-routes/trade-routes.component';
import { AuthenticateService, User } from './authenticate.service';
import { DatabaseResult } from './interfaces';

export interface Coordinate3D { x: number, y: number, z: number }
export interface Coordinate2D { x: number, y: number }

export interface SectorLog {
  sectorid: number, planets: SectorLogPlanet[], coordinates: Coordinate3D, warp: number[]
}

export interface SectorLogPlanet {
  id: number, name: string, trading?: boolean, owner?: string
}

export interface ServerMessage {
  type: string; message: string; data: any;
}

export interface MenuData {
  component: string; data?: { id?: number | string } | any
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
  // trade routes
  tradeRoutes: TradeRouteDisplay[] = [];
  tradeRouteSubscription: BehaviorSubject<TradeRouteDisplay[]> = new BehaviorSubject(null);
  // loading new sector...
  loadingNewSector: BehaviorSubject<boolean> = new BehaviorSubject(null);

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
        this.loadLocalstorage();
        this.loadNavigationLog();
        this.loadTradeRoutes();
      }
    });
  }

  loadSectorData(galaxyId: number = this.galaxyId): void {
    this.loadGalaxyData(galaxyId).subscribe({
      next: (res: DatabaseResult) => {
        if(res) {
          this.sectorId = res.data.system.sectorid;
          this.logVisitedSector(res.data);
          this.sectorData.next(res.data);
          console.log(res.data);
        }
      }
    });
  }

  loadNavigationLog(): void {
    this.getNavigationLog(this.galaxyId).subscribe({
      next: (result: DatabaseResult) => {
        if(result) {
          console.log(result);
          this.visitedSectors = result.data.planetLog;
          this.updateLocalVisitedLog(result.data.planetLog);
        }
      },
      error: (err: any) => { console.log(`Error: ${err}`)},
      complete: () => { }
    })
  }

  loadTradeRoutes(): void {
    this.loadAllTradeRoutes().subscribe({
      next: (result: DatabaseResult) => {
        if(result) {
          this.tradeRoutes = result.data.routes;
          this.tradeRouteSubscription.next(this.tradeRoutes);
          console.log(result);
        }
      },
      error: (err: any) => { console.log(`Error: ${err}`)},
      complete: () => { }
    })
  }

  /**
   * Use this to modify or add a route t the trade routes...
   * @param route
   */
  addOrUpdateTradeRoute(route: TradeRouteDisplay): void {
    let exists: boolean = false;

    for(let i = 0 ; i < this.tradeRoutes.length ; i++) {
      if(this.tradeRoutes[i].id === route.id) {
        // the route is found, so update the name only...
        this.tradeRoutes[i].name = route.name;
        exists = true;
        break;
      }
    }
    // if the route isnt found add it
    if(!exists) this.tradeRoutes.push(route);

    this.tradeRouteSubscription.next(this.tradeRoutes);
  }

  /**
   * Remove the trade route from the list
   * @param id
   */
  removeTradeRouteFromList(id: number): void {
    for(let i = 0 ; i < this.tradeRoutes.length ; i++) {
      if(this.tradeRoutes[i].id === id) {
        // the route is found, so update the name only...
        this.tradeRoutes.splice(i, 1);
        break;
      }
    }

    this.tradeRouteSubscription.next(this.tradeRoutes);
  }

  /**
   * Any local storage that needs to be loaded can be done here.
   */
  loadLocalstorage(): void {
    this.visitedSectors = JSON.parse(localStorage.getItem('rednova-visitedlog'));
  }

  galaxyId: number = -1;
  sectorId: number = -1;

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
    const goodLocator: number = shipStorage.findIndex((a: GoodStore) => +a.id === +goodId);

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

  loadComponent(component: string, id?: number, data?: any): void {
    switch(component) {
      case 'planet':
        this.loadMenuItem.next({ component: 'planet', data: { id: id } });
        break;
      case 'trade':
        this.loadMenuItem.next({ component: 'trade', data: { id: id ? id : undefined } });
        break;
      case 'displayTradeLog':
        this.loadMenuItem.next({ component: 'displayTradeLog', data: data });
        break;
      case 'navlog':
        this.loadMenuItem.next({ component: 'navigationLog' });
        break;
    }
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

  visitedSectors: SectorLog[] = [];

  logVisitedSector(sector: SectorData): void {
    // parse the sectordata into a sectorlog...
    const sectorLog: SectorLog = {
      sectorid: sector.system.sectorid,
      planets: [
        ...sector.system.planets.map(({ planetindex, distance, ...data }) => { return { id: data.id, name: data.name }} )
      ],
      coordinates: { x: sector.system.x, y: sector.system.y, z: sector.system.z },
      warp: [...sector.system.warp.map(({ destination: destination, ...data }) => { return destination })]
    }

    console.log(sectorLog);

    // find the current log index if it exists...
    const alreadyLoggedIndex: number = this.visitedSectors.findIndex((a: SectorLog) => a.sectorid === sector.system.sectorid);

    // check if tis in the log or not, if not add it, if so check its the same data and update.
    if(alreadyLoggedIndex === -1) {
      // its not already in the log...
      this.visitedSectors.push(sectorLog);
    } else {
      // it is in the log so just overwrite the current data...
      this.visitedSectors[alreadyLoggedIndex] = sectorLog;
    }

    this.updateLocalVisitedLog(this.visitedSectors);
  }

  getVisitedLog(): SectorLog[] { return this.visitedSectors; }

  /**
   * Get any visited log data for a sector...
   * @param sectorId
   * @returns
   */
  getVisitedLogSector(sectorId: number): SectorLogPlanet[] {
    const log: SectorLog = this.visitedSectors.find((a: SectorLog) => a.sectorid === sectorId);
    return log ? log.planets : [];
  }

  /**
   * Toggle trading in the log...
   * Implemented in code but not in the game, maybe add as a talent later.
   *
   * @param sectorid
   * @param planetid
   * @param tradingStatus
   */
  toggleTradingInLog(planetid: number, tradingStatus: boolean): void {
    // get the sector index in the log.
    const alreadyLoggedIndex: number = this.visitedSectors.findIndex((a: SectorLog) => a.sectorid === this.sectorId);

    // if it exists then toggle trading...
    if(alreadyLoggedIndex !== -1) {
      const planetIndex: number = this.visitedSectors[alreadyLoggedIndex].planets.findIndex((a: SectorLogPlanet) => a.id === planetid);

      // if the planet exists then update the trading status...
      if(planetIndex !== -1) {
        this.visitedSectors[alreadyLoggedIndex].planets[planetIndex].trading = tradingStatus;
        this.updateLocalVisitedLog(this.visitedSectors);
      }
    }
    // else it doesnt exist in the log for some reason!
  }

  /**
   * Update localstorage with the new log...
   * @param log
   */
  updateLocalVisitedLog(log: SectorLog[]): void {
    localStorage.setItem('rednova-visitedlog', JSON.stringify(log));
  }

  /**
   * The callback function for the database unless overridden
   * @param res
   */
  dbCallBack: Function = (res: DatabaseResult) => {
    if(res.error) console.log(`Error: ${res.message}`);
  }

  goods: { id: number, name: string }[] = [
    { id: 1, name: 'Organics'},
    { id: 2, name: 'Goods'},
    { id: 3, name: 'Energy'},
    { id: 4, name: 'Construction Materials'},
    { id: 5, name: 'Solar Farms'},
    { id: 6, name: 'Factories'},
    { id: 7, name: 'Plants'},
    { id: 8, name: 'Farms'}
  ]

  getGoodsName(id: number): string {
    const good: { id: number, name: string } = this.goods.find((a: { id: number, name: string }) => a.id === id);
    if(good) return good.name;
    else return 'Unknown Good';
  }

  /**
   * Formula tyo get an estimate for the distance between two points.
   * This only works if you have already visited a sector otherwise the coordinates will not be local.
   * @param from
   * @param to
   * @param engineSize
   * @returns
   */
  turnsCostToRealtimeMove(from: { x: number, y: number, z: number}, to: { x: number, y: number, z: number}, engineSize: number = 1): number {
    const maxTurns = 209.95 - (engineSize * 4.975);
    const distanceModifier = Math.sqrt(Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2));
    const distanceTurns = maxTurns * Math.exp(-distanceModifier / 5);
    return Math.floor(distanceTurns);
}


  /**
   * loads the galaxy data for a particular galaxy...
   *
   * @param galaxyId
   * @returns
   */
  loadGalaxyData(galaxyId: number, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    // signal a new sector is being loaded
    this.loadingNewSector.next(true);
    return this.http.get<DatabaseResult>(`${environment.apiUrl}/galaxy/getUserGalaxyData?galaxyId=${galaxyId}`).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  getNavigationLog(galaxyId: number, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.get<DatabaseResult>(`${environment.apiUrl}/user/getNavLog?galaxyId=${galaxyId}`).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  warpToSector(galaxyId: number, sectorId: number, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/galaxy/moveTo`, { destinationId: sectorId, galaxyId: galaxyId, movestyle: 'warp' }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  moveToSector(galaxyId: number, sectorId: number, engines: number, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/galaxy/moveTo`, { destinationId: sectorId, galaxyId: galaxyId, engines: engines }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  getDistanceCalculation(galaxyId: number, from: number, to: number, engine: number = 1, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.get<DatabaseResult>(`${environment.apiUrl}/galaxy/distanceToSector?galaxyId=${galaxyId}&from=${from}&to=${to}&engine=${engine}`).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  getPlanetData(galaxyId: number, planetId: number, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.get<DatabaseResult>(`${environment.apiUrl}/planet/getPlanetData?galaxyId=${galaxyId}&planetId=${planetId}`).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  buyResources(galaxyId: number, planetId: number, sectorId: number, goods: { id: string, quantity: number }, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/planet/buyResources`, { galaxyId: galaxyId, planetId: planetId, goods: goods, sectorId: sectorId }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  sellResources(galaxyId: number, planetId: number, sectorId: number, goods: { id: string, quantity: number }, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/planet/sellResources`, { galaxyId: galaxyId, planetId: planetId, goods: goods, sectorId: sectorId }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  buildBuilding(planetIndex: number, building: { id: number, quantity: number }, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/planet/buildBuilding`, { galaxyId: this.galaxyId, sectorId: this.sectorData.value.system.sectorid, planetIndex, building }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  destroyBuilding(planetIndex: number, building: { id: number, quantity: number }, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/planet/destroyBuilding`, { galaxyId: this.galaxyId, sectorId: this.sectorData.value.system.sectorid, planetIndex, building }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  updateTrading(planetIndex: number, tradingStatus: boolean, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/planet/updateTrading`, { galaxyId: this.galaxyId, sectorId: this.sectorData.value.system.sectorid, planetIndex, tradingStatus }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  saveTradeRoute(tradeRoute: TradeRoute, tradeRouteId?: number, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/trade/addTradeRoute`, { galaxyId: this.galaxyId, tradeRoute, tradeRouteId }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  deleteTradeRoute(tradeRouteId: number , callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/trade/deleteTradeRoute`, { galaxyId: this.galaxyId, tradeRouteId: tradeRouteId }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  loadTradeRoute(tradeRouteId: number, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/trade/loadTradeRoute`, { galaxyId: this.galaxyId, tradeRouteId: tradeRouteId }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  loadAllTradeRoutes(callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.get<DatabaseResult>(`${environment.apiUrl}/trade/getTradeRouteList?galaxyId=${this.galaxyId}`).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }

  executeTradeRoutes(tradeRouteId: number, iterations: number, callback: Function = this.dbCallBack): Observable<DatabaseResult> {
    return this.http.post<DatabaseResult>(`${environment.apiUrl}/trade/executeTradeRoutes`, { galaxyId: this.galaxyId, tradeRouteId, iterations }).pipe(take(1), tap((res: DatabaseResult) => { callback(res); }));
  }
}
