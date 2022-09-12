import { Component, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss']
})
export class LoadingComponent implements OnInit, OnDestroy {

  dots: string = '.';
  timer: number = 0;

  constructor() { }

  ngOnInit(): void {
    this.timer = window.setInterval(() => {
      this.timer === 6 ? this.timer = 0 : this.timer++;
    }, 200)
  }

  ngOnDestroy(): void {
      clearInterval(this.timer);
  }

}
