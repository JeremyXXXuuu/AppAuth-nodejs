// auth client using electron deep linking

import { Auth } from "./Auth/auth";
import { TokenResponse } from "./Auth/token_response";
import { StringMap } from "./Auth/types";
import { AuthorizationResponse } from "./Auth/authorization_response";
import { Logger } from "@orosound/log";

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
  profile: {
    name: string;
    group: string;
  };
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
  getCredentials: () => Array<{ key: string; token: string }>;
}

export class AuthClient {
  private log: Logger = new Logger("AUTH_CLIENT");
  private auth: Auth;
  private userInfo: UserInfo | null = null;
  private persistToken: PersistTokenAdapter;

  public constructor(
    providers: Provider,
    persistToken: PersistTokenAdapter,

  ) {
    this.auth = new Auth(
      providers.openIdConnectUrl,
      providers.clientId,
      providers.redirectUri,
      providers.scope,
      providers.responseType,
      providers.extras,
    );
    this.persistToken = persistToken;
  }

  public init(): void {
    this.auth.fetchServiceConfiguration().then(() => {
      const loacal_tokens = this.persistToken.getCredentials();
      if (loacal_tokens.length > 0) {
        this.log.verbose("Find local token, refresh token");
        this.handleLocalToken().then((success) => {
          if (!success) {
            this.log.verbose(
              "refresh token not valid or expired, need to Login again",
            );
            this.authFlow();
          } else this.log.verbose("handle local token complete");
        });
      } else {
        this.log.verbose("No local token, init oro auth flow");
        this.authFlow();
      }
    });
  }

  public async authFlow(): Promise<void> {
    this.log.verbose("start auth flow");
    this.log.verbose("Service configuration fetched");
    this.auth.openAuthUrl();
  }

  public async handleLocalToken(): Promise<boolean> {
    const localRefreshToken = this.persistToken.getToken("refreshToken");
    this.log.verbose(localRefreshToken);
    //check if refresh token is expired
    try {
      await this.auth.refreshAccessToken(localRefreshToken);
      this.auth.authState.isTokenRequestComplete = true;
      this.persistToken.setToken("accessToken", this.getToken("accessToken"));
      this.persistToken.setToken("refreshToken", this.getToken("refreshToken"));
      this.persistToken.setToken("idToken", this.getToken("idToken"));
      const credentials = this.persistToken.getCredentials();
      this.log.verbose(
        "refreshAccessToken with local storage",
        JSON.stringify(credentials),
      );
      this.fetchUserInfo();
      return true;
    } catch (error) {
      this.persistToken.deleteToken("accessToken");
      this.persistToken.deleteToken("refreshToken");
      this.persistToken.deleteToken("idToken");
      this.log.error(JSON.stringify(error));
      return false;
    }
  }

  public async fetchUserInfo(): Promise<UserInfo | void> {
    if (!this.auth.authState.isTokenRequestComplete) {
      this.log.verbose("Token request not complete. Please sign in first");
      return Promise.resolve();
    }
    this.log.verbose("Fetching Oro user info");
    const userInfo = await this.auth.fetchUserInfo();
    this.log.verbose("User Info ", JSON.stringify(userInfo));
    this.userInfo = userInfo as UserInfo;
    return this.userInfo;
  }

  public async signOut(): Promise<void> {
    this.auth.logout();
    this.userInfo = null;
    this.deleteLocalToken();
  }

  public getToken(key: string): string {
    if (!this.auth.authState.isTokenRequestComplete) {
      this.log.verbose("Token request not complete. Please sign in first");
      return;
    }
    if (key) {
      return this.auth.tokenResponse[key as keyof TokenResponse] as string;
    }
  }

  public deleteLocalToken(): void {
    this.persistToken.deleteToken("accessToken");
    this.persistToken.deleteToken("refreshToken");
    this.persistToken.deleteToken("idToken");
  }

  public async tokenFlow(code: string, state: string): Promise<void> {
    this.log.verbose("Receive authorization response.");
    this.auth.authorizationResponse = new AuthorizationResponse({
      code,
      state
    });
    await this.auth.makeTokenRequest();
    await this.auth.refreshAccessToken();
    this.log.verbose("Token request complete, save token to local storage");
    this.persistToken.setToken("accessToken", this.getToken("accessToken"));
    this.persistToken.setToken("refreshToken", this.getToken("refreshToken"));
    this.persistToken.setToken("idToken", this.getToken("idToken"));
  }
}
