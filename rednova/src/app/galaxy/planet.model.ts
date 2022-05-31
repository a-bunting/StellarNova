import { Star } from "./star.model";

export class Planet {

  distance: number; // in astronomical units
  solarRadiation: number; // in solar constants

  constructor(star: Star, lastPlanet: number, index: number) {
    this.distance = Math.random() * (index + 1) + lastPlanet;
    this.solarRadiation = star.power / Math.pow(this.distance, 2);
  }

}
