declare module 'passport-cas' {
    import passport from 'passport';
    
  
    interface VerifyCallback {
      (error: any, user?: any, info?: any): void;
    }
  
    interface StrategyOptions {
      ssoBaseURL: string;
      serverBaseURL: string;
    }
  
    class Strategy extends passport.Strategy {
      constructor(options: StrategyOptions, verify: (profile: any, done: VerifyCallback) => void);
    }
  }
  