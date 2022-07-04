import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

export interface RednovaConsoleLog {
  message: string; type: string; warning: boolean;
}

@Component({
  selector: 'app-console',
  templateUrl: './console.component.html',
  styleUrls: ['./console.component.scss']
})
export class ConsoleComponent implements OnInit, OnChanges {

  @Input() consoleLogs: RednovaConsoleLog[] = [];

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
  }

}
