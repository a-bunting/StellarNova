import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { subscriptionLogsToBeFn } from 'rxjs/internal/testing/TestScheduler';
import { SectorData, Ship } from '../game/game.component';
import { Coordinate2D, Coordinate3D, GameService, SectorLog, SectorLogPlanet } from '../services/game.service';
import { DatabaseResult } from '../services/interfaces';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {

  // canvas stuff
  @ViewChild('systemCanvas', { static: true }) systemCanvas: ElementRef<HTMLCanvasElement>;
  systemContext: CanvasRenderingContext2D;

  subscriptions: Subscription[] = [];
  sectorLog: SectorLog[] = [];

  shipdata: Ship;

  constructor(
    private gameService: GameService
  ) {
    // get the sector data to get the ship data...
    const sectorSub: Subscription = gameService.sectorData.subscribe((result: SectorData) => {
      if(result) {
        this.shipdata = result.ship;
        // get the saved data again and redo sizing to ensure all sectors fit.
        this.sectorLog = gameService.getVisitedLog();
        this.generateScale(this.sectorLog);
      }
    })

    this.subscriptions.push(...[sectorSub]);
  }

  ngOnInit(): void {
    this.systemContext = this.systemCanvas.nativeElement.getContext('2d');
    this.generateStarfield();
    this.generateScale(this.sectorLog);
    this.animate();
  }

  x: { min: number, max: number } = { min: 0, max: 0 };
  y: { min: number, max: number } = { min: 0, max: 0 };
  z: { min: number, max: number } = { min: 0, max: 0 };

  /**
   * Make a scale so we know how to place the stars on the grid...
   * @param sectorLog
   */
  generateScale(sectorLog: SectorLog[]): void {

    for(let i = 0 ; i < sectorLog.length ; i++) {
      let coord: { x: number, y: number, z: number } = sectorLog[i].coordinates;

      if(coord.x < this.x.min) this.x.min = coord.x;
      if(coord.x > this.x.max) this.x.max = coord.x;
      if(coord.y < this.y.min) this.y.min = coord.y;
      if(coord.y > this.y.max) this.y.max = coord.y;
      if(coord.z < this.z.min) this.z.min = coord.z;
      if(coord.z > this.z.max) this.z.max = coord.z;
    }
  }

  iteration: number = 0;

  animate(): void {
    this.drawFrame(this.systemContext, this.systemCanvas);
    this.iteration++;
    requestAnimationFrame(() => { this.animate(); });
  }

  drawFrame(ctx: CanvasRenderingContext2D, canvas: ElementRef<HTMLCanvasElement>): void {
    canvas.nativeElement.width = document.getElementById('canvas-div').offsetWidth;
    canvas.nativeElement.height = document.getElementById('canvas-div').offsetHeight;

    const width: number = canvas.nativeElement.width;
    const height: number = canvas.nativeElement.height;

    // black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // starfield first...
    for(let i = 0 ; i < this.starField.length ; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.starField[i].alpha + Math.cos(this.iteration * this.twinkleSpeed + i * 30) * (this.starField[i].alpha / 3)})`;
      ctx.beginPath();
      ctx.arc((this.starField[i].x / 100) * width, (this.starField[i].y / 100) * height, this.starField[i].size, 0, 2 * Math.PI);
      ctx.fill();
    }

    // now the systems
    let widthScale: number = Math.abs(this.x.min) + Math.abs(this.x.max);
    let heightScale: number = Math.abs(this.y.min) + Math.abs(this.y.max);
    let depthScale: number = Math.abs(this.z.min) + Math.abs(this.z.max);

    // gradient and star colours
    let radius: number = 5;

    // hover boolean to see if anything is hovered
    let hover: boolean = false;

    for(let i = 0 ; i < this.sectorLog.length ; i++) {
      let x: number = 10 + (width - 20) * ((this.sectorLog[i].coordinates.x + Math.abs(this.x.min)) / widthScale);
      let y: number = 10 + (height - 20) * ((this.sectorLog[i].coordinates.y + Math.abs(this.y.min)) / heightScale);
      let a: number = 0.25 + Math.min(((this.sectorLog[i].coordinates.z + Math.abs(this.z.min)) / depthScale), 0.75);

      // highlight any hovered planets
      const distanceToMouse: number = Math.sqrt(Math.pow(this.mouseCoordinates.x - x, 2) + Math.pow(this.mouseCoordinates.y - y, 2))

      if(distanceToMouse <= radius) {
        this.hoveredSector && this.hoveredSector.log.sectorid !== this.sectorLog[i].sectorid ? this.hoveredSectorClicked = false : this.hoveredSectorClicked = this.hoveredSectorClicked;
        this.hoveredSector = { log: this.sectorLog[i], realtimeCost: this.hoveredSector ? this.hoveredSector.realtimeCost : -1, warp: this.hoveredSector ? this.hoveredSector.warp : false };

        hover = true;
        ctx.strokeStyle = `white`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius + 1.5, 0, 2 * Math.PI);
        ctx.stroke();

        // sector name
        ctx.fillStyle = 'white';
        ctx.textAlign = x > width / 2 ? 'right' : 'left';
        ctx.fillText(`Sector ${this.sectorLog[i].sectorid}`, x > width / 2 ? x - 10 : x + 10, y > height - 30 ? y - 20 : y );
        ctx.fillText(`${this.sectorLog[i].planets.length} planets`, x > width / 2 ? x - 10 : x + 10,  y > height - 30 ? y - 5 : y + 15);

      } else {
        // sector name truncated
        ctx.fillStyle = 'white';
        ctx.textAlign = x > width / 2 ? 'right' : 'left';
        ctx.fillText(`${this.sectorLog[i].sectorid}`, x > width / 2 ? x - 10 : x + 10, y > height - 30 ? y - 20 : y );
      }

      if(this.hoveredSector) {

        if(this.sectorLog[i].sectorid === this.hoveredSector.log.sectorid) {
          // this sector is clicked...
          ctx.strokeStyle = `white`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, radius + 1.5, 0, 2 * Math.PI);
          ctx.stroke();

          for(let o = 0 ; o < this.hoveredSector.log.warp.length ; o++) {

            const toSector: SectorLog = this.sectorLog.find((a: SectorLog) => a.sectorid === this.hoveredSector.log.warp[o]);

            if(toSector) {
              let newx: number = 10 + (width - 20) * ((toSector.coordinates.x + Math.abs(this.x.min)) / widthScale);
              let newy: number = 10 + (height - 20) * ((toSector.coordinates.y + Math.abs(this.y.min)) / heightScale);
              let newa: number = 0.25 + Math.min(((toSector.coordinates.z + Math.abs(this.z.min)) / depthScale), 0.75);

              var gradient: CanvasGradient = ctx.createLinearGradient(x, y, newx, newy);
              gradient.addColorStop(0, `rgba(255, 240, 0, ${a} )`);
              gradient.addColorStop(1, `rgba(255, 240, 0, ${newa} )`);

              ctx.beginPath();
              ctx.strokeStyle = gradient;
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 6]);
              ctx.lineDashOffset = this.iteration / 5;
              ctx.moveTo(x, y);
              ctx.lineTo(newx, newy);
              ctx.stroke();
              ctx.setLineDash([0]);
            }
          }
        }


      }

      // the star
      ctx.fillStyle = `rgba(255, 240, 0, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // the gradient outside the star
      var gradient: CanvasGradient = ctx.createRadialGradient(x, y, radius, x, y, radius * 2);
      gradient.addColorStop(0, `rgba(255, 240, 0, ${a} )`);
      gradient.addColorStop(.5, `rgba(255, 240, 0, ${a} )`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    if(!hover && !this.hoveredSectorClicked) this.hoveredSector = null;

  }

  starField: { x: number, y: number, size: number, alpha: number }[]  = [];
  numberOfStars: number = 80;
  twinkleSpeed: number = 0.1;

  generateStarfield(): void {
    for(let i = 0 ; i < this.numberOfStars ; i++) {
      this.starField.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.ceil(Math.random() * 2),
        alpha: Math.random()
      })
    }
  }

  mouseCoordinates: Coordinate2D = { x: 0, y: 0 };
  hoveredSector: { log: SectorLog, realtimeCost: number, warp: boolean };
  hoveredSectorClicked: boolean = false;

  updateMouseCoordinates(move: MouseEvent): void {
    this.mouseCoordinates = { x: move.offsetX, y: move.offsetY };
  }

  systemClicked(): void {
    if(this.hoveredSector) {
      // get an estimate for the realspace move cost
      const currentSector: SectorLog = this.sectorLog.find((a: SectorLog) => a.sectorid === this.shipdata.sector);
      const turnCalculation = this.gameService.turnsCostToRealtimeMove(currentSector.coordinates, this.hoveredSector.log.coordinates, this.shipdata.engines);

      // put the estimate in the hovered object
      this.hoveredSector.realtimeCost = turnCalculation;
      this.hoveredSectorClicked = true;

      // is it a warpable route from where you are?
      this.hoveredSector.warp = currentSector.warp.findIndex((a: number) => a === this.hoveredSector.log.sectorid) !== -1;

    } else {
      this.hoveredSectorClicked = false;
    }
  }

  showAllWarpRoutes: boolean = false;

  toggleAllWarpRoutes(): void {
    this.showAllWarpRoutes = !this.showAllWarpRoutes;
  }

  moveError: { message: string, turnsRequired: number, turnsAvailable: number };

  warpTo(destination: number): void {
    const warpSub: Subscription = this.gameService.warpToSector(this.gameService.galaxyId, destination).subscribe({
      next: (result: DatabaseResult) => { this.gameService.loadSectorData(this.gameService.galaxyId); warpSub.unsubscribe(); },
      error: (error) => { this.moveError = { message: error.error.message, turnsRequired: error.error.data.required, turnsAvailable: error.error.data.current }; warpSub.unsubscribe(); },
      complete: () => { warpSub.unsubscribe(); }
    })
  }

  moveTo(destination: number): void {
    // call the move to sector...
    const sub: Subscription = this.gameService.moveToSector(this.gameService.galaxyId, destination, this.shipdata.engines).subscribe({
      next: (result: DatabaseResult) => { this.gameService.loadSectorData(this.gameService.galaxyId); sub.unsubscribe(); },
      error: (error) => { this.moveError = { message: error.error.message, turnsRequired: error.error.data.required, turnsAvailable: error.error.data.current }; sub.unsubscribe(); },
      complete: () => { sub.unsubscribe(); }
    })
  }

}
