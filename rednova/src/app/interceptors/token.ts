import { HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AuthenticateService } from "../services/authenticate.service";

@Injectable()

export class TokenInterceptor implements HttpInterceptor {

  constructor(private auth: AuthenticateService) {}

    // add the token to all outgoing requests...
    intercept(req: HttpRequest<any>, next: HttpHandler) {

      const token: string = JSON.parse(localStorage.getItem('rednovaUserAuth'))?.token;

        // create a clone of the request to avoid bad things
        const reqClone: HttpRequest<any> = req.clone({
            headers: req.headers.set('Authorization', "Bearer " + token)
        });

        return next.handle(reqClone);
    }
}
