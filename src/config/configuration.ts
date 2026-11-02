export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  firebase: {
    projectId: string;
    clientEmail?: string;
    privateKey?: string;
    serviceAccountKeyPath?: string;
  };
}

export default (): EnvironmentConfig => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  supabase: {
    url: process.env.SUPABASE_URL || 'https://ttzmcpvffmicmhbaadfb.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'checktalent-85fbf',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
    serviceAccountKeyPath: process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH,
  },
});
