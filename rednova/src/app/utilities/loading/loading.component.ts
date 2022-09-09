import { Component, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss']
})
export class LoadingComponent implements OnInit, OnDestroy {

  dots: string = '.';
  timer: number;

  constructor() { }

  ngOnInit(): void {
    this.timer = window.setInterval(() => {
      switch(this.dots.length) {
        case 1: this.dots = '..'; break;
        case 2: this.dots = '...'; break;
        case 3: this.dots = '.'; break;
      }
    }, 500)
  }

  ngOnDestroy(): void {
      clearInterval(this.timer);
  }

}
