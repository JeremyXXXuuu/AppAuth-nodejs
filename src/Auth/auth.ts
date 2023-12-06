import { TokenRequestHandler } from "./token_request_handler";
import { AuthorizationRequestHandler } from "./authorization_request_handler";
import { AuthorizationServiceConfiguration } from "./authorization_service_configuration";
import { Logger } from "@orosound/log";
import { EventEmitter } from "events";
import { AuthorizationRequest } from "./authorization_request";
import {
  AuthorizationResponse,
  AuthorizationError,
} from "./authorization_response";
import { StringMap } from "./types";
import { NodeCrypto } from "./crypto_utils";
import {
  GRANT_TYPE_AUTHORIZATION_CODE,
  GRANT_TYPE_REFRESH_TOKEN,
  TokenRequest,
} from "./token_request";
import { TokenError, TokenResponse } from "./token_response";
import opener = require("opener");
import fetch from "node-fetch";

class ServerEventsEmitter extends EventEmitter {
  static ON_UNABLE_TO_START = "unable_to_start";
  static ON_AUTHORIZATION_RESPONSE = "authorization_response";
}

interface AuthState {
  isAuthorizationComplete: boolean;
  isTokenRequestComplete: boolean;
}
export class Auth {
  log: Logger = new Logger("AUTH");

  authState: AuthState = {
    isAuthorizationComplete: false,
    isTokenRequestComplete: false,
  };

  authorizationRequest: AuthorizationRequest;
  authorizationRequestHandler: AuthorizationRequestHandler;

  authorizationResponse: AuthorizationResponse;
  authorizationError: AuthorizationError;

  tokenRequest: TokenRequest;
  tokenRequestHandler: TokenRequestHandler;

  tokenResponse: TokenResponse;
  tokenError: TokenError;

  openIdConnectUrl: string;
  configuration: AuthorizationServiceConfiguration;
  emmiter: ServerEventsEmitter = new ServerEventsEmitter();

  constructor(
    openIdConnectUrl: string,
    clientId: string,
    redirectUri: string,
    scope: string,
    responseType: string,
    extras?: StringMap,
  ) {
    this.openIdConnectUrl = openIdConnectUrl;
    this.authorizationRequest = new AuthorizationRequest(
      {
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope,
        response_type: responseType,
        state: undefined,
        extras: extras,
      },
      new NodeCrypto(),
    );

    this.tokenRequest = new TokenRequest({
      client_id: clientId,
      client_secret: undefined,
      redirect_uri: redirectUri,
      grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
      code: undefined,
      refresh_token: undefined,
      extras: undefined,
    });

    this.authorizationRequestHandler = new AuthorizationRequestHandler(
      8000,
    );
    this.tokenRequestHandler = new TokenRequestHandler();
  }

  async fetchServiceConfiguration(): Promise<AuthorizationServiceConfiguration> {
    this.log.verbose("Fetching service configuration", this.openIdConnectUrl);
    try {
      const response = await AuthorizationServiceConfiguration.fetchFromIssuer(
        this.openIdConnectUrl,
      );
      this.log.verbose(
        "Fetched service configuration",
        JSON.stringify(response),
      );
      this.configuration = response;
      return response;
    } catch (error) {
      this.log.error("Something bad happened", JSON.stringify(error));
    }
  }

  async makeAuthRequest(): Promise<void> {
    if (!this.authorizationRequestHandler.authorizationPromise) {
      this.log.warn("Authorization request handler is not ready");
    }
    if (!this.configuration) {
      this.log.warn("Unknown service configuration");
      return;
    }
    this.log.verbose(
      "Making authorization request",
      JSON.stringify(this.authorizationRequest),
    );
    this.authorizationRequestHandler.performAuthorizationRequest(
      this.configuration,
      this.authorizationRequest,
    );
    const result = await this.authorizationRequestHandler.authorizationPromise;
    this.authorizationResponse = result.response;
    this.authorizationError = result.error;
    this.authState.isAuthorizationComplete = true;
  }

  async openAuthUrl(): Promise<void> {
    if (!this.authorizationRequest) {
      this.log.warn("Unknown authorization request");
      return;
    }
    await this.authorizationRequest.setupCodeVerifier();
    const url = this.authorizationRequestHandler.buildRequestUrl(
      this.configuration,
      this.authorizationRequest,
    );
    this.log.verbose("Making authorization request", url);
    opener(url);
    this.authState.isAuthorizationComplete = true;
  }

  getCode(): string {
    return this.authorizationResponse.code;
  }

  async makeTokenRequest(): Promise<void> {
    if (!this.configuration) {
      this.log.warn("Unknown service configuration");
      return;
    }
    if (!this.authState.isAuthorizationComplete) {
      this.log.warn("Authorization is not complete, cannot make token request");
      return;
    }
    let extras: StringMap | undefined = undefined;
    if (this.authorizationRequest && this.authorizationRequest.internal) {
      extras = {};
      extras["code_verifier"] =
        this.authorizationRequest.internal["code_verifier"];
    }
    this.tokenRequest.code = this.authorizationResponse.code;
    this.tokenRequest.extras = extras;
    this.log.verbose("Making token request", JSON.stringify(this.tokenRequest));
    const response = await this.tokenRequestHandler.performTokenRequest(
      this.configuration,
      this.tokenRequest,
    );
    this.tokenResponse = response;
    this.log.verbose("Token response", JSON.stringify(this.tokenResponse));
    this.authState.isTokenRequestComplete = true;
    this.log.verbose("Refresh token is", this.tokenResponse.refreshToken);
  }

  async refreshAccessToken(refreshToken?: string): Promise<string> {
    if (!this.authState.isTokenRequestComplete && !refreshToken) {
      this.log.warn(
        "Token request is not complete and no providing refreshToken, cannot refresh access token",
      );
      return;
    }
    if (!this.configuration) {
      this.log.warn("Unknown service configuration");
      return;
    }
    if (
      this.authState.isTokenRequestComplete &&
      !this.tokenResponse.refreshToken &&
      !refreshToken
    ) {
      this.log.warn(
        "Refresh token is not available, cannot refresh access token",
      );
      return;
    }
    if (this.tokenResponse && this.tokenResponse.isValid()) {
      this.log.verbose("Access token is still valid, no need to refresh");
      return this.tokenResponse.accessToken;
    }
    const request = new TokenRequest({
      client_id: this.tokenRequest.clientId,
      client_secret: this.tokenRequest.clientSecret,
      redirect_uri: this.tokenRequest.redirectUri,
      grant_type: GRANT_TYPE_REFRESH_TOKEN,
      code: undefined,
      refresh_token: refreshToken || this.tokenResponse.refreshToken,
      extras: undefined,
    });
    this.log.verbose("Refreshing access token", JSON.stringify(request));
    const response = await this.tokenRequestHandler.performTokenRequest(
      this.configuration,
      request,
    );
    this.tokenResponse = response;
    if (!this.tokenResponse.accessToken) {
      throw new Error("No access token available, refresh AccessToken failed");
    }
    if (!this.tokenResponse.refreshToken) {
      this.tokenResponse.refreshToken = request.refreshToken;
    }
    this.log.verbose("Access Token is", this.tokenResponse.accessToken);
    return this.tokenResponse.accessToken;
  }

  async performWithToken<T>(
    callback: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const accessToken = await this.refreshAccessToken();
    if (typeof accessToken === "string") {
      return callback(accessToken);
    } else {
      throw new Error("Access token is not available");
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async fetchUserInfo(): Promise<Object> {
    if (!this.configuration) {
      this.log.warn("Unknown service configuration");
      return;
    }
    if (!this.authState.isTokenRequestComplete) {
      this.log.warn("Token request is not complete, cannot fetch user info");
      return;
    }
    const response = await this.performWithToken(async (accessToken) => {
      const request_url = this.configuration.userInfoEndpoint.toString();

      const response = await fetch(request_url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        method: "post",
      });
      const json = await response.json();
      return json;
    });
    return response;
  }

  async logout(): Promise<void> {
    this.authState.isAuthorizationComplete = false;
    this.authState.isTokenRequestComplete = false;
    opener(this.configuration.endSessionEndpoint);
  }
}
