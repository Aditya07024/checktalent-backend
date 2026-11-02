import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { AuthenticatedUser } from './current-user.decorator.js';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: App | null = null;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.firebaseApp = existingApps[0]!;
      this.isConfigured = true;
      return;
    }

    try {
      if (clientEmail && privateKey) {
        this.firebaseApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        this.isConfigured = true;
        this.logger.log(`Initialized Firebase Admin using service account for project: ${projectId}`);
      } else if (projectId) {
        this.firebaseApp = initializeApp({
          projectId,
        });
        this.isConfigured = true;
        this.logger.log(`Initialized Firebase Admin in project mode: ${projectId}`);
      } else {
        this.logger.warn(
          'Firebase Admin credentials not found in environment. Auth verification will operate in development mode.',
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to initialize Firebase Admin: ${msg}`);
    }
  }

  getApp(): App | null {
    return this.firebaseApp;
  }

  isReady(): boolean {
    return this.isConfigured && !!this.firebaseApp;
  }

  async verifyIdToken(idToken: string): Promise<AuthenticatedUser> {
    if (!idToken) {
      throw new Error('No authorization token provided');
    }

    // Support development tokens for smoke testing
    if (
      process.env.NODE_ENV !== 'production' &&
      (idToken.startsWith('dev_') || idToken === 'test-token')
    ) {
      const mockUid = idToken.startsWith('dev_') ? idToken.replace('dev_', '') : 'dev-user-123';
      this.logger.debug(`[DEV MODE] Accepting simulated token for UID: ${mockUid}`);
      return {
        uid: mockUid,
        email: `${mockUid}@checktalent.dev`,
        name: `Dev User (${mockUid})`,
      };
    }

    if (!this.firebaseApp) {
      return this.decodeTokenPayloadUnverified(idToken);
    }

    try {
      const auth = getAuth(this.firebaseApp);
      const decoded = await auth.verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email,
        email_verified: decoded.email_verified,
        name: decoded.name,
        picture: decoded.picture,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Firebase token verification failed (${msg}), attempting fallback decode`);
      if (process.env.NODE_ENV !== 'production') {
        return this.decodeTokenPayloadUnverified(idToken);
      }
      throw new Error(`Invalid or expired Firebase token: ${msg}`);
    }
  }

  private decodeTokenPayloadUnverified(token: string): AuthenticatedUser {
    try {
      const parts = token.split('.');
      if (parts.length === 3 && parts[1]) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        if (payload.user_id || payload.sub) {
          return {
            uid: payload.user_id || payload.sub,
            email: payload.email,
            name: payload.name || payload.display_name,
            picture: payload.picture,
          };
        }
      }
    } catch {
      // ignore
    }

    throw new Error('Invalid token structure provided');
  }
}
