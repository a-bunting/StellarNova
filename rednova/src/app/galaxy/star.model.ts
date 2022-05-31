export class Star {

  power: number;

  constructor() {
    // calculate a rnadom power.
    let one: number = Math.random() <= 0.5 ? 1 + Math.random() : Math.random();
    let ten: number = Math.random() <= 0.01 ? Math.random() * 10 : 0;
    let hundred: number = Math.random() <= 0.001 ? Math.random() * 100 : 0;
    let thousand: number = Math.random() <= 0.0001 ? Math.random() * 1000 : 0;
    this.power = one + ten + hundred + thousand;
  }

}
