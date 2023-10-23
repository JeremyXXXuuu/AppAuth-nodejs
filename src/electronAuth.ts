import { Auth }               from "./Auth/auth";
import { Logger }        from "@orosound/log";
import { TokenResponse }      from "./Auth/token_response";
import { StringMap }          from "./Auth/types";
// //---------------------------------------------------------------------
// const oroProvider = {
// 	name: 'orosound',
// 	openIdConnectUrl: 'https://staging.auth.orosound.com',
// 	clientId: 'foo',
// 	redirectUri: 'http://127.0.0.1:8000',
// 	scope: 'openid name profile email offline_access',
// 	responseType: 'code',
// 	extras: { prompt: 'consent', access_type: 'offline' },
// }

// //---------------------------------------------------------------------
// const googleProvider = {
//   name: 'google',
//   openIdConnectUrl: 'https://accounts.google.com',
//   clientId: "659276355877-am8th2ah8s028ho58bnn8q48murgn878.apps.googleusercontent.com",
//   clientSecret:"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",
//   redirectUri: "http://127.0.0:8000",
//   scope: "openid profile",
//   responseType: "code",
//   extras: { prompt: "consent"},
// }
//---------------------------------------------------------------------
interface UserInfo {
  name: string;
  email: string;
  picture?: string;
  profile: {
    name: string;
    group: string;
  }
}

interface Provider {
  openIdConnectUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  responseType: string;
  extras?: StringMap;
}

interface PersistTokenAdapter {
  setToken: (key: string, value: string) => void;
  getToken: (key: string) => string;
  deleteToken: (key: string) => void;
  getCredentials: () =>  Array<{ key: string; token: string }>;
}

export class ElectronAuthClient {
  private log: Logger = new Logger('ElectronAuthClient');
  private auth: Auth;
  private userInfo: UserInfo | null = null;
  private persistToken: PersistTokenAdapter;
  constructor(providers: Provider, persistToken: PersistTokenAdapter) {
    this.auth = new Auth(providers.openIdConnectUrl, providers.clientId, providers.redirectUri, providers.scope, providers.responseType, providers.extras);
    this.persistToken = persistToken;
  }

  init(): void {
    this.log.info("init ElectronAuthClient");
    const loacal_tokens = this.persistToken.getCredentials();
    if (loacal_tokens.length > 0) {
      this.log.verbose("Find local token, refresh token")
      this.handleLocalToken().then((success) => {
        if (!success) {
          this.log.verbose("refresh token not valid or expired, need to Login again")
          this.oroAuthFlow();
        } else this.log.verbose("handle local token complete")
      });
    } else {
      this.log.verbose("No local token, init oro auth flow")
      this.oroAuthFlow();
    }
  }

  async handleLocalToken(): Promise<boolean> {
    const localRefreshToken = this.persistToken.getToken("refreshToken");
    this.log.verbose(localRefreshToken);
    //check if refresh token is expired
    await this.auth.fetchServiceConfiguration();
    try {
      await this.auth.refreshAccessToken(localRefreshToken);
      this.auth.authState.isTokenRequestComplete = true;
      this.persistToken.setToken('accessToken', this.getToken("accessToken"));
      this.persistToken.setToken('refreshToken', this.getToken("refreshToken"));
      this.persistToken.setToken('idToken', this.getToken("idToken"));
      const credentials = this.persistToken.getCredentials();
      this.log.verbose('refreshAccessToken with local storage', JSON.stringify(credentials));
      this.fetchUserInfo();
      return true;
    } catch (error) {
      this.persistToken.deleteToken('accessToken');
      this.persistToken.deleteToken('refreshToken');
      this.persistToken.deleteToken('idToken');
      this.log.error(JSON.stringify(error));
      return false;
    }
  }

  async oroAuthFlow(): Promise<void> {
    this.log.info("start oro auth flow");
    this.signIn().then(() => {
      this.fetchUserInfo();
      this.persistToken.setToken('accessToken', this.getToken("accessToken"));
      this.persistToken.setToken('refreshToken', this.getToken("refreshToken"));
      this.persistToken.setToken('idToken', this.getToken("idToken"));
    });
  }


  getToken(key: string): string {
    if (!this.auth.authState.isTokenRequestComplete) {
      this.log.verbose('Token request not complete. Please sign in first');
      return;
    }
    if (key) {
      return this.auth.tokenResponse[key as keyof TokenResponse] as string;
    }
  }

  fetchUserInfo(): void | UserInfo {
    if (!this.auth.authState.isTokenRequestComplete) {
      this.log.verbose('Token request not complete. Please sign in first');
      return;
    }
    this.log.verbose('Fetching Oro user info')
    this.auth.fetchUserInfo().then(userInfo => {
      this.log.verbose('User Info ', userInfo);
      this.userInfo = userInfo as UserInfo;
      return this.userInfo;
    });
  }

  async signIn(): Promise<void> {
    await this.auth.fetchServiceConfiguration();
    this.log.verbose('Service configuration fetched');
    await this.auth.makeAuthRequest();
    await this.auth.makeTokenRequest();
    await this.auth.refreshAccessToken();
  }

  async signOut(): Promise<void> {
    await this.auth.fetchServiceConfiguration();
    this.auth.logout();
    this.userInfo = null;
    this.deleteLocalToken();
  }

  deleteLocalToken(): void {
    this.persistToken.deleteToken('accessToken');
    this.persistToken.deleteToken('refreshToken');
    this.persistToken.deleteToken('idToken');
  }
}
