import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function convertBigIntToString(obj: any, visited = new WeakSet()): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (visited.has(obj)) {
    return '[Circular Reference]';
  }

  visited.add(obj);

  if (Array.isArray(obj)) {
    const result = obj.map((item) => convertBigIntToString(item, visited));
    visited.delete(obj);
    return result;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = convertBigIntToString(obj[key], visited);
    }
  }

  visited.delete(obj);
  return result;
}

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return convertBigIntToString(data, new WeakSet());
      }),
    );
  }
}
