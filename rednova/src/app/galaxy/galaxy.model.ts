import { ElementRef } from "@angular/core";
import { warpRoute } from "../services/interfaces";
import { SolarSystem } from "./solarSystem.model";

export class Galaxy {

  systems: SolarSystem[] = [];

  width: number;
  height: number;
  depth: number;

  constructor(width: number, height: number, depth: number, systemCount: number, systems?: SolarSystem[]) {
    this.width = width;
    this.height = height;
    this.depth = depth;

    if(!systems || systems.length === 0) {
      this.generate(width, height, depth, systemCount);
    } else {
      this.systems = systems;
      this.width = width;
      this.height = height;
      this.depth = depth;
    }
  }

  /**
   * Generate a new galaxy
   * normally will be done on restart of the game only but here for testing!
   * @param width
   * @param height
   * @param depth
   * @param systemCount
   */
  generate(width: number, height: number, depth: number, systemCount: number): void {
    // generate a galaxy
    this.systems = this.generateCubeGalaxy(width, height, depth, systemCount);
    this.systems = this.generateWarpRoutes(this.systems);
  }

  generateCubeGalaxy(width: number, height: number, depth: number, systemCount: number): SolarSystem[] {
    // number of stars per sector
    let starsPerSector: number = systemCount / (width * height * depth);
    let newGalaxy: SolarSystem[] = [];

    for(let w = 0 ; w < width ; w++) {
      for(let h = 0 ; h < height ; h++) {
        for(let d = 0 ; d < depth ; d++) {
          // find the number of systems to generate
          let starDrop: number = Math.random() > 0.5 ? 1 : -1;
          let systems: number = Math.floor(starsPerSector - starsPerSector * 0.5 * starDrop * Math.random());

          // create a number of systems in this sector...
          for(let i = 0 ; i < systems ; i++) {
            let system: SolarSystem = new SolarSystem(-0.5 * width + w + Math.random(), -height * 0.5 + h + Math.random(), -depth * 0.5 + d + Math.random());
            newGalaxy.push(system);
          }
        }
      }
    }

    return newGalaxy;
  }

  warpDistance: number = 2;
  warpRouteProbability: number = 0.2;

  /**
   * For each of the systems iterate over the other systems and find their distance
   * Once the distance is known filter by all within about 2 on the coordinate scale.
   *
   * Then pick a random quantity of those planets to forge warp routes to.
   *
   * @param galaxy
   */
  generateWarpRoutes(galaxy: SolarSystem[]): SolarSystem[] {
    // iterate over all the systems in the galaxy...
    for(let i = 0 ; i < galaxy.length ; i++) {
      let routes: warpRoute[] = [];
      let a: SolarSystem = galaxy[i];
      // filter out the far away stars
      let closeSystems: SolarSystem[] = galaxy.filter((b: SolarSystem) => {
        let d: number =
          Math.sqrt(Math.pow(a.coordinates.x - b.coordinates.x, 2) +
                    Math.pow(a.coordinates.y - b.coordinates.y, 2) +
                    Math.pow(a.coordinates.z - b.coordinates.z, 2)
                    )
        return d < this.warpDistance;
      });

      // iterate over all the close systems and, based upon probability, forge a route;
      for(let o = 0 ; o < closeSystems.length ; o++) {
        if(Math.random() < this.warpRouteProbability) {
          routes.push({ id: closeSystems[o].id, x: closeSystems[o].coordinates.x, y: closeSystems[o].coordinates.y, z: closeSystems[o].coordinates.z });
        }
      }

      a.warpRoutes = routes;
    }
    return galaxy;
  }




  iterate: number = 0;

  drawGalaxy(ctx: CanvasRenderingContext2D, canvas: ElementRef<HTMLCanvasElement>, zoom: number = 1, cursor: { x: number, y: number } = { x: 0, y: 0 }, highlightId?: string): void {

    canvas.nativeElement.width = document.getElementById('galaxy').offsetWidth;
    canvas.nativeElement.height = document.getElementById('galaxy').offsetHeight;

    this.iterate = this.iterate === 1 ? 0 : 1;

    let scale: { x: number, y: number } = {
      x: (canvas.nativeElement.width) / this.width,
      y: (canvas.nativeElement.height) / this.height
    }

    cursor.x = cursor.x / zoom;
    cursor.y = cursor.y / zoom;

    // let translateX: number = canvas.nativeElement.width / 2 - this.width / 2 + cursor.x;
    // let translateY: number = canvas.nativeElement.height / 2 - this.height / 2  + cursor.y;

    // console.log(cursor.x, cursor.y);

    // if(translateX - canvas.nativeElement.width < 0) translateX = this.width / 2 + cursor.x;
    // if(translateY - canvas.nativeElement.height < 0) translateY = this.height / 2 + cursor.y;

    let translateX: number = cursor.x < ((scale.x * this.width) / 2) ? (scale.x * this.width) / 2 : (scale.x * this.width) / 2;
    let translateY: number = cursor.y < (canvas.nativeElement.height / 2) ? canvas.nativeElement.height / 2 : canvas.nativeElement.height / 2;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.nativeElement.width, canvas.nativeElement.height);

    ctx.save();
    ctx.translate(translateX, canvas.nativeElement.height/2);
    // ctx.translate(translateX, translateY);



    // and now the warp routes
    for(let i = 0 ; i < this.systems.length ; i++) {
      const routes: warpRoute[] = this.systems[i].warpRoutes;
      let system: SolarSystem = this.systems[i];
      let x1: number = zoom * scale.x * system.coordinates.x;
      let y1: number = zoom * scale.y * system.coordinates.y;

      for(let o = 0 ; o < routes.length ; o++) {

        let x2: number = zoom * scale.x * routes[o].x;
        let y2: number = zoom * scale.y * routes[o].y;

        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 140, 0, " + (system.coordinates.z + (this.depth * 0.99) / this.depth) + ")";
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.closePath();
      }
    }

    // draw on the stars
    for(let i = 0 ; i < this.systems.length ; i++) {
      let system: SolarSystem = this.systems[i];
      let x: number = zoom * scale.x * system.coordinates.x;
      let y: number = zoom * scale.y * system.coordinates.y;

      if(x > -canvas.nativeElement.width && x < canvas.nativeElement.width) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 255, 255, " + (0.1 +  (system.coordinates.z + (this.depth * 0.99) / this.depth)) + ")";
        ctx.arc(x, y, system.size + (zoom - 1) + ((system.coordinates.z + this.depth + 1) / (this.depth + 1)) - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
      }
    }

    ctx.restore();
  }

}
