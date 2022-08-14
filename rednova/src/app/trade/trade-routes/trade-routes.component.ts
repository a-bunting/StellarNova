import { stripGeneratedFileSuffix } from '@angular/compiler/src/aot/util';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Validators } from '@angular/forms';
import { Observable, Subscription, take, tap } from 'rxjs';
import { SectorData } from '../../game/game.component';
import { GameService, SectorLog, SectorLogPlanet } from '../../services/game.service';
import { DatabaseResult } from '../../services/interfaces';

export interface TradeRoute {
  name: string,
  cost: number,
  stages: TradeAction[]
}

export interface TradeAction { id: number, action: '' | 'buy' | 'sell' | 'move', cost: number, quantity?: number, planetId?: number, destination?: number, moveType?: 'warp' | 'real', planetOptions?: { name: string, id: number }[], sectorOptions?: number[], goodsType?: number, error?: boolean }
export interface TradeRouteDisplay { id: number, name: string };

@Component({
  selector: 'app-trade-routes',
  templateUrl: './trade-routes.component.html',
  styleUrls: ['./trade-routes.component.scss']
})
export class TradeRoutesComponent implements OnInit, OnDestroy, OnChanges {

  savedRoute: boolean = false;

  @Input() tradeRouteId: number;

  tradeRoute: TradeRoute = {
    name: 'new route',
    cost: 0,
    stages: [

    ]
  }

  sectorData: SectorData;
  subscriptions: Subscription[] = [];

  makeNewRoute(): void {
    this.tradeRouteId = undefined;
    this.savedRoute = false;
    this.tradeRoute = { name: 'new route', cost: 0, stages: [ ] }
  }

  constructor(
    private gameService: GameService
  ) {
    const sectorSubscription: Subscription = this.gameService.sectorData.subscribe({
      next: (data: SectorData) => {
        if(data) {
          this.sectorData = data;
        }
      },
      error: (err: any) => { console.log(`Err: ${err}`)},
      complete: () => { }
    });

    this.subscriptions.push(...[sectorSubscription]);
  }

  displayTraderoute(): void {
    console.log(this.tradeRoute);
  }

  ngOnInit(): void {
    // if a routeid is passed then load it
    if(this.tradeRouteId) {
      this.loadRoute(this.tradeRouteId)
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // if the route id input has changed then reload the new component.
    if(changes['tradeRouteId'].currentValue !== changes['tradeRouteId'].previousValue && !isNaN(changes['tradeRouteId'].currentValue)) {
        this.loadRoute(changes['tradeRouteId'].currentValue);
      }
  }

  ngOnDestroy(): void {
      this.subscriptions.forEach((a: Subscription) => a.unsubscribe());
  }

  changeStageAction(stageId: number, changeTo: Event): void {

    const select: any = changeTo as any;
    let newTrade: TradeAction;
    let planets: { name: string, id: number }[] = [];

    switch(select.target.value) {
      case 'move':
       newTrade = { id: stageId, action: 'move', destination: -1, cost: 0, moveType: 'warp', sectorOptions: this.getStoredSectorData() }; break;
      case 'buy':
        planets = this.getPlanetsAtStage(stageId);
        newTrade = { id: stageId, action: 'buy', cost: 1, goodsType: 1, quantity: 0, planetId: planets.length > 0 ? +planets[0].id : -1, planetOptions: planets }; break;
        case 'sell':
        planets = this.getPlanetsAtStage(stageId);
        newTrade = { id: stageId, action: 'sell', cost: 1, goodsType: 2, quantity: 0, planetId: planets.length > 0 ? +planets[0].id : -1, planetOptions: planets }; break;
      default:
       newTrade = { id: stageId, action: '', cost: 0 }; break;
      }

      this.tradeRoute.stages[stageId] = newTrade;
      this.calculateTotalCost();
      this.validRoute();
      this.compareRoutes();
  }

  calculateTotalCost(): void {
    let totalCost: number = 0;
    this.tradeRoute.stages.map((a: TradeAction) => totalCost += a.cost);
    this.tradeRoute.cost = totalCost;
  }

  addStage(position: number): void {
    const newStage: TradeAction = { id: this.tradeRoute.stages.length + 1, action: '', cost: 0 };
    this.tradeRoute.stages.splice(position + 1, 0, newStage);
    // reorder the id's
    this.tradeRoute.stages.forEach((a: TradeAction, i: number) => a.id = i );
  }

  getPlanetsAtStage(stageId: number): { name: string, id: number }[] {
    let currentSector: number = this.gameService.sectorId;

    for(let i = 0 ; i < stageId ; i++) {
      if(this.tradeRoute.stages[i].action === 'move') {
        currentSector = this.tradeRoute.stages[i].destination;
      }
    }

    const planets: { name: string, id: number }[] = this.gameService.getVisitedLogSector(currentSector).map((a: SectorLogPlanet) => { return { name: a.name, id: +a.id }} );
    return planets;
  }

  getStoredSectorData(): number[] {
    const ids: number[] = this.gameService.getVisitedLog().map((a: SectorLog) => { return a.sectorid });
    return ids;
  }

  setStageDestination(stage: number, destination: any, destinationInput?: number): void {
    // use of any, bad...
    const dest: number = destinationInput ? destinationInput : +destination.target.value;
    this.tradeRoute.stages[stage].destination = dest;

    this.setMoveCost(stage);

    // rejig the planet options for anything coming after this...
    for(let i = stage + 1 ; i < this.tradeRoute.stages.length ; i++) {
      const route: TradeAction = this.tradeRoute.stages[i];

      // if the next stage is amove which is not the same location then break;
      if(route.action !== 'move') {
        route.planetOptions = this.getPlanetsAtStage(i);
        route.planetId = route.planetOptions.length > 0 ? +route.planetOptions[0].id : -1;
      } else {
        if(route.destination !== dest) {
          break;
        }
      }
    }

    this.calculateTotalCost();
    this.validRoute();
    this.compareRoutes();
  }

  deleteStage(id: number): void {
    this.tradeRoute.stages.splice(id, 1);
    this.calculateTotalCost();
    this.compareRoutes();
  }

  setCurrentSector(stage: number): void {
    this.tradeRoute.stages[stage].destination = this.gameService.sectorId;
    this.setMoveCost(stage);
  }

  setMaxQuantity(id: number): void {
    this.tradeRoute.stages[id].quantity = -1;
    this.compareRoutes();
  }

  updateRouteName(input: any): void {
    const routeName: string = input.target.value;
    this.tradeRoute.name = routeName;
    this.compareRoutes();
  }


  setTravelMethod(stage: number, method: any): void {
    const travel: 'warp' | 'real' = method.target.value;
    this.tradeRoute.stages[stage].moveType = travel;
    this.setMoveCost(stage);
  }

  sublightCalculation: number;

  setMoveCost(stage: number): void {
    // first clear any existing timeouts...
    clearInterval(this.sublightCalculation);
    // if the sector is th same as the current sector then its 0 cost...
    if(this.gameService.sectorId === this.tradeRoute.stages[stage].destination) {
      this.tradeRoute.stages[stage].cost = 0;
      this.calculateTotalCost();
      this.compareRoutes();
      return;
    }

    if(this.tradeRoute.stages[stage].moveType === 'warp') {
      this.tradeRoute.stages[stage].cost = 1;
      this.calculateTotalCost();
      this.compareRoutes();
      return;
    }

    // start a new calculation otherwise as its realspace, so needs server input......
    this.sublightCalculation = window.setTimeout(() => {
      this.calculateSublightTurnCost(this.tradeRoute.stages[stage].destination).subscribe({
        next: (res: DatabaseResult) => {
          this.tradeRoute.stages[stage].cost = res.data.distance;
          this.calculateTotalCost();
          this.compareRoutes();
        }
      })
    }, 1000); /// 1s interval in case they re just clicking through sectors...
  }

  setGoodsType(stage: number, method: any): void {
    const goods: number = method.target.value;
    this.tradeRoute.stages[stage].goodsType = goods;
    this.compareRoutes();
  }

  setPlanetBuySell(stage: number, method: any): void {
    const planetid: number = +method.target.value;
    this.tradeRoute.stages[stage].planetId = planetid;
    this.compareRoutes();
  }

  setBuySellQuantity(stage: number, method: any): void {
    const quantity: number = +method.target.value;
    this.tradeRoute.stages[stage].quantity = quantity;
    this.validRoute();
    this.compareRoutes();
  }

  /**
   * Use to calculate the distance to a realspace sector...
   * @param sector
   * @returns
   */
  calculateSublightTurnCost(sector: number): Observable<DatabaseResult> {
    // if the number is outside the range, make it the min or max...
    if(sector > this.sectorData.server.sectors) sector = this.sectorData.server.sectors;
    if(sector < 1) sector = 1;

    // get the distance calculation...
    return this.gameService.getDistanceCalculation(this.gameService.galaxyId, this.sectorData.system.sectorid, sector, this.sectorData.ship.engines).pipe(take(1));
  }

  /**
   * Checks the validity of a trade route.
   * @param tradeRoute
   * @returns
   */
  validRoute(): boolean {
    const tradeRoute: TradeRoute = this.tradeRoute;
    this.routeIsValid = false;

    // now check the stages are all working...
    for(let i = 0 ; i < this.tradeRoute.stages.length ; i++) {
      const stage: TradeAction = this.tradeRoute.stages[i];
      // nothing is free!
      if(stage.cost === 0 || ['move','buy','sell'].findIndex((a:string)=>stage.action===a) === -1) { console.log(`e1`); stage.error = true; return false; }

      switch(stage.action) {
        case 'move':
          if(!stage.destination || stage.moveType !== ('warp' || 'real')) { console.log(`w2`); stage.error = true; return false; }
          break;
        case 'buy' || 'sell':
          if(stage.goodsType > 4 || !stage.planetId || isNaN(stage.quantity)) { console.log(`e3`); stage.error = true; return false; }
          break;
      }

      stage.error = false;
    }

    // all routes must have a name, stages, and some cost associated with them.
    if(!tradeRoute.name || tradeRoute.stages.length === 0 || tradeRoute.cost === 0) return false;

    this.routeIsValid = true;
    return true;
  }

  compareRoutes(): void {
    const currentRoute: string = JSON.stringify(this.tradeRoute);
    this.changesMade = currentRoute !== this.comparisonSavedRoute;
    console.log(this.changesMade);
  }

  comparisonSavedRoute: string;
  changesMade: boolean = false;
  routeIsValid: boolean = false;

  /**
   * Save the route
   * @returns
   */
  saveRoute(): void {
    // check if the route is valid and if not return...
    if(!this.validRoute) return;

    this.gameService.saveTradeRoute(this.tradeRoute, this.tradeRouteId).subscribe({
      next: (result: DatabaseResult) => {
        if(result.data.id) {
          this.comparisonSavedRoute = JSON.stringify(this.tradeRoute);
          this.changesMade = false;
          this.savedRoute = true;
          this.tradeRouteId = result.data.id;
          this.gameService.addOrUpdateTradeRoute({ id: result.data.id, name: this.tradeRoute.name })
        }
      },
      error: (err: any) => { console.log(`Error: ${err.error}`)},
      complete: () => { }
    })
  }

  /**
   * Load a route...
   * @param tradeRouteId
   */
  loadRoute(tradeRouteId: number): void {
    this.gameService.loadTradeRoute(tradeRouteId).subscribe({
      next: (result: DatabaseResult) => {
        if(result) {
          this.tradeRoute = result.data.traderoute,
          this.comparisonSavedRoute = JSON.stringify(this.tradeRoute);
          this.tradeRouteId = result.data.traderouteid;
          this.savedRoute = true;
          this.changesMade = false;

          for(let i = 0 ; i < this.tradeRoute.stages.length ; i++) {
            if(this.tradeRoute.stages[i].action === 'move') {
              this.tradeRoute.stages[i].sectorOptions = this.getStoredSectorData();
            } else {
              this.tradeRoute.stages[i].planetOptions = this.getPlanetsAtStage(i);
            }
          }

          this.calculateTotalCost();
          console.log(this.tradeRoute);
        }
      },
      error: (err: any) => { console.log(`Error: ${err}`)},
      complete: () => { }
    })
  }

  deleteRoute(tradeRouteId: number): void {
    this.gameService.deleteTradeRoute(tradeRouteId).subscribe({
      next: (result: DatabaseResult) => {
        if(result) {
          if(!result.error) {
            this.gameService.removeTradeRouteFromList(tradeRouteId);
            this.makeNewRoute();
            this.gameService.clearLoadedComponent();
          }
        }
      },
      error: (err: any) => { console.log(`Error: ${err.error}`)},
      complete: () => { }
    })
  }
}
