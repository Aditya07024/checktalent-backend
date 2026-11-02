import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service.js';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';

@Global()
@Module({
  providers: [FirebaseService, FirebaseAuthGuard],
  exports: [FirebaseService, FirebaseAuthGuard],
})
export class AuthModule {}
