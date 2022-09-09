import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { StarColourScheme } from 'src/app/system/system.component';

@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss']
})
export class LogoComponent implements OnInit {

  @ViewChild('starBackground', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D;

  constructor() { }

  ngOnInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.setupStarAndRays();
    this.animate();
  }

  rays: { a: number, l: number, w: number, c: { r: number, g: number, b: number } }[] = [];
  rayQuantity: number = 100;
  rayDistance: number = 10;
  starSize: number = 10;
  colorScheme: StarColourScheme;
  starScale: number = 1;

  setupStarAndRays(): void {
    this.rays = [];

    // get the stars data
    const colorScheme: StarColourScheme = {p: { r: 247, g: 223, b: 21 }, s: { r: 255, g: 199, b: 142 }, j: { r: 0, g: 0, b: 0 }};
    this.colorScheme = colorScheme;

    // create the suns rays..
    const rayLength: { min: number, max: number } = { min: 10, max: 100 };
    const rayWidth: { min: number, max: number } = { min: 3, max: 5 };
    const spacePerRay: number = this.rayQuantity / 360;

    for(let i = 0 ; i < this.rayQuantity ; i++) {

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

  iteration: number = 0;

  animate(): void {
    this.iteration++;

    // reset the scene
    this.canvas.nativeElement.width = document.getElementById('canvas').offsetWidth;
    this.canvas.nativeElement.height = document.getElementById('canvas').offsetHeight;

    this.drawStarRays(this.ctx, this.canvas.nativeElement);
    this.drawStar(this.ctx, this.canvas.nativeElement);
    requestAnimationFrame(() => { this.animate(); });
  }



  drawStarRays(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scale: number = 1): void {
    const width: number = canvas.width;
    const height: number = canvas.height;

    for(let i = 0 ; i < this.rays.length ; i++) {
      let ray: { a: number, l: number, w: number, c: { r: number, g: number, b: number }} = this.rays[i];
      let rayLength: number = Math.cos(this.iteration / 50 + i * this.rayDistance) * ray.l + this.starSize;
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
    var gradient: CanvasGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, this.starSize * (1.5 * this.starScale), canvas.width / 2, canvas.height / 2, this.starSize * (3 * this.starScale));

    gradient.addColorStop(0, `rgba(${this.colorScheme.p.r},${this.colorScheme.p.g},${this.colorScheme.p.b}, 1)`);
    gradient.addColorStop(.1 + (.01 * Math.cos(this.iteration / 20)), `rgba(${this.colorScheme.s.r},${this.colorScheme.s.g},${this.colorScheme.s.b}, 1)`);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;

    ctx.arc(canvas.width / 2, canvas.height / 2, this.starSize * (3 * this.starScale), 0, 2 * Math.PI);
    ctx.fill();
  }

}
