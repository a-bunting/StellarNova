import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SectorData } from '../game/game.component';
import { GameService } from '../services/game.service';

interface DisplayPlanet {
  id: number, distance: number, angle: number, size: number, x: number, y: number, name: string, owner: string
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

  // canvas stuff
  @ViewChild('sectorCanvas', { static: true }) sectorCanvas: ElementRef<HTMLCanvasElement>;
  sectorContext: CanvasRenderingContext2D;

  constructor(
    private gameService: GameService,
    private router: Router,
    private route: ActivatedRoute
  ){
    // get the sector subscription
    const systemSubscription: Subscription = this.gameService.sectorData.subscribe({
      next: (sectorData: SectorData) => {
        if(sectorData) {
          this.sectorData = sectorData;

          // set the planets array
          this.planets = [];

          for(let i = 0 ; i < sectorData.system.planets.length ; i++) {

            const distance: number =  (i * 30) + Math.max(Math.min(1.5 * this.starSize), Math.min(150, sectorData.system.planets[i].distance * 50));
            const angle: number = Math.floor(Math.random() * 2 * Math.PI);

            const newPlanet: DisplayPlanet = {
              id: sectorData.system.planets[i].id,
              distance: distance,
              angle: angle,
              size: (Math.floor(Math.random() * 3) + 1) * 10, // minimum planet size of 21
              x: this.sectorCanvas.nativeElement.width / 2 + (distance * Math.cos(angle)),
              y: this.sectorCanvas.nativeElement.height / 2 + (distance * Math.sin(angle)),
              name: sectorData.system.planets[i].name,
              owner: sectorData.system.planets[i].ownerName ?? 'Unclaimed'
            }

            this.planets.push(newPlanet);
          }
        }
      },
      error: (err: any) => { console.log(`Error: ${err}`)},
      complete: () => {}
    })

    this.subscriptions.push(...[systemSubscription]);
  }

  planets: DisplayPlanet[] = []

  ngOnInit(): void {
    // set up the canvas
    this.sectorContext = this.sectorCanvas.nativeElement.getContext('2d');
    this.generateStarfield();
    this.generateRays();
    this.animate();
  }

  numberOfStars: number = 80;

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

    // create the suns rays..
    const rayCount: number = 360;
    const rayLength: { min: number, max: number } = { min: 20, max: 200 };
    const rayWidth: { min: number, max: number } = { min: 3, max: 5 };
    const spacePerRay: number = rayCount / 360;

    for(let i = 0 ; i < rayCount ; i++) {
      const ray: { a: number, l: number, w: number } = {
        a: spacePerRay * i,
        l: rayLength.min + (Math.random() * (rayLength.max - rayLength.min)),
        w: rayWidth.min + (Math.random() * (rayWidth.max - rayWidth.min))
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

  animate(): void {
    this.drawFrame(this.sectorContext, this.sectorCanvas);
    this.calculate();

    this.timeRunning  += (performance.now() / 100000);
    this.iteration++;

    requestAnimationFrame(() => { this.animate(); });
  }

  calculate(): void {
    // increase the planets angle...
    for(let i = 0 ; i < this.planets.length ; i++) {
      this.planets[i].angle += 0.002 * (150 / this.planets[i].distance);
      this.planets[i].x = this.sectorCanvas.nativeElement.width / 2 + (this.planets[i].distance * Math.cos(this.planets[i].angle)),
      this.planets[i].y = this.sectorCanvas.nativeElement.height / 2 + (this.planets[i].distance * Math.sin(this.planets[i].angle))
    }

    // // change thealpha on the starfield
    // for(let i = 0 ; i < this.starField.length ; i++) {

    // }
  }

  rays: { a: number, l: number, w: number }[] = [];
  starSize: number = 30;
  twinkleSpeed: number = 0.2;

  drawFrame(ctx: CanvasRenderingContext2D, canvas: ElementRef<HTMLCanvasElement>): void {
    canvas.nativeElement.width = document.getElementById('canvas').offsetWidth;
    canvas.nativeElement.height = document.getElementById('canvas').offsetHeight;

    const width: number = canvas.nativeElement.width;
    const height: number = canvas.nativeElement.height;

    // starfield first...
    for(let i = 0 ; i < this.starField.length ; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.starField[i].alpha + Math.cos(this.iteration * this.twinkleSpeed + i * 30) * (this.starField[i].alpha / 3)})`;
      ctx.beginPath();
      ctx.arc((this.starField[i].x / 100) * width, (this.starField[i].y / 100) * height, this.starField[i].size, 0, 2 * Math.PI);
      ctx.fill();
    }

    const starRgb: string = '255, 127, 0';

    // draw the rays
    for(let i = 0 ; i < this.rays.length ; i++) {
      let ray: { a: number, l: number, w: number } = this.rays[i];
      let rayLength: number = Math.cos(this.iteration / 50 + i * this.distanceBetweenRays) * ray.l + this.starSize;
      var gradient: CanvasGradient = ctx.createLinearGradient(0, 0, ray.w, rayLength);

      gradient.addColorStop(0, `rgba(${starRgb}, 1)`);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;

      ctx.save();
      ctx.translate(canvas.nativeElement.width / 2, canvas.nativeElement.height / 2);
      ctx.rotate(ray.a);
      ctx.fillRect(0, 0, ray.w, rayLength);
      ctx.restore();
    }


    ctx.beginPath();
    var gradient: CanvasGradient = ctx.createRadialGradient(canvas.nativeElement.width / 2, canvas.nativeElement.height / 2, this.starSize * 1.5, canvas.nativeElement.width / 2, canvas.nativeElement.height / 2, this.starSize * 3);

    gradient.addColorStop(0, `rgba(${starRgb}, 1)`);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;

    ctx.arc(canvas.nativeElement.width / 2, canvas.nativeElement.height / 2, this.starSize * 3, 0, 2 * Math.PI);
    ctx.fill();

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

      const distance: number = Math.sqrt(
        Math.pow(planet.x - this.mouseCoordinates.x, 2) + Math.pow(planet.y - this.mouseCoordinates.y, 2)
      )

      // check to see if the cursor is inside, and if so draw a white circle around it...
      if(distance <= planet.size) {
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

    // darw the mouse cursor for testing...
    ctx.beginPath();
    ctx.arc(this.mouseCoordinates.x, this.mouseCoordinates.y, 2, 0, Math.PI * 2);
    ctx.fill();

  }

  distanceBetweenRays: number = 30;
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

}
