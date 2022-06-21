import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, take, tap } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from 'src/environments/environment';
import { AuthenticateService, User } from './authenticate.service';
import { DatabaseResult } from './interfaces';

export interface ServerMessage {
  type: string; message: string; data: {}
}

@Injectable({
  providedIn: 'root'
})
export class GameService {

  serverMessage: BehaviorSubject<ServerMessage> = new BehaviorSubject<ServerMessage>(null);

  user: User;

  ticks: number = 0;

  constructor(
    private http: HttpClient,
    private authService: AuthenticateService,
    private activeRoute: ActivatedRoute,
    private router: Router
  ) {
    // start up the websocket connection
    this.webSockets();

    // get the user...
    this.authService.user.subscribe((user: User) => this.user = user )
  }

  ws: WebSocketSubject<any>;

  webSockets(): void {
    // deserializer is from this: https://github.com/ReactiveX/rxjs/issues/4166
    // read it one day to see whyt his error persists,,,
    this.ws = webSocket({url: `${environment.websocketUrl}`});

    this.ws.subscribe(
      {
        next: (data: ServerMessage) => {
          switch(data.type) {
            case 'tick': this.ticks++;
          }
      },
        error: (error) => {
          console.log(`Error in socket: ${error}`);
      },
        complete: () => {
          console.log("connection to server closed");
        }
    });
  }

  /**
   * Reconnects the server after the websockets get disconnected...
   * (tries to!)
   * @param ws
   */
  reconnectToWebsockets(ws: WebSocketSubject<any>): void {

  }

  sendTestMessage(): void {
    this.ws.next({ msg: 'hello' });
  }

  sendMessage(server: WebSocketSubject<any>, type: string, message: string, data?: any): void {
    const dataSend: any = data ? data : {};
    server.next({ type, message, dataSend })
  }

  /**
   * loads the galaxy data for a particular galaxy...
   *
   * @param galaxyId
   * @returns
   */
  loadGalaxyData(galaxyId: number): void {
    const subscription: Subscription = this.http.get<DatabaseResult>(`${environment.apiUrl}/galaxy/getUserGalaxyData?galaxyId=${galaxyId}`).subscribe((data: DatabaseResult) => {
      if(!data.error) {
        console.log(data);
      }

      subscription.unsubscribe();
    })
  }
}
