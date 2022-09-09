import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Galaxy } from '../galaxy/galaxy.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  @ViewChild('galaxyCanvas', { static: true }) galaxyCanvas: ElementRef<HTMLCanvasElement>;
  galaxyContext: CanvasRenderingContext2D;

  galaxy: Galaxy;

  constructor() { }

  ngOnInit(): void {

    window.addEventListener('resize', () => {
      this.animate();
    })

    // set up the canvas
    this.galaxyContext = this.galaxyCanvas.nativeElement.getContext('2d');

    // set up the galaxy
    this.galaxy = new Galaxy(30, 20, 2, 1500);

    this.animate();
  }

  draw(): void {

    this.galaxy.drawGalaxy(this.galaxyContext, this.galaxyCanvas, this.mapZoom, this.cursorPosition);
  }

  update(): void {

  }

  animate(): void {

    this.draw();

    // requestAnimationFrame(() => { this.animate(); });
  }

  mapZoom: number = 1;
  cursorPosition: { x: number, y: number } = { x: 0, y: 0 };

  zoomOnMap(event: WheelEvent): void {

    this.mapZoom -= (event.deltaY / 1000);

    if(this.mapZoom < 1) this.mapZoom = 1;
    if(this.mapZoom > 10) this.mapZoom = 10;

  }

  mouseMoveOnMap(event: MouseEvent): void {
    // this.cursorPosition = { x: -(event.offsetX - this.galaxyCanvas.nativeElement.width / 2), y: -(event.offsetY - this.galaxyCanvas.nativeElement.height / 2) };
    this.cursorPosition = { x: event.offsetX, y: event.offsetY };
  }

}
