import { Auth }               from "./Auth/auth";
import { log }                from "./logger";
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
  private auth: Auth;
  private userInfo: UserInfo | null = null;
  private persistToken: PersistTokenAdapter;
  constructor(providers: Provider, persistToken: PersistTokenAdapter) {
    // providers.forEach((provider) => {
    //   const auth = new Auth(provider.openIdConnectUrl, provider.clientId, provider.redirectUri, provider.scope, provider.responseType, provider.extras);
    //   this.Auths.push(auth);
    // });
    this.auth = new Auth(providers.openIdConnectUrl, providers.clientId, providers.redirectUri, providers.scope, providers.responseType, providers.extras);
    this.persistToken = persistToken;
    const loacal_tokens = this.persistToken.getCredentials();
    if (loacal_tokens.length > 0) {
      log("Find local token, refresh token")
      this.handleLocalToken().then((success) => {
        if (!success) {
          log("refresh token not valid or expired, need to Login again")
          this.oroAuthFlow();
        } else log("handle local token complete")
      });
    } else {
      log("No local token, init oro auth flow")
      this.oroAuthFlow();
    }
  }

  async handleLocalToken(): Promise<boolean> {
    const localRefreshToken = this.persistToken.getToken("refreshToken");
    log(localRefreshToken);
    //check if refresh token is expired
    await this.auth.fetchServiceConfiguration();
    try {
      await this.auth.refreshAccessToken(localRefreshToken);
      this.auth.authState.isTokenRequestComplete = true;
      this.persistToken.setToken('accessToken', this.getToken("accessToken"));
      this.persistToken.setToken('refreshToken', this.getToken("refreshToken"));
      this.persistToken.setToken('idToken', this.getToken("idToken"));
      const credentials = this.persistToken.getCredentials();
      log('refreshAccessToken with local storage', credentials);
      this.fetchUserInfo();
      return true;
    } catch (error) {
      this.persistToken.deleteToken('accessToken');
      this.persistToken.deleteToken('refreshToken');
      this.persistToken.deleteToken('idToken');
      log(error);
      return false;
    }
  }

  async oroAuthFlow(): Promise<void> {
    log("start oro auth flow");
    this.signIn().then(() => {
      this.fetchUserInfo();
      this.persistToken.setToken('accessToken', this.getToken("accessToken"));
      this.persistToken.setToken('refreshToken', this.getToken("refreshToken"));
      this.persistToken.setToken('idToken', this.getToken("idToken"));
    });
  }


  getToken(key: string): string {
    if (!this.auth.authState.isTokenRequestComplete) {
      log('Token request not complete. Please sign in first');
      return;
    }
    if (key) {
      return this.auth.tokenResponse[key as keyof TokenResponse] as string;
    }
  }

  fetchUserInfo(): void | UserInfo {
    if (!this.auth.authState.isTokenRequestComplete) {
      log('Token request not complete. Please sign in first');
      return;
    }
    log('Fetching Oro user info')
    this.auth.fetchUserInfo().then(userInfo => {
      log('User Info ', userInfo);
      this.userInfo = userInfo as UserInfo;
      return this.userInfo;
    });
  }

  async signIn(): Promise<void> {
    await this.auth.fetchServiceConfiguration();
    log('Service configuration fetched');
    await this.auth.makeAuthRequest();
    await this.auth.makeTokenRequest();
    await this.auth.refreshAccessToken();
  }

  signOut(): void {
    this.auth.logout();
    this.userInfo = null;
  }
}
