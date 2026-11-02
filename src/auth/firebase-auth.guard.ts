import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseService } from './firebase.service.js';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization format. Expected: Bearer <token>');
    }

    try {
      const user = await this.firebaseService.verifyIdToken(token);
      request.user = user;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new UnauthorizedException(`Authentication failed: ${msg}`);
    }
  }
}
