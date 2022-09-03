import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, timestamp } from 'rxjs';
import { subscriptionLogsToBeFn } from 'rxjs/internal/testing/TestScheduler';
import { SectorData } from '../game/game.component';
import { GameService } from '../services/game.service';

interface DisplayPlanet {
  id: number, distance: number, angle: number, size: number, x: number, y: number, name: string, owner: string, moons: { x: number, y: number, angle: number }[]
}

interface StarColourScheme {
  p: { r: number, g: number, b: number }, s: { r: number, g: number, b: number }, j: { r: number, g: number, b: number }
}

@Component({
  selector: 'app-system',
  templateUrl: './system.component.html',
  styleUrls: ['./system.component.scss']
})
export class SystemComponent implements OnInit, OnDestroy {

  sectorData: SectorData;
  subscriptions: Subscription[] = [];

  starField: { x: number, y: number, size: number, alpha: number }[]  = [];

  moonsize: number = 5;

  // canvas stuff
  @ViewChild('sectorCanvas', { static: true }) sectorCanvas: ElementRef<HTMLCanvasElement>;
  mainCanvas: HTMLCanvasElement;
  sectorContext: CanvasRenderingContext2D;

  constructor(
    private gameService: GameService
  ){
    // get the sector subscription
    const systemSubscription: Subscription = this.gameService.sectorData.subscribe({
      next: (sectorData: SectorData) => {
        if(sectorData) {
          if(this.sectorData) {
            // if we already have data relating to a secotr, check if its changed, and if it has redisplay, else ignore.
            if(JSON.stringify(this.sectorData.system) !== JSON.stringify(sectorData.system)) {
              this.newSectorLoaded = true;
              this.loadingNewSector = false;
              this.loadingSectorPause = false;
              this.generateSector(sectorData);
            }
          }
          else {
            this.generateSector(sectorData);
            this.newSectorLoaded = true;
            this.loadingSectorPause = false;
            this.loadingNewSector = false;
          }
        }
      },
      error: (err: any) => { console.log(`Error: ${err}`)},
      complete: () => {}
    })

    // check for when a new secot ris being loaded.
    const loadingSubscription: Subscription = this.gameService.loadingNewSector.subscribe({
      next: (newLoad: boolean) => {
        if(newLoad === true) this.loadingNewSector = true;
      }
    })

    this.subscriptions.push(...[systemSubscription, loadingSubscription]);
  }

  ngOnInit(): void {
    // set up the canvas
    this.mainCanvas = this.sectorCanvas.nativeElement as HTMLCanvasElement;
    this.sectorContext = this.mainCanvas.getContext('2d');
    this.generateStarfield();
    this.drawFrame(this.sectorContext, this.mainCanvas, 0);
  }

  starScale: number;

  generateSector(sectorData: SectorData): void {
    this.sectorData = sectorData;

    // set the planets array
    this.planets = [];

    // cancel any running animations.
    cancelAnimationFrame(this.requestAnimationFrame);

    // star scale - star should be a max of 1/3 of the canvas...
    this.starScale = this.sectorData.system.starSize > 70 ? 1 - Math.min(0.33, Math.abs(70-this.sectorData.system.starSize) / 30) : 1;

    // system scale...
    if(sectorData.system.planets.length > 0) {
      const maxHeight: number = this.mainCanvas.height / 2;
      const maxDistance: number = 0.5 * sectorData.system.starSize + ((sectorData.system.planets.length - 1) * 40) + Math.max(Math.min(1.5 * sectorData.system.starSize), Math.min(150, sectorData.system.planets[sectorData.system.planets.length - 1].distance * 50));

      const scale: number = maxDistance < maxHeight ? 1 : ((maxDistance / maxHeight) * 0.85);

      for(let i = 0 ; i < sectorData.system.planets.length ; i++) {

        // const distance: number =  0.5 * sectorData.system.starSize + (i * 65) + Math.max(Math.min(1.5 * sectorData.system.starSize), Math.min(150, sectorData.system.planets[i].distance * 50));
        const distance: number =  (0.5 * sectorData.system.starSize + (i * 65) + Math.max(Math.min(1.5 * sectorData.system.starSize), Math.min(150, sectorData.system.planets[i].distance * 50))) * scale;
        const size: number = (Math.floor(Math.random() * 3) + 1) * 10;
        const angle: number = Math.floor(Math.random() * 2 * Math.PI);
        const planetx: number = this.mainCanvas.width / 2 + (distance * Math.cos(angle));
        const planety: number = this.mainCanvas.height / 2 + (distance * Math.sin(angle));

        let moons: { x: number, y: number, angle: number }[] = [];

        for(let o = 0 ; o < sectorData.system.planets[i].moons ; o++) {
          const moonAngle: number = Math.floor(Math.random() * 2 * Math.PI);
          const x: number = planetx + ((size + (2 * this.moonsize) + (o * this.moonsize * 3)) * Math.cos(moonAngle));
          const y: number = planety + ((size + (2 * this.moonsize) + (o * this.moonsize * 3)) * Math.sin(moonAngle));
          moons.push({ x, y, angle: moonAngle});
        }

        const newPlanet: DisplayPlanet = {
          id: sectorData.system.planets[i].id,
          distance: distance,
          angle: angle,
          size: size, // minimum planet size of 21
          x: planetx,
          y: planety,
          name: sectorData.system.planets[i].name,
          owner: sectorData.system.planets[i].ownerName ?? 'Unclaimed',
          moons: moons
        }

        this.planets.push(newPlanet);
      }
    }

    // get the color scheme
    this.starColourScheme = this.getPlanetColours(this.sectorData.system.starPower, this.sectorData.system.starSize);
    // generate rays and then animate
    this.generateRays();
    this.animate();

  }

  planets: DisplayPlanet[] = []
  numberOfStars: number = 320;

  generateStarfield(): void {
    for(let i = 0 ; i < this.numberOfStars ; i++) {
      this.starField.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.ceil(Math.random() * 2),
        alpha: Math.random()
      })
    }
    // generate the starfield...
    this.generateWarpEffect();
  }

  warpEffectIn: HTMLCanvasElement[] = [];
  warpEffectOut: HTMLCanvasElement[] = [];
  warpRadialGradient: HTMLCanvasElement;

  /**
   * Prerenders the warp effect for a starfield.
   */
  generateWarpEffect(): void {
    let width: number = document.getElementById('canvas').offsetWidth;
    let height: number = document.getElementById('canvas').offsetHeight;

    // radial gradient to make the center transparent
    let canvas: [HTMLCanvasElement, CanvasRenderingContext2D] = this.newCanvasGenerator(width, height);
    let gradient: CanvasGradient = canvas[1].createRadialGradient(width / 2, height / 2, width * 0.05, width / 2, height / 2, width * 0.3);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    // gradient.addColorStop(.5, 'rgba(0,0,0,.5)');
    gradient.addColorStop(1, 'transparent');

    canvas[1].fillStyle = gradient;
    canvas[1].fillRect(0, 0, width, height);

    this.warpRadialGradient = canvas[0];

    for(let i = 0 ; i < this.warpIterations ; i++) {
      let canvas: [HTMLCanvasElement, CanvasRenderingContext2D] = this.newCanvasGenerator(width, height);
      this.drawStarField(canvas[1], canvas[0], i);
      this.warpEffectIn.push(canvas[0]);
    }

    for(let i = this.warpIterations ; i >= 0 ; i--) {
      let canvas: [HTMLCanvasElement, CanvasRenderingContext2D] = this.newCanvasGenerator(width, height);
      this.drawStarField(canvas[1], canvas[0], i);
      this.warpEffectOut.push(canvas[0]);
    }
  }

  newCanvasGenerator(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    let newCanvas: HTMLCanvasElement = document.createElement('canvas');
    let newContext: CanvasRenderingContext2D = newCanvas.getContext('2d');
    newCanvas.width = width;
    newCanvas.height = height;
    return [newCanvas, newContext];
  }

  generateRays(): void {
    this.rays = [];

    // get the stars data
    const colorScheme: StarColourScheme = this.getPlanetColours(this.sectorData.system.starPower, this.sectorData.system.starSize);

    // create the suns rays..
    const rayLength: { min: number, max: number } = { min: 20, max: 200 };
    const rayWidth: { min: number, max: number } = { min: 3, max: 5 };
    const spacePerRay: number = this.sectorData.system.starRayQuantity / 360;

    for(let i = 0 ; i < this.sectorData.system.starRayQuantity ; i++) {

      const PorS: { r: number, g: number, b: number } = colorScheme[Math.random() < .85 ? 's' : 'p'];

      const ray: { a: number, l: number, w: number, c: { r: number, g: number, b: number } } = {
        a: spacePerRay * i,
        l: rayLength.min + (Math.random() * (rayLength.max - rayLength.min)),
        w: rayWidth.min + (Math.random() * (rayWidth.max - rayWidth.min)),
        c: PorS
      }

      this.rays.push(ray);
    }
  }

  ngOnDestroy(): void {
    // get rid of the subscriptions
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
  }

  timeRunning: number = 0;
  timeLast: number = 0;
  iteration: number = 0;

  lastFrame: number = 0;
  currentFrame: number = 0;

  requestAnimationFrame: number;

  animate(): void {
    this.lastFrame = ((performance.now()) - this.timeLast) / 1000;
    this.timeRunning  += this.lastFrame;

    this.drawFrame(this.sectorContext, this.mainCanvas, this.lastFrame);
    this.calculate(this.lastFrame);

    this.iteration++;

    this.timeLast = performance.now();
    this.requestAnimationFrame = requestAnimationFrame(() => { this.animate(); });
  }

  angleBaseSpeed: number = 0.002;

  calculate(timeSinceLastIteration?: number): void {
    // increase the planets angle...
    for(let i = 0 ; i < this.planets.length ; i++) {
      this.planets[i].angle += this.angleBaseSpeed * (150 / this.planets[i].distance);
      this.planets[i].x = this.mainCanvas.width / 2 + (this.planets[i].distance * Math.cos(this.planets[i].angle)),
      this.planets[i].y = this.mainCanvas.height / 2 + (this.planets[i].distance * Math.sin(this.planets[i].angle))

      for(let o = 0 ; o < this.planets[i].moons.length ; o++) {
        this.planets[i].moons[o].angle += 0.04 * (2 / (o+1));
        this.planets[i].moons[o].x = this.planets[i].x + ((this.planets[i].size + (2 * this.moonsize) + (o * this.moonsize * 3)) * Math.cos(this.planets[i].moons[o].angle));
        this.planets[i].moons[o].y = this.planets[i].y + ((this.planets[i].size + (2 * this.moonsize) + (o * this.moonsize * 3)) * Math.sin(this.planets[i].moons[o].angle));
      }
    }
  }

  scale: number = 1;
  loadingNewSector: boolean = false;
  loadingSectorPause: boolean = false;
  newSectorLoaded: boolean = false;

  /**
   * Initiates a sector move graphics change - the zooming in!
   */
  initiateSectorMove(): void {
    this.loadingNewSector = true;
  }

  rays: { a: number, l: number, w: number, c: { r: number, g: number, b: number } }[] = [];
  twinkleSpeed: number = 0.1;

  starColourScheme: StarColourScheme;

  drawFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, timeSinceLastFrame: number): void {
    // reset the scene
    canvas.width = document.getElementById('canvas').offsetWidth;
    canvas.height = document.getElementById('canvas').offsetHeight;

    // starfield first...
    if(!this.loadingNewSector && !this.newSectorLoaded) this.drawStarField(ctx, canvas);
    if(this.loadingNewSector && !this.newSectorLoaded) this.drawStarfieldWarpIn(ctx, canvas, timeSinceLastFrame);
    if(!this.loadingNewSector && this.newSectorLoaded) this.drawStarfieldWarpOut(ctx, canvas, timeSinceLastFrame);

    // make a new canvas layer for the stars and planets to scale it better...
    let starsAndPlanetsCanvas: [HTMLCanvasElement, CanvasRenderingContext2D] = this.newCanvasGenerator(canvas.width, canvas.height);
    // set the scale...
    this.scale = Math.max(0, Math.min(1 - (this.timeSinceWarpSpeed / this.warpTime), 1));
    starsAndPlanetsCanvas[1].scale(this.scale, this.scale);

      // draw the rays
      this.drawStarRays(starsAndPlanetsCanvas[1], starsAndPlanetsCanvas[0], this.scale);

      // draw the star...
      this.drawStar(starsAndPlanetsCanvas[1], starsAndPlanetsCanvas[0], this.scale);

      // draw the planets
      this.drawPlanets(starsAndPlanetsCanvas[1], starsAndPlanetsCanvas[0], this.scale);

    // paste hte image back onto the main canvas
    ctx.drawImage(starsAndPlanetsCanvas[0], (canvas.width / 2) * (1 - this.scale), (canvas.height / 2) * (1 - this.scale));// );
  }

  warpTime: number = 250;
  timeSinceWarpSpeed: number = this.warpTime;
  warpIterations: number = 100;

  /**
   * Displays the warp in.
   * @param ctx
   * @param canvas
   * @param timeSinceLastFrame
   */
  drawStarfieldWarpIn(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, timeSinceLastFrame: number): void {
    this.timeSinceWarpSpeed = this.loadingSectorPause ? this.timeSinceWarpSpeed : this.timeSinceWarpSpeed + (timeSinceLastFrame * 1000);

    let index: number = this.loadingSectorPause ? this.warpEffectIn.length - 1 : Math.floor((this.warpIterations / this.warpTime) * this.timeSinceWarpSpeed);
    let alpha: number = (1 / (0.5 * this.warpTime)) * this.timeSinceWarpSpeed;//2 - (1 / (0.5 * this.warpTime)) * this.timeSinceWarpSpeed;

    if(this.timeSinceWarpSpeed >= this.warpTime) {
        index = this.warpEffectIn.length - 1;
        this.timeSinceWarpSpeed = this.warpTime;
        this.loadingSectorPause = true;
    }

    ctx.drawImage(this.warpEffectIn[index], 0, 0, this.mainCanvas.width, this.mainCanvas.height);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.drawImage(this.warpRadialGradient, 0, 0, this.mainCanvas.width, this.mainCanvas.height);
    ctx.globalAlpha = 1;
  }

  /**
   * Displays the warp out
   * @param ctx
   * @param canvas
   * @param timeSinceLastFrame
   */
  drawStarfieldWarpOut(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, timeSinceLastFrame: number): void {
    this.timeSinceWarpSpeed -= timeSinceLastFrame * 1000;

    let index: number = Math.max(0, Math.min(this.warpEffectOut.length - 1, this.warpEffectOut.length - 1 - Math.floor((this.warpIterations / this.warpTime) * this.timeSinceWarpSpeed)));

    if(this.timeSinceWarpSpeed <= 0) {
        this.newSectorLoaded = false;
        this.timeSinceWarpSpeed = 0;
        index = this.warpEffectOut.length - 1;
    }

    let alpha: number = 2 - (1 / (0.5 * this.warpTime)) * this.timeSinceWarpSpeed;

    ctx.drawImage(this.warpEffectOut[index], 0, 0, this.mainCanvas.width, this.mainCanvas.height);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.drawImage(this.warpRadialGradient, 0, 0, this.mainCanvas.width, this.mainCanvas.height);
    ctx.globalAlpha = 1;
  }

  /**
   * Draws a starfield
   * @param ctx
   * @param canvas
   * @param scale
   */
  drawStarField(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scale?: number): void {

    const width: number = canvas.width;
    const height: number = canvas.height;

    for(let i = 0 ; i < this.starField.length ; i++) {

      const x: number = (this.starField[i].x / 100) * width;
      const y: number = (this.starField[i].y / 100) * height;
      const a: number = this.starField[i].alpha + Math.cos(this.iteration * this.twinkleSpeed + i * 30) * (this.starField[i].alpha / 3);

      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, this.starField[i].size, 0, 2 * Math.PI);
      ctx.fill();

      if(scale) {
        // draw a line of %age starLength to the center of the map...
        // var gradient: CanvasGradient = ctx.createLinearGradient(x, y, width / 2 + 5, height / 2);
        // gradient.addColorStop(0, `rgba(255, 255, 255, ${a})`);
        // gradient.addColorStop(this.scale / 100, `transparent`);
        // gradient.addColorStop(1, 'transparent');

        // const distance: number = Math.sqrt(Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2));
        // const angle: number = Math.atan2(y - height / 2, x - width / 2);
        ctx.lineWidth = 5;//(scale / 100) * 5;
        // ctx.strokeStyle = gradient;

        // ctx.beginPath();
        // ctx.moveTo(x, y);
        // ctx.lineTo(width / 2, height / 2);
        // ctx.stroke();

        const pos: [number, number] = this.getMidPoint(x, y, width / 2, height / 2, scale);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
        ctx.lineTo(pos[0], pos[1]);
        ctx.stroke();
        // ctx.strokeStyle = 'transparent';
        // ctx.moveTo(pos[0], pos[1]);
        // ctx.lineTo(width / 2, height / 2);
        // ctx.fill();

      }
    }
  }

  getMidPoint(x0: number, y0: number, x1: number, y1: number, p: number): [number, number] {
    const x: number = x0 + (x1 - x0) * (p / 100);
    const y: number = y0 + (y1 - y0) * (p / 100);
    return [x, y];
  }

  drawPlanets(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scale: number = .1): void {
    const width: number = canvas.width;
    const height: number = canvas.height;

    let anyPlanetsHighlighted: boolean = false;

    // draw the planets..
    for(let i = 0 ; i < this.planets.length ; i++) {
      const planet: DisplayPlanet = this.planets[i];

      // light side and dark side - rotate so it faces the sun.
      ctx.save();
      ctx.translate(planet.x, planet.y);

      // planets looks
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.arc(0, 0, planet.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(planet.angle + this.gradientAngle);

      var gradient: CanvasGradient = ctx.createLinearGradient(0.5 * planet.size, 0.5 * planet.size, -0.5 * planet.size, -0.5 * planet.size);
      gradient.addColorStop(0, `rgba(255, 255, 255, .3)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, .5)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, planet.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // write the text on the planet
      ctx.fillStyle = 'white';
      ctx.fillText(planet.name, planet.x + planet.size + 5, planet.y);
      ctx.fillText(planet.owner, planet.x + planet.size + 5, planet.y + 10);

      const planetDistance: number = Math.sqrt( Math.pow(planet.x -  canvas.width / 2, 2) + Math.pow(planet.y -  canvas.height / 2, 2) )
      const distanceToSun: number = Math.sqrt( Math.pow(planet.x - this.mouseCoordinates.x, 2) + Math.pow(planet.y - this.mouseCoordinates.y, 2) )

      // draw the moons
      for(let o = 0 ; o < planet.moons.length ; o++) {
        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.arc(planet.moons[o].x, planet.moons[o].y, this.moonsize, 0, Math.PI * 2);
        ctx.fill();

        const moonDistance: number = Math.sqrt(Math.pow(planet.moons[o].x - canvas.width / 2, 2) + Math.pow(planet.moons[o].y - canvas.height / 2, 2));
        const maxDistance = planetDistance + (planet.size + (2 * this.moonsize) + (o * this.moonsize * 3));
        const minDistance = planetDistance - (planet.size + (2 * this.moonsize) + (o * this.moonsize * 3));
        const alpha = (moonDistance - minDistance) / (maxDistance - minDistance);

        // light side and dark side - rotate so it faces the sun.
        ctx.save();
        ctx.translate(planet.moons[o].x, planet.moons[o].y);
        ctx.rotate(planet.angle + this.gradientAngle + Math.PI);

        var gradient: CanvasGradient = ctx.createLinearGradient(0.5 * this.moonsize, 0.5 * this.moonsize, -0.5 * this.moonsize, -0.5 * this.moonsize);
        gradient.addColorStop(0, `rgba(153,153,0, ${Math.min(1-alpha, 0.3)})`);
        gradient.addColorStop(1, `rgba(${this.starColourScheme.p.r},${this.starColourScheme.p.g},${this.starColourScheme.p.b}, ${1-alpha})`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.moonsize, 0, Math.PI * 2);
        ctx.fill();

        if(distanceToSun <= planet.size) {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, this.moonsize, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      // check to see if the cursor is inside, and if so draw a white circle around it...
      if(distanceToSun <= planet.size) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.size, 0, Math.PI * 2);
        ctx.stroke();

        anyPlanetsHighlighted = true;
        this.highlightedPlanet = planet.id;
      }

    }

    if(!anyPlanetsHighlighted) this.highlightedPlanet = -1;
  }

  drawStarRays(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scale: number = 1): void {
    const width: number = canvas.width;
    const height: number = canvas.height;

    for(let i = 0 ; i < this.rays.length ; i++) {
      let ray: { a: number, l: number, w: number, c: { r: number, g: number, b: number }} = this.rays[i];
      let rayLength: number = Math.cos(this.iteration / 50 + i * this.sectorData.system.starRayDistance) * ray.l + this.sectorData.system.starSize;
      var gradient: CanvasGradient = ctx.createLinearGradient(0, 0, ray.w, rayLength);

      gradient.addColorStop(0, `rgba(${ray.c.r},${ray.c.g},${ray.c.b}, 1)`);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(ray.a);
      ctx.fillRect(0, 0, ray.w, rayLength);
      ctx.restore();
    }
  }

  drawStar(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scale: number = .5): void {
    const width: number = canvas.width;
    const height: number = canvas.height;

    ctx.beginPath();
    var gradient: CanvasGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, this.sectorData.system.starSize * (1.5 * this.starScale), canvas.width / 2, canvas.height / 2, this.sectorData.system.starSize * (3 * this.starScale));

    gradient.addColorStop(0, `rgba(${this.starColourScheme.p.r},${this.starColourScheme.p.g},${this.starColourScheme.p.b}, 1)`);
    gradient.addColorStop(.1 + (.01 * Math.cos(this.iteration / 20)), `rgba(${this.starColourScheme.s.r},${this.starColourScheme.s.g},${this.starColourScheme.s.b}, 1)`);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;

    ctx.arc(canvas.width / 2, canvas.height / 2, this.sectorData.system.starSize * (3 * this.starScale), 0, 2 * Math.PI);
    ctx.fill();

  }

  /**
   * Returns a color scheme based upon the size and power of the star
   * @param power
   * @param size
   * @returns
   */
  getPlanetColours(power: number, size: number): StarColourScheme {

    const schemeDefinitions: { name: string, scheme: StarColourScheme }[] = [
      { name: 'BlueWhite',      scheme: {p: { r: 199, g: 216, b: 255 }, s: { r: 255, g: 244, b: 243 }, j: { r: 0, g: 0, b: 0 }}},
      { name: 'DarkBlueWhite',  scheme: {p: { r: 175, g: 201, b: 255 }, s: { r: 255, g: 244, b: 243 }, j: { r: 0, g: 0, b: 0 }}},
      { name: 'Orange',         scheme: {p: { r: 255, g: 166, b: 81 }, s: { r: 255, g: 199, b: 142 }, j: { r: 255, g: 217, b: 178 }}},
      { name: 'Yellow',         scheme: {p: { r: 247, g: 223, b: 21 }, s: { r: 255, g: 199, b: 142 }, j: { r: 0, g: 0, b: 0 }}},
      { name: 'Red',            scheme: {p: { r: 219, g: 94, b: 97 }, s: { r: 255, g: 166, b: 81 }, j: { r: 0, g: 0, b: 0 }}}
    ]

    const schemes: { maxSize: number, schemes: { powerMax: number, scheme: string }[]}[] = [
      { maxSize: 40, schemes: [
        { powerMax: 1, scheme: 'Red' }, { powerMax: 10, scheme: 'Yellow' }, { powerMax: 30, scheme: 'Yellow' },         { powerMax: 100000, scheme: 'Orange' }
      ]},
      { maxSize: 50, schemes: [
        { powerMax: 1, scheme: 'Red' }, { powerMax: 10, scheme: 'Orange' }, { powerMax: 30, scheme: 'Yellow' },         { powerMax: 100000, scheme: 'DarkBlueWhite' }
      ]},
      { maxSize: 70, schemes: [
        { powerMax: 1, scheme: 'Red' }, { powerMax: 10, scheme: 'Orange' }, { powerMax: 30, scheme: 'DarkBlueWhite' },  { powerMax: 100000, scheme: 'DarkBlueWhite' }
      ]},
      { maxSize: 100000, schemes: [
        { powerMax: 1, scheme: 'Red' }, { powerMax: 10, scheme: 'Red' },    { powerMax: 30, scheme: 'Red' },            { powerMax: 100000, scheme: 'BlueWhite' }
      ]},
    ]

    for(let i = 0 ; i < schemes.length ; i++) {
      // check if this is the correct size.
      if(size < schemes[i].maxSize) {
        // find the right power...
        for(let o = 0 ; o < schemes[i].schemes.length ; o++) {
          if(power < schemes[i].schemes[o].powerMax) {
            return schemeDefinitions.find((a: { name: string, scheme: StarColourScheme }) => a.name === schemes[i].schemes[o].scheme).scheme;
          }
        }
      }
    }

    // anything else is very big and/or very powerful,so make it blue
    return schemeDefinitions[0].scheme;

  }


  gradientAngle: number = 0.76 * Math.PI;

  mouseCoordinates: { x: number, y: number } = { x: 0, y: 0 };

  updateMouseCoordinates(move: MouseEvent): void {
    this.mouseCoordinates = { x: move.offsetX, y: move.offsetY };
  }

  highlightedPlanet: number = -1;

  selectPlanet(): void {
    if(this.highlightedPlanet !== -1) {
      // this.router.navigate([{ outlets: { data: ['planet', this.highlightedPlanet]}}]);
      // this.router.navigate(['planet', this.highlightedPlanet], { relativeTo: this.route });
      this.gameService.loadComponent('planet', this.highlightedPlanet);
    } else {
      this.gameService.clearLoadedComponent();
    }
  }

  selectPlanetByTouch(position: TouchEvent): void {
    this.mouseCoordinates = { x: position.changedTouches[0].pageX - this.mainCanvas.getBoundingClientRect().left, y: position.changedTouches[0].pageY - this.mainCanvas.getBoundingClientRect().top };
  }

}
