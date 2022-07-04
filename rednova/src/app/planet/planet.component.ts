import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameService } from '../services/game.service';
import { DatabaseResult } from '../services/interfaces';

export interface PlanetData {
   name: string; distance: number; solarRadiation: number; population: number; fields: number;
   data: PlanetResource[];
}

export interface PlanetResource {
  id: string; name: string, current: number, type: string; price: { sell: number, buy: number } | undefined
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

  constructor(
    private gameService: GameService
  ) {
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
        // sort by resource...
        this.planetData.data.sort((a: PlanetResource, b: PlanetResource) =>
          {
            if(a.type === b.type) {
              return a.type.charAt(0) < b.type.charAt(0) ? -1 : a.type.charAt(0) > b.type.charAt(0) ? 1 : 0;
            }
            return a.type < b.type ? -1 : a.type > b.type ? 1 : 0;
          })
      },
      error: (error) => { console.log(`Error retrieving planet: ${error}`)},
      complete: () => {}
    })
  }

  build(goodId: string, quantity: number): void {

  }

  getGoodsList(): PlanetResource[] { return this.planetData ? this.planetData.data.filter((a: PlanetResource) => a.type === 'good') : []; }
  getBuildingList(): PlanetResource[] { return this.planetData ? this.planetData.data.filter((a: PlanetResource) => a.type === 'building') : []; }


  buyGoods(id: string, name: string, value: number): void {
    this.gameService.buyResources(this.gameService.galaxyId, this.planetId, { id, quantity: value }).subscribe({
      next: (data) => {
        if(data.error === false) {
          // it was successful so add the goods to your stash.
          this.modifyGoodsValue(id, -data.data.quantity);
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
    this.gameService.sellResources(this.gameService.galaxyId, this.planetId, { id, quantity: value }).subscribe({
      next: (data) => {
        if(data.error === false) {
          // it was successful so add the goods to your stash.
          this.modifyGoodsValue(id, data.data.quantity);
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

  intervals: number[] = [];

  modifyGoodsValue(goodsId: string, change: number): void {
    // the quantity has changed so run the function...
    const good: PlanetResource = this.planetData.data.find((a: PlanetResource) => a.id === goodsId);
    const newValue: number = good.current + change;
    // timing constants...
    const timeForVisualUpdate: number = 1;
    const iterationsForVisualUpdate: number = 100;
    let iterations: number = 0;

    // the interval itself...
    const newInterval: number = window.setInterval(() => {
      good.current += change / iterationsForVisualUpdate;
      iterations++;
      if(iterations === iterationsForVisualUpdate)  clearInterval(newInterval);
    }, (timeForVisualUpdate * 1000) / iterationsForVisualUpdate)

    this.intervals.push(newInterval);
  }
}
