import { Auth } from "./Auth/auth";
import { TokenResponse } from "./Auth/token_response";
import { StringMap } from "./Auth/types";
import { AuthorizationResponse } from "./Auth/authorization_response";
import { app } from "electron";
import * as path from "path";
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

export class DeepLinkAuthClient {
  private log: Logger = new Logger("DeepLinkAuthClient");
  private auth: Auth;
  private userInfo: UserInfo | null = null;
  private persistToken: PersistTokenAdapter;
  private mainWindow: Electron.BrowserWindow | null = null;
  constructor(
    providers: Provider,
    persistToken: PersistTokenAdapter,
    mainWindow: Electron.BrowserWindow | null,
    protocol: string,
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
    this.mainWindow = mainWindow;
    this.deepLinking(protocol);
  }

  init(): void {
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

  async authFlow(): Promise<void> {
    this.log.verbose("start auth flow");
    this.log.verbose("Service configuration fetched");
    this.auth.openAuthUrl();
  }

  async handleLocalToken(): Promise<boolean> {
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

  fetchUserInfo(): Promise<UserInfo | void> {
    if (!this.auth.authState.isTokenRequestComplete) {
      this.log.verbose("Token request not complete. Please sign in first");
      return Promise.resolve();
    }
    this.log.verbose("Fetching Oro user info");
    return this.auth.fetchUserInfo().then((userInfo) => {
      this.log.verbose("User Info ", JSON.stringify(userInfo));
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
      this.log.verbose("Token request not complete. Please sign in first");
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

  async tokenFlow(url: string): Promise<void> {
    this.log.verbose("Receive authorization response.");
    const parseUrl = new URL(url);
    this.auth.authorizationResponse = new AuthorizationResponse({
      code: parseUrl.searchParams.get("code"),
      state: parseUrl.searchParams.get("state"),
    });
    await this.auth.makeTokenRequest();
    await this.auth.refreshAccessToken();
    this.fetchUserInfo();
    this.log.verbose("Token request complete, save token to local storage");
    this.persistToken.setToken("accessToken", this.getToken("accessToken"));
    this.persistToken.setToken("refreshToken", this.getToken("refreshToken"));
    this.persistToken.setToken("idToken", this.getToken("idToken"));
  }

  deepLinking(protocol: string): void {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(protocol, process.execPath, [
          path.resolve(process.argv[1]),
        ]);
      }
    } else {
      app.setAsDefaultProtocolClient(protocol);
    }

    const gotTheLock = app.requestSingleInstanceLock();
    let redirectUri;
    if (!gotTheLock) {
      app.quit();
    } else {
      app.on("second-instance", (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (this.mainWindow) {
          if (this.mainWindow.isMinimized()) this.mainWindow.restore();
          this.mainWindow.focus();
        }
        redirectUri = commandLine.pop();
        // dialog.showErrorBox('Welcome Back windows', `You arrived from: ${commandLine.pop().slice(0, -1)}`)
        this.log.verbose(redirectUri);
        this.tokenFlow(redirectUri);
      });
      app.on("open-url", (event, url) => {
        // dialog.showErrorBox('Welcome Back mac/linux', `You arrived from: ${url}`)
        redirectUri = url;
        this.log.verbose(redirectUri);
        this.tokenFlow(redirectUri);
      });
    }
  }
}
