import { Auth }               from "./Auth/auth";
import { log }                from "./logger";
import { TokenResponse }      from "./Auth/token_response";
import { StringMap }          from "./Auth/types";
import { 
    AuthorizationResponse }   from "./Auth/authorization_response";
import { app }                from "electron";
import * as path              from "path";

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

export class DeepLinkAuthClient {
  private auth: Auth;
  private userInfo: UserInfo | null = null;
  private persistToken: PersistTokenAdapter;
  private mainWindow: Electron.BrowserWindow | null = null;
  constructor(providers: Provider, persistToken: PersistTokenAdapter, mainWindow: Electron.BrowserWindow | null, protocol: string) {
    this.auth = new Auth(
      providers.openIdConnectUrl,
      providers.clientId,
      providers.redirectUri,
      providers.scope,
      providers.responseType,
      providers.extras
    );
    this.persistToken = persistToken;
    this.mainWindow = mainWindow;
    this.deepLinking(protocol);
  }

  init(): void {
    this.auth.fetchServiceConfiguration().then(() => {
        const loacal_tokens = this.persistToken.getCredentials();
        if (loacal_tokens.length > 0) {
          log("Find local token, refresh token");
          this.handleLocalToken().then((success) => {
            if (!success) {
              log("refresh token not valid or expired, need to Login again");
              this.authFlow();
            } else log("handle local token complete");
          });
        } else {
          log("No local token, init oro auth flow");
          this.authFlow();
        }
    });
  }

  async authFlow(): Promise<void> {
    log("start auth flow");
    log("Service configuration fetched");
    this.auth.openAuthUrl();
  }

  async handleLocalToken(): Promise<boolean> {
    const localRefreshToken = this.persistToken.getToken("refreshToken");
    log(localRefreshToken);
    //check if refresh token is expired
    try {
      await this.auth.refreshAccessToken(localRefreshToken);
      this.auth.authState.isTokenRequestComplete = true;
      this.persistToken.setToken("accessToken", this.getToken("accessToken"));
      this.persistToken.setToken("refreshToken", this.getToken("refreshToken"));
      this.persistToken.setToken("idToken", this.getToken("idToken"));
      const credentials = this.persistToken.getCredentials();
      log("refreshAccessToken with local storage", credentials);
      this.fetchUserInfo();
      return true;
    } catch (error) {
      this.persistToken.deleteToken("accessToken");
      this.persistToken.deleteToken("refreshToken");
      this.persistToken.deleteToken("idToken");
      log(error);
      return false;
    }
  }

  fetchUserInfo(): void | UserInfo {
    if (!this.auth.authState.isTokenRequestComplete) {
      log("Token request not complete. Please sign in first");
      return;
    }
    log("Fetching Oro user info");
    this.auth.fetchUserInfo().then((userInfo) => {
      log("User Info ", userInfo);
      this.userInfo = userInfo as UserInfo;
      return this.userInfo;
    });
  }

  async signOut(): Promise<void> {
    this.auth.logout();
    this.userInfo = null;
    this.deleteLocalToken();
  }

  getToken(key: string): string {
    if (!this.auth.authState.isTokenRequestComplete) {
      log("Token request not complete. Please sign in first");
      return;
    }
    if (key) {
      return this.auth.tokenResponse[key as keyof TokenResponse] as string;
    }
  }

  deleteLocalToken(): void {
    this.persistToken.deleteToken("accessToken");
    this.persistToken.deleteToken("refreshToken");
    this.persistToken.deleteToken("idToken");
  }


  async tokenFlow(url: string) {
    log("Receive authorization response.");
    const parseUrl = new URL(url);
    this.auth.authorizationResponse = new AuthorizationResponse({
      code: parseUrl.searchParams.get("code"),
      state: parseUrl.searchParams.get("state"),
    });
    await this.auth.makeTokenRequest();
    await this.auth.refreshAccessToken();
    this.fetchUserInfo();
    log("Token request complete, save token to local storage")
    this.persistToken.setToken("accessToken", this.getToken("accessToken"));
    this.persistToken.setToken("refreshToken", this.getToken("refreshToken"));
    this.persistToken.setToken("idToken", this.getToken("idToken"));
  }
  
  deepLinking(protocol: string) {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])])
      }
    } else {
      app.setAsDefaultProtocolClient(protocol)
    }
  
    const gotTheLock = app.requestSingleInstanceLock()
    let redirectUri
    if (!gotTheLock) {
      app.quit()
    } else {
      app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (this.mainWindow) {
          if (this.mainWindow.isMinimized()) this.mainWindow.restore()
          this.mainWindow.focus()
        }
        redirectUri = commandLine.pop()
        // dialog.showErrorBox('Welcome Back windows', `You arrived from: ${commandLine.pop().slice(0, -1)}`)
        log(redirectUri) 
        this.tokenFlow(redirectUri)
      })
      app.on('open-url', (event, url) => {
        // dialog.showErrorBox('Welcome Back mac/linux', `You arrived from: ${url}`)
        redirectUri = url
        log(redirectUri)
        this.tokenFlow(redirectUri)
      })
    }
  }
}
