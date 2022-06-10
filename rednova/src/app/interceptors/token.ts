import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { AuthenticateService } from "../services/authenticate.service";

@Injectable()

export class TokenInterceptor implements HttpInterceptor {

  constructor(private auth: AuthenticateService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token: string = JSON.parse(localStorage.getItem('rednovaUserAuth'))?.token;

    if(token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}`}});
    }

    return next.handle(req);
  }
}
