import { coordinates } from "../services/interfaces";
import { Planet } from "./planet.model";
import { Star } from "./star.model";

export class SolarSystem {

  stars: Star[] = [];
  planets: Planet[] = [];

  id: string;
  coordinates: coordinates;

  size: number;

  constructor(x: number, y: number, z: number) {
    this.coordinates = { x, y, z };
    this.id = '' + (Math.random() * 100000); // temp
    this.size = Math.floor(Math.random() * 2) + 1;

  }

}
