import { ElementRef } from "@angular/core";
import { coordinates } from "../services/interfaces";
import { SolarSystem } from "./solarSystem.model";

export class Galaxy {

  systems: SolarSystem[] = [];

  width: number;
  height: number;
  depth: number;

  constructor(width: number, height: number, depth: number, systemCount: number) {
    this.width = width;
    this.height = height;
    this.depth = depth;

    // generate a galaxy
    this.generateCubeGalaxy(width, height, depth, systemCount);
  }

  generateCubeGalaxy(width: number, height: number, depth: number, systemCount: number): void {
    // number of stars per sector
    let starsPerSector: number = systemCount / (width * height * depth);

    for(let w = 0 ; w < width ; w++) {
      for(let h = 0 ; h < height ; h++) {
        for(let d = 0 ; d < depth ; d++) {
          // find the number of systems to generate
          let starDrop: number = Math.random() > 0.5 ? 1 : -1;
          let systems: number = Math.floor(starsPerSector - starsPerSector * 0.5 * starDrop * Math.random());

          // create a number of systems in this sector...
          for(let i = 0 ; i < systems ; i++) {
            let system: SolarSystem = new SolarSystem(-0.5 * width + w + Math.random(), -height * 0.5 + h + Math.random(), -depth * 0.5 + d + Math.random());
            this.systems.push(system);
          }
        }
      }
    }
  }

  iterate: number = 0;

  drawGalaxy(ctx: CanvasRenderingContext2D, canvas: ElementRef<HTMLCanvasElement>, zoom: number = 1, center: { x: number, y: number } = { x: 0, y: 0 }, highlightId?: string): void {

    canvas.nativeElement.width = document.getElementById('galaxy').offsetWidth;
    canvas.nativeElement.height = document.getElementById('galaxy').offsetHeight;

    this.iterate = this.iterate === 1 ? 0 : 1;

    let scale: { x: number, y: number } = {
      x: (canvas.nativeElement.width) / this.width,
      y: (canvas.nativeElement.height) / this.height
    }

    // ctx.clearRect(0, 0, canvas.nativeElement.width, canvas.nativeElement.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.nativeElement.width, canvas.nativeElement.height);

    ctx.save();
    ctx.translate(canvas.nativeElement.width / 2 - this.width / 2 + center.x,
                  canvas.nativeElement.height / 2 - this.height / 2  + center.y
                  );

    for(let i = 0 ; i < this.systems.length ; i+=1) {
      let system: SolarSystem = this.systems[i];
      let x: number = zoom * scale.x * system.coordinates.x;
      let y: number = zoom * scale.y * system.coordinates.y;

      if(x > -canvas.nativeElement.width / 2 && x < canvas.nativeElement.width / 2) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 255, 255, " + (system.coordinates.z + (this.depth * 0.99) / this.depth) + ")";
        ctx.arc(x, y, system.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
      }
    }

    ctx.restore();
  }

}
