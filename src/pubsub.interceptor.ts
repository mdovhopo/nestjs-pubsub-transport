import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const errorTransformer = (err: Error): Observable<Error> => of(err);

@Injectable()
export class PubSubInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(catchError(errorTransformer));
  }
}
