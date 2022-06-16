import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  constructor() {
    this.webSockets();
  }

  webSockets(): void {
    // deserializer is from this: https://github.com/ReactiveX/rxjs/issues/4166
    // read it one day to see whyt his error persists,,,
    const ws: WebSocketSubject<any> = webSocket({url: `${environment.websocketUrl}`, deserializer: () => {}});

    this.sendMessage(ws, 'loginNotification', 'hello');

    ws.subscribe(
      {
        next: (message: any) => {
          console.log(`msg: ${message}`);
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

  sendMessage(server: WebSocketSubject<any>, type: string, message: string, data?: any): void {
    const dataSend: any = data ? data : {};
    server.next({ type, message, dataSend })
  }
}
