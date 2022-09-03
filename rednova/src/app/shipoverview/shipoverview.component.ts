import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, Renderer2, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { GoodStore, SectorData, Ship } from '../game/game.component';
import { GameService } from '../services/game.service';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { AmbientLight, Camera, DirectionalLight, DirectionalLightHelper, Object3D, OrthographicCamera, PerspectiveCamera, WebGLRenderer } from 'three';
import { GalaxyListComponent } from '../entry/galaxy-list/galaxy-list.component';

interface ShipComponent {
  name: string; featured: boolean; icon: string; level: number; desc: string;
}


// used a tutorial on medium to help with this, which probably made it way harder! :)

@Component({
  selector: 'app-shipoverview',
  templateUrl: './shipoverview.component.html',
  styleUrls: ['./shipoverview.component.scss']
})
export class ShipoverviewComponent implements OnInit, OnDestroy, AfterViewInit {

  shipDetail: Ship;
  shipStorage: GoodStore[] = [];

  sectorData: SectorData;

  subscriptions: Subscription[] = [];

  lists: { name: string, components: ShipComponent[] }[] = [
    { name: 'Defence', components: []},
    { name: 'Ship', components: []},
    { name: 'Tech', components: []},
    { name: 'Weapons', components: []}
  ]

  componentIcons: { name: string; classification: string; iconFile: string, desc: string; }[] = [
    { name: 'cloak', classification: 'Tech', iconFile: '003-invisible-symbol.png', desc: 'Your cloak helps disguise you when travelling. This keeps you more safe and less prone to attack.' },
    { name: 'computer', classification: 'Tech', iconFile: '007-cloud.png', desc: 'Beep boop' },
    { name: 'engines', classification: 'Ship', iconFile: '004-car-engine.png', desc: 'Your engines determine the speed at which you can move between sectors using sublight speeds (realspace moves).' },
    { name: 'hull', classification: 'Ship', iconFile: '002-boxes.png', desc: 'Your hull size determines the amount of cargo you can carry in your ship at one time.' },
    { name: 'power', classification: 'Ship', iconFile: '004-power.png', desc: 'Your power determines the amount of energy your ship can store - not enough and you may not be able to use your ship to its maximum potential.' },
    { name: 'sensors', classification: 'Tech', iconFile: '002-sensor.png', desc: `Your sensors help you scan planets and other players' ships, and to better target weapons during battle.` },
    { name: 'armor', classification: 'Defence', iconFile: '003-shield.png', desc: 'Your physical armor is the plating on your ship which creates a barrier between the inside of your ship and space!' },
    { name: 'beams', classification: 'Weapons', iconFile: '001-laser.png', desc: 'Increasing the level of your beams makes you more powerful during attacks.' },
    { name: 'shields', classification: 'Defence', iconFile: '003-shield.png', desc: 'Shields use energy to protect your ship, they prevent both beams and torpedos from striking and damaging your ships armour.' },
    { name: 'torpedos', classification: 'Weapons', iconFile: '005-torpedo.png', desc: 'Increasing your torpedo level will make you more powerful during combat.' },
  ]

  constructor(
    private gameService: GameService
  ) {
    const sectorDataSub: Subscription = this.gameService.sectorData.subscribe({
      next: (data: SectorData) => {
        if(data) {
          this.sectorData = data;
          this.shipDetail = data.ship;

          // rebuild the lists
          this.buildShipComponentLists(data.ship);

          // deal with changing values of goods.
          this.goodChange([...JSON.parse(data.ship.storage)]);
        }
      },
      error: (err: any) => { console.log(`Error: ${err}`)},
      complete: () => {}
    })

    this.subscriptions.push(sectorDataSub);
  }

  ngAfterViewInit(): void {
    this.createScene();
    this.startRenderingLoop();
    this.animate();
  }

  // three
  @ViewChild('shipCanvas', { static: true }) private shipCanvas: ElementRef<HTMLCanvasElement>;

  scene: THREE.Scene;
  objLoader: OBJLoader  = new OBJLoader();
  model: Object3D;
  camera: OrthographicCamera | PerspectiveCamera;
  ambientLight: AmbientLight;
  renderer: WebGLRenderer;
  directionalLight: DirectionalLight;

  startRenderingLoop(): void {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.shipCanvas.nativeElement });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(this.shipCanvas.nativeElement.offsetWidth, this.shipCanvas.nativeElement.offsetHeight);
  }

  animate() {
    requestAnimationFrame(() => { this.animate(); });
    this.renderer.render(this.scene, this.camera);
    if(!this.followMouse) this.rotateShip();
  }

  createScene(): void {
    // scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    // load the spaceship and add to the scene.
    this.objLoader.load('assets/models/spaceship.obj', (obj) => {
      this.model = obj.children[0];
      var box = new THREE.Box3().setFromObject(this.model);
      box.getCenter(this.model.position);
      this.model.position.multiplyScalar(-1);
      this.scene.add(this.model);
    })

    // camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.x = 0;
    this.camera.position.y = 0;
    this.camera.position.z = 10;
    // this.ambientLight = new THREE.AmbientLight(0xffffff, 100);
    // this.scene.add(this.ambientLight);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    this.directionalLight.position.set(1, 0, 1);

    this.scene.add(this.directionalLight);
  }

  ngOnInit(): void {
    addEventListener('mousemove', (mouse: MouseEvent) => {
      if(this.followMouse) {
        this.model.rotation.y = (mouse.clientX / window.innerWidth) - 0.5;
        this.model.rotation.x = (mouse.clientY / window.innerHeight) - 0.5;
      } else {
        // this.model.rotation.y = 0;
        // this.model.rotation.x = 0;
      }
    })
  }

  followMouse: boolean = true;

  mouseFollow(follow: boolean): void { this.followMouse = follow; }

  ngOnDestroy(): void {
      this.subscriptions.map((a: Subscription) => a.unsubscribe());
  }

  rotateShip(): void {
    // this.model.rotation.x += 0.01;
    this.model.rotation.y += 0.01;
    // this.model.rotation.z += 0.01;
  }

  goodChange(newGoods: GoodStore[]): void {

      for(let i = 0 ; i < newGoods.length ; i++) {
        const storage: GoodStore = newGoods[i];
        const oldStoreIndex: number = this.shipStorage.findIndex((a: GoodStore) => a.id === storage.id);

        if(oldStoreIndex === -1) {
          // definately a change, add it then change it.
          const newGood: GoodStore = { id: storage.id, name: storage.name, quantity: 0 };
          this.shipStorage.push(newGood);
          this.modifyGoodsValue(storage.id, newGoods[i].quantity);
        } else {
          // it was found in already.
          this.modifyGoodsValue(storage.id, newGoods[i].quantity);
        }
      }
  }

  intervals: number[] = [];

  modifyGoodsValue(goodsId: string, newValue: number): void {
    // the quantity has changed so run the function...
    const good: GoodStore = this.shipStorage.find((a: GoodStore) => a.id === goodsId);
    const difference: number = newValue - good.quantity;
    // timing constants...
    const iterationsForVisualUpdate: number = difference > 100 ? 100 : 20;
    const updateQuantity: number = difference / iterationsForVisualUpdate;
    const updateInterval: number = (1 * 1000) / iterationsForVisualUpdate;
    let iterations: number = 0;

    // the interval itself...
    const newInterval: number = window.setInterval(() => {
      good.quantity += updateQuantity;
      iterations++;
      if(iterations === iterationsForVisualUpdate) clearInterval(newInterval);
    }, updateInterval)

    this.intervals.push(newInterval);
  }

  getStorageLimit(hullSize: number): number {
    return 100000000;
  }

  getStoragePercentage(quantity: number, hullSize: number): number {
    return (quantity / this.getStorageLimit(1)) * 100;
  }

  getUnusedStoragePercentage(hullSize: number): number {
    // get the total current storage
    let currentStorage: number = 0;
    this.shipStorage.map((a: GoodStore) => currentStorage += a.quantity);
    // find the deficit
    return 100 - (currentStorage / this.getStorageLimit(hullSize)) * 100;
  }

  getUnusedStorage(hullSize: number): number {
    // get the total current storage
    let currentStorage: number = 0;
    this.shipStorage.map((a: GoodStore) => currentStorage += a.quantity);
    // find the deficit
    return this.getStorageLimit(hullSize) - currentStorage;
  }

  buildShipComponentLists(shipData: Ship): void {
    // empty the current lists
    this.lists.forEach((a: any) => a.components = []);

    for(const [key, value] of Object.entries(shipData)) {
      let component: { name: string; classification: string; iconFile: string, desc: string} = this.componentIcons.find((a: { name: string; iconFile: string }) => a.name === key);
      // if an icon has been found...
      if(component) {
        let listComponents: ShipComponent[] = this.lists.find((a: { name: string, components: ShipComponent[] }) => a.name === component.classification).components;
        // if the correct classification sif ound then add this to the list.
        if(listComponents) listComponents.push({
          name: component.name,
          featured: false,
          icon: component.iconFile,
          level: value,
          desc: component.desc
        })
      }
    }

    // finally go thorugh all the lists, sort by level, and make the most high level component featured...
    for(let i = 0 ; i < this.lists.length ; i++) {
      this.lists[i].components.sort((a, b) => a.level - b.level);
      this.lists[i].components[0].featured = true;
    }
  }

  toolTipDescription: string = '';
  toolTipFade: number;

  loadToolTip(componentName: string): void {
    for(let i = 0 ; i < this.lists.length ; i++) {
      for(let o = 0 ; o < this.lists[i].components.length ; o++) {
        if(this.lists[i].components[o].name === componentName) {
          // fade in if not there already
          if(!document.getElementById('ship-model__infotext').classList.contains('ship-model__infotext--show')) {
            document.getElementById('ship-model__infotext').classList.add('ship-model__infotext--show');
          }
          // if a fade is scheduled then rmeove it.
          if(this.toolTipFade) { clearTimeout(this.toolTipFade); }

          this.toolTipDescription = this.lists[i].components[o].desc;
          return;
        }
      }
    }
  }

  removetoolTip(): void {
    document.getElementById('ship-model__infotext').classList.remove('ship-model__infotext--show');

    // give the fadeout time to happen then remove the text.
    this.toolTipFade = window.setTimeout(() => {
      this.toolTipDescription = '';
    }, 200);
  }

}
