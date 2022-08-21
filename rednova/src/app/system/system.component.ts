import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
              this.generateSector(sectorData);
            }
          }
          else {
            this.generateSector(sectorData);
          }
        }
      },
      error: (err: any) => { console.log(`Error: ${err}`)},
      complete: () => {}
    })

    this.subscriptions.push(...[systemSubscription]);
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
      const maxHeight: number = this.sectorCanvas.nativeElement.height / 2;
      const maxDistance: number = 0.5 * sectorData.system.starSize + ((sectorData.system.planets.length - 1) * 40) + Math.max(Math.min(1.5 * sectorData.system.starSize), Math.min(150, sectorData.system.planets[sectorData.system.planets.length - 1].distance * 50));

      const scale: number = maxDistance < maxHeight ? 1 : ((maxDistance / maxHeight) * 0.85);

      for(let i = 0 ; i < sectorData.system.planets.length ; i++) {

        // const distance: number =  0.5 * sectorData.system.starSize + (i * 65) + Math.max(Math.min(1.5 * sectorData.system.starSize), Math.min(150, sectorData.system.planets[i].distance * 50));
        const distance: number =  (0.5 * sectorData.system.starSize + (i * 65) + Math.max(Math.min(1.5 * sectorData.system.starSize), Math.min(150, sectorData.system.planets[i].distance * 50))) * scale;
        const size: number = (Math.floor(Math.random() * 3) + 1) * 10;
        const angle: number = Math.floor(Math.random() * 2 * Math.PI);
        const planetx: number = this.sectorCanvas.nativeElement.width / 2 + (distance * Math.cos(angle));
        const planety: number = this.sectorCanvas.nativeElement.height / 2 + (distance * Math.sin(angle));

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

  ngOnInit(): void {
    // set up the canvas
    this.sectorContext = this.sectorCanvas.nativeElement.getContext('2d');
    this.generateStarfield();
    this.drawFrame(this.sectorContext, this.sectorCanvas);
  }

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
  iteration: number = 0;

  requestAnimationFrame: number;

  animate(): void {
    this.drawFrame(this.sectorContext, this.sectorCanvas);
    this.calculate();

    this.timeRunning  += (performance.now() / 100000);
    this.iteration++;

    this.requestAnimationFrame = requestAnimationFrame(() => { this.animate(); });
  }

  angleBaseSpeed: number = 0.002;

  calculate(): void {
    // increase the planets angle...
    for(let i = 0 ; i < this.planets.length ; i++) {
      this.planets[i].angle += this.angleBaseSpeed * (150 / this.planets[i].distance);
      this.planets[i].x = this.sectorCanvas.nativeElement.width / 2 + (this.planets[i].distance * Math.cos(this.planets[i].angle)),
      this.planets[i].y = this.sectorCanvas.nativeElement.height / 2 + (this.planets[i].distance * Math.sin(this.planets[i].angle))

      for(let o = 0 ; o < this.planets[i].moons.length ; o++) {
        this.planets[i].moons[o].angle += 0.04 * (2 / (o+1));
        this.planets[i].moons[o].x = this.planets[i].x + ((this.planets[i].size + (2 * this.moonsize) + (o * this.moonsize * 3)) * Math.cos(this.planets[i].moons[o].angle));
        this.planets[i].moons[o].y = this.planets[i].y + ((this.planets[i].size + (2 * this.moonsize) + (o * this.moonsize * 3)) * Math.sin(this.planets[i].moons[o].angle));
      }
    }
  }

  scale: number = 1;
  starLength: number = 0;
  loadingNewSector: boolean = false;

  /**
   * Initiates a sector move graphics change - the zooming in!
   */
  initiateSectorMove(): void {

    let intervalTime: number = 10;
    let iterations: number = 500 / intervalTime;
    let iterationsHappened: number = 0;
    this.loadingNewSector = true;

    let interval: number = window.setInterval(() => {
      // change the required values
      this.scale -= 1 / iterations;
      this.starLength += 100 / iterations;
      iterationsHappened++;

      // check to see if this has finished...
      if(iterationsHappened === iterations) {
        this.loadingNewSector = false;
        console.log(`stopped: ${this.loadingNewSector}`);
        clearInterval(interval);
      }
    }, intervalTime)

  }

  rays: { a: number, l: number, w: number, c: { r: number, g: number, b: number } }[] = [];
  twinkleSpeed: number = 0.1;

  starColourScheme: StarColourScheme;

  drawFrame(ctx: CanvasRenderingContext2D, canvas: ElementRef<HTMLCanvasElement>): void {
    // reset the scene
    canvas.nativeElement.width = document.getElementById('canvas').offsetWidth;
    canvas.nativeElement.height = document.getElementById('canvas').offsetHeight;

    // starfield first...
    this.drawStarField(ctx, canvas, this.scale);

    // draw the rays
    this.drawStarRays(ctx, canvas, this.scale);

    // draw the star...
    this.drawStar(ctx, canvas, this.scale);

    // draw the planets
    this.drawPlanets(ctx, canvas, this.scale);
  }

  drawStarField(ctx: CanvasRenderingContext2D, canvas: ElementRef<HTMLCanvasElement>, scale: number = 1): void {
    const width: number = canvas.nativeElement.width;
    const height: number = canvas.nativeElement.height;

    for(let i = 0 ; i < this.starField.length ; i++) {

      const x: number = (this.starField[i].x / 100) * width;
      const y: number = (this.starField[i].y / 100) * height;

      ctx.fillStyle = `rgba(255, 255, 255, ${this.starField[i].alpha + Math.cos(this.iteration * this.twinkleSpeed + i * 30) * (this.starField[i].alpha / 3)})`;
      ctx.beginPath();
      ctx.arc(x, y, this.starField[i].size, 0, 2 * Math.PI);
      ctx.fill();

      if(this.loadingNewSector) {
        // draw a line of %age starLength to the center of the map...
        const distanceToCenter: number = Math.sqrt(Math.pow(x - (width / 2), 2) + Math.pow(y - (height / 2), 2));
        var gradient: CanvasGradient = ctx.createLinearGradient(0, 0, 5, distanceToCenter);
        gradient.addColorStop(0, `rgba(255, 255, 255, .3)`);
        gradient.addColorStop(this.starLength / 100, 'rgba(0, 0, 0, .5)');

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(width / 2, height / 2);
        ctx.fill();
      }
    }
  }

  drawPlanets(ctx: CanvasRenderingContext2D, canvas: ElementRef<HTMLCanvasElement>, scale: number = 1): void {
    const width: number = canvas.nativeElement.width;
    const height: number = canvas.nativeElement.height;

    let anyPlanetsHighlighted: boolean = false;

    // draw the planets..
    for(let i = 0 ; i < this.planets.length ; i++) {
      const planet: DisplayPlanet = this.planets[i];

      // planets looks
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.size, 0, Math.PI * 2);
      ctx.fill();

      // light side and dark side - rotate so it faces the sun.
      ctx.save();
      ctx.translate(planet.x, planet.y);
      ctx.rotate(planet.angle + this.gradientAngle);

      var gradient: CanvasGradient = ctx.createLinearGradient(0.5 * planet.size, 0.5 * planet.size, -0.5 * planet.size, -0.5 * planet.size);
      gradient.addColorStop(0, `rgba(255, 255, 255, .3)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, .5)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, planet.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.fillStyle = 'white';
      ctx.fillText(planet.name, planet.x + planet.size + 5, planet.y);
      ctx.fillText(planet.owner, planet.x + planet.size + 5, planet.y + 10);

      const planetDistance: number = Math.sqrt( Math.pow(planet.x -  canvas.nativeElement.width / 2, 2) + Math.pow(planet.y -  canvas.nativeElement.height / 2, 2) )
      const distanceToSun: number = Math.sqrt( Math.pow(planet.x - this.mouseCoordinates.x, 2) + Math.pow(planet.y - this.mouseCoordinates.y, 2) )

      // draw the moons
      for(let o = 0 ; o < planet.moons.length ; o++) {
        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.arc(planet.moons[o].x, planet.moons[o].y, this.moonsize, 0, Math.PI * 2);
        ctx.fill();

        const moonDistance: number = Math.sqrt(Math.pow(planet.moons[o].x - canvas.nativeElement.width / 2, 2) + Math.pow(planet.moons[o].y - canvas.nativeElement.height / 2, 2));
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

  drawStarRays(ctx: CanvasRenderingContext2D, canvas: ElementRef<HTMLCanvasElement>, scale: number = 1): void {
    const width: number = canvas.nativeElement.width;
    const height: number = canvas.nativeElement.height;

    for(let i = 0 ; i < this.rays.length ; i++) {
      let ray: { a: number, l: number, w: number, c: { r: number, g: number, b: number }} = this.rays[i];
      let rayLength: number = Math.cos(this.iteration / 50 + i * this.sectorData.system.starRayDistance) * ray.l + this.sectorData.system.starSize;
      var gradient: CanvasGradient = ctx.createLinearGradient(0, 0, ray.w, rayLength);

      gradient.addColorStop(0, `rgba(${ray.c.r},${ray.c.g},${ray.c.b}, 1)`);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;

      ctx.save();
      ctx.translate(canvas.nativeElement.width / 2, canvas.nativeElement.height / 2);
      ctx.rotate(ray.a);
      ctx.fillRect(0, 0, ray.w, rayLength);
      ctx.restore();
    }
  }

  drawStar(ctx: CanvasRenderingContext2D, canvas: ElementRef<HTMLCanvasElement>, scale: number = 1): void {
    const width: number = canvas.nativeElement.width;
    const height: number = canvas.nativeElement.height;

    ctx.beginPath();
    var gradient: CanvasGradient = ctx.createRadialGradient(canvas.nativeElement.width / 2, canvas.nativeElement.height / 2, this.sectorData.system.starSize * (1.5 * this.starScale), canvas.nativeElement.width / 2, canvas.nativeElement.height / 2, this.sectorData.system.starSize * (3 * this.starScale));

    gradient.addColorStop(0, `rgba(${this.starColourScheme.p.r},${this.starColourScheme.p.g},${this.starColourScheme.p.b}, 1)`);
    gradient.addColorStop(.1 + (.01 * Math.cos(this.iteration / 20)), `rgba(${this.starColourScheme.s.r},${this.starColourScheme.s.g},${this.starColourScheme.s.b}, 1)`);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;

    ctx.arc(canvas.nativeElement.width / 2, canvas.nativeElement.height / 2, this.sectorData.system.starSize * (3 * this.starScale), 0, 2 * Math.PI);
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
    this.mouseCoordinates = { x: position.changedTouches[0].pageX - this.sectorCanvas.nativeElement.getBoundingClientRect().left, y: position.changedTouches[0].pageY - this.sectorCanvas.nativeElement.getBoundingClientRect().top };
  }

}
