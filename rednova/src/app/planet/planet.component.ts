import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameService } from '../services/game.service';
import { DatabaseResult } from '../services/interfaces';

export interface PlanetData {
   name: string; planetindex: number; distance: number; solarRadiation: number; population: number; fields: number;
   goods: PlanetResource[]; buildings: Building[];
   owner: { currentUser: boolean; username: string },
   trading: number;
}

export interface PlanetResource {
  id: string; name: string, quantity: number, price: { sell: number, buy: number } | undefined
}

export interface Building {
  id: string; name: string, quantity: number, price: number;
}

@Component({
  selector: 'app-planet',
  templateUrl: './planet.component.html',
  styleUrls: ['./planet.component.scss']
})
export class PlanetComponent implements OnInit, OnDestroy, OnChanges {

  @Input() planetId: number;

  planetDataSubscription: Subscription;

  planetData: PlanetData;

  buildBuyMode: boolean = true;

  constructor(
    private gameService: GameService
  ) {
    console.log('loaded');
  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['planetId']) this.loadPlanet(changes['planetId'].currentValue);
  }

  ngOnDestroy(): void {
      this.planetDataSubscription.unsubscribe();
  }

  planetLoading: boolean = false;

  loadPlanet(planetId: number): void {
    this.planetLoading = true;

    // get the planet data...
    this.planetDataSubscription = this.gameService.getPlanetData(this.gameService.galaxyId, this.planetId).subscribe({
      next: (result: DatabaseResult) => {
        this.planetData = result.data;
        this.processBuildingsArray(this.planetData.buildings);
        // sort by resource...
      },
      error: (error) => { console.log(`Error retrieving planet: ${error}`)},
      complete: () => {}
    })
  }

  buildingsData: { id: string, name: string, price: number, quantity: number, icon: string}[] = [];

  processBuildingsArray(data: Building[]): void {
    this.buildingsData = [];
    // iterate over the buildings and replace thge current buildingsdata array
    for(let i = 0 ; i < data.length ; i++) {
      let building: Building = data[i];
      let icon: string = this.gameService.goods.find((a: { id: number, name: string, icon: string }) => a.id === +building.id).icon;
      this.buildingsData.push({ ...building, icon: icon})
    }
  }

  buyGoods(id: string, name: string, value: number): void {
    this.gameService.buyResources(this.gameService.galaxyId, this.planetId, this.gameService.sectorData.value.system.sectorid, { id, quantity: value }).subscribe({
      next: (data) => {
        if(data.error === false) {
          // it was successful so add the goods to your stash.
          this.modifyGoodsValue(id, -data.data.quantity);
          this.gameService.modifyShipCash(-data.data.total);
          this.gameService.addGoodsToShip(id, name, data.data.quantity);
          this.gameService.consoleLogger( `You purchased ${data.data.quantity} of ${name} from ${this.planetData.name}`, 'buyFromPlanet' )
        } else {
          this.gameService.consoleLogger( `Your purchase of ${name} from ${this.planetData.name} failed, as ${data.message}`, 'buyFromPlanetFail' )
        }
      },
      error: (error) => { console.log(error); },
      complete: () => {}
    })
  }

  sellGoods(id: string, name: string, value: number): void {
    this.gameService.sellResources(this.gameService.galaxyId, this.planetId, this.gameService.sectorData.value.system.sectorid, { id, quantity: value }).subscribe({
      next: (data) => {
        if(data.error === false) {
          // it was successful so add the goods to your stash.
          this.modifyGoodsValue(id, data.data.quantity);
          this.gameService.modifyShipCash(+data.data.total);
          this.gameService.addGoodsToShip(id, name, -data.data.quantity);
          this.gameService.consoleLogger( `You sold ${data.data.quantity} of ${name} to ${this.planetData.name}`, 'sellToPlanet' )
        } else {
          this.gameService.consoleLogger( `Your sale of ${name} to ${this.planetData.name} failed, as ${data.message}`, 'sellToPlanetFail' )
        }
      },
      error: (error) => { console.log(error); },
      complete: () => {}
    })
  }

  build(id: string, quantity: number): void {
    // get the building info.
    const building: Building = this.planetData.buildings.find((a: Building) => a.id === id);
    // build or sell
    if(this.buildBuyMode) {
      this.buildBuilding(building, id, quantity);
    } else {
      this.sellBuilding(building, id, quantity);
    }
  }

  buildBuilding(building: Building, id: string, quantity: number): void {
    // submit build order...
    this.gameService.buildBuilding(this.planetData.planetindex, { id: +id, quantity }).subscribe({
      next: (data: DatabaseResult) => {
        if(data.error === false) {
          this.modifyValue(building, 'quantity', +data.data.quantity);
          this.gameService.modifyShipCash(-data.data.total);

          // and log to console
          if(quantity !== data.data.quantity) {
            this.gameService.consoleLogger( `Your purchase of ${quantity} ${quantity > 1 ? building.name : building.name.slice(0, -1)} was unsuccessful, but ${data.data.quantity} were built instead.`, 'buildOnPlanetSuccess' )
          } else {
            this.gameService.consoleLogger( `Your purchase of ${quantity} ${quantity > 1 ? building.name : building.name.slice(0, -1)} was successful.`, 'buildOnPlanetSuccess' )
          }
        } else {
          this.gameService.consoleLogger( `Your purchase of ${quantity} ${quantity > 1 ? building.name : building.name.slice(0, -1)} failed, as ${data.message}`, 'buildOnPlanetFail' )
        }
      },
      error: (e: any) => { console.log(e); },
      complete: () => {}
    })
  }

  sellBuilding(building: Building, id: string, quantity: number): void {
    // submit destropy order...
    this.gameService.destroyBuilding(this.planetData.planetindex, { id: +id, quantity }).subscribe({
      next: (data: DatabaseResult) => {
        if(data.error === false) {
          this.modifyValue(building, 'quantity', -data.data.quantity);
          this.gameService.modifyShipCash(+data.data.total);

          // and log to console
          if(quantity !== data.data.quantity) {
            this.gameService.consoleLogger( `Your destruction of ${quantity} ${quantity > 1 ? building.name : building.name.slice(0, -1)} was unsuccessful, but ${data.data.quantity} were destroyed instead.`, 'destroyOnPlanetSuccess' )
          } else {
            this.gameService.consoleLogger( `Your destruction of ${quantity} ${quantity > 1 ? building.name : building.name.slice(0, -1)} was successful.`, 'destroyOnPlanetSuccess' )
          }
        } else {
          this.gameService.consoleLogger( `Your destruction of ${quantity} ${quantity > 1 ? building.name : building.name.slice(0, -1)} failed, as ${data.message}`, 'destroyOnPlanetFail' )
        }
      },
      error: (e: any) => { console.log(e); },
      complete: () => {}
    })
  }

  toggleTrading(event: any): void {
    // not sure of the type of this event :S
    const checked: boolean = event.target.checked;

    this.gameService.updateTrading(this.planetData.planetindex, checked).subscribe({
      next: (data: DatabaseResult) => {
        if(data.error === false) {
          this.gameService.consoleLogger( `You successfully togged trading on ${this.planetData.name} to ${checked ? 'on' : 'off'}.`, 'tradeSettingsChangeSuccess' );
          // trading in the log disabled for now, maybe a talent at a later date?
          // this.gameService.toggleTradingInLog(this.planetId, checked);
        } else {
          this.gameService.consoleLogger( `You were unable to modify the trade settings for ${this.planetData.name} because ${data.message}.`, 'tradeSettingsChangeFail' )
        }
      },
      error: (e: any) => { console.log(`Error: ${e.message}`)},
      complete: () => { console.log(`closing subscription...`)}
    })

  }

  intervals: number[] = [];

  modifyGoodsValue(goodsId: string, change: number): void {
    // the quantity has changed so run the function...
    const good: PlanetResource = this.planetData.goods.find((a: PlanetResource) => a.id === goodsId);
    this.modifyValue(good, 'quantity', change);
  }

  modifyValue(good: PlanetResource | Building, key: string, change: number): void {
    // the quantity has changed so run the function...
    const newValue: number = +good[`quantity`] + change;
    // timing constants...
    const timeForVisualUpdate: number = 1;
    const iterationsForVisualUpdate: number = 100;
    let iterations: number = 0;

    // the interval itself...
    const newInterval: number = window.setInterval(() => {
      // not sure why this usually adds as a string but this works...
      good[`quantity`] = +good[`quantity`] + +(change / iterationsForVisualUpdate);
      iterations++;
      if(iterations === iterationsForVisualUpdate)  clearInterval(newInterval);
    }, (timeForVisualUpdate * 1000) / iterationsForVisualUpdate)

    this.intervals.push(newInterval);
  }

  selectBuilding(id: string): void {

  }

  getUsedFields(): number {
    if(this.planetData) {
      let totalBuildings: number = 0;
      this.planetData.buildings.map((build: Building) => totalBuildings += +build.quantity );
      return totalBuildings;
    }
    return -1;
  }

  modifyName: boolean = false;

  setNewName(): void {

  }

  modifyNameToggle(): void { this.modifyName = !this.modifyName; }
  setBuildMode(val: boolean): void { this.buildBuyMode = val; }
}
