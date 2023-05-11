import { TokenRequestHandler } from './token_request_handler';
import { AuthorizationRequestHandler } from './authorization_request_handler';
import { AuthorizationServiceConfiguration } from './authorization_service_configuration';
import { log } from '../logger';
import { EventEmitter } from 'events';
import { AuthorizationRequest } from './authorization_request';
import { AuthorizationResponse, AuthorizationError } from './authorization_response';
import { StringMap } from './types';
import { NodeCrypto } from './crypto_utils';
import { GRANT_TYPE_AUTHORIZATION_CODE, GRANT_TYPE_REFRESH_TOKEN, TokenRequest } from './token_request';
import { TokenError, TokenResponse } from './token_response';
import opener = require('opener');

class ServerEventsEmitter extends EventEmitter {
    static ON_UNABLE_TO_START = 'unable_to_start';
    static ON_AUTHORIZATION_RESPONSE = 'authorization_response';
  }

interface AuthState {
    isAuthorizationComplete: boolean;
    isTokrnRequestComplete: boolean;
}
export class Auth {
    authState : AuthState = {
        isAuthorizationComplete: false,
        isTokrnRequestComplete: false,
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

    constructor(openIdConnectUrl: string, clientId: string, redirectUri: string, scope: string,  responseType: string, extras?: StringMap) {
        this.openIdConnectUrl = openIdConnectUrl;
        this.authorizationRequest = new AuthorizationRequest({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scope,
            response_type: responseType,
            state: undefined,
            extras: extras,
        }, new NodeCrypto());

        this.tokenRequest = new TokenRequest({
          client_id: clientId,
          client_secret: undefined,
          redirect_uri: redirectUri,
          grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
          code: undefined,
          refresh_token: undefined,
          extras: undefined
        });

        this.authorizationRequestHandler = new AuthorizationRequestHandler(8000, this.emmiter);
        this.tokenRequestHandler = new TokenRequestHandler();
      }



    async fetchServiceConfiguration(): Promise<AuthorizationServiceConfiguration> {
        log("Fetching service configuration", this.openIdConnectUrl)
        try {
            const response = await AuthorizationServiceConfiguration.fetchFromIssuer(this.openIdConnectUrl);
            log('Fetched service configuration', response);
            this.configuration = response;
            return response;
        } catch (error) {
            log('Something bad happened', error);
            log(`Something bad happened ${error}`);
        }
      }

    async makeAuthRequest(): Promise<void> {
      if (!this.authorizationRequestHandler.authorizationPromise) {
        log('Authorization request handler is not ready');
      }
      if (!this.configuration) {
        log("Unknown service configuration");
        return;
      }
      log('Making authorization request', this.authorizationRequest);
      this.authorizationRequestHandler.performAuthorizationRequest(
        this.configuration,
        this.authorizationRequest,
      );
      const result = await this.authorizationRequestHandler.authorizationPromise;
      this.authorizationResponse = result.response;
      this.authorizationError = result.error;
      this.authState.isAuthorizationComplete = true;
    }

    getCode(): string {
      return this.authorizationResponse.code;
    }

    async makeTokenRequest(): Promise<void> {
      if (!this.configuration) {
        log("Unknown service configuration");
        return;
      }
      if(!this.authState.isAuthorizationComplete) {
        log('Authorization is not complete, cannot make token request');
        return;
      }
      let extras: StringMap|undefined = undefined;
      if (this.authorizationRequest && this.authorizationRequest.internal) {
        extras = {};
        extras['code_verifier'] = this.authorizationRequest.internal['code_verifier'];
      }
      this.tokenRequest.code = this.authorizationResponse.code;
      this.tokenRequest.extras = extras;
      log('Making token request', this.tokenRequest);
      const response = await this.tokenRequestHandler.performTokenRequest(this.configuration, this.tokenRequest);
      this.tokenResponse = response;
      log('Token response', this.tokenResponse);
      this.authState.isTokrnRequestComplete = true;
      log('Refresh token is', this.tokenResponse.refreshToken);

    }

    async refreshAccessToken(): Promise<string> {
      if(!this.authState.isTokrnRequestComplete) {
        log('Token request is not complete, cannot refresh access token');
        return;
      }
      if (!this.configuration) {
        log("Unknown service configuration");
        return;
      }
      if(!this.tokenResponse.refreshToken) {
        log('Refresh token is not available, cannot refresh access token');
        return;
      }
      if(this.tokenResponse && this.tokenResponse.isValid()) {
        log('Access token is still valid, no need to refresh');
        return this.tokenResponse.accessToken;
      }
      const request = this.tokenRequest;
      request.code = undefined;
      request.refreshToken = this.tokenResponse.refreshToken;
      request.extras = undefined;
      request.grantType = GRANT_TYPE_REFRESH_TOKEN;
      log('Refreshing access token', request);
      const response = await this.tokenRequestHandler.performTokenRequest(this.configuration, request);
      this.tokenResponse = response;
      if (!this.tokenResponse.accessToken) {
        throw new Error('No access token available, refresh AccessToken failed');
      }
      if (!this.tokenResponse.refreshToken) {
        this.tokenResponse.refreshToken = request.refreshToken;
      }
      log('Access Token is', this.tokenResponse.accessToken);
      return this.tokenResponse.accessToken;
    }

    async performWithToken<T>(callback: (accessToken: string) => Promise<T>): Promise<T> {
      const accessToken = await this.refreshAccessToken();
      if (typeof accessToken === 'string') {
        return callback(accessToken);
      } else {
        throw new Error('Access token is not available');
      }
    }

    async fetchUserInfo(): Promise<JSON> {
      if (!this.configuration) {
        log("Unknown service configuration");
        return;
      }
      if(!this.authState.isTokrnRequestComplete) {
        log('Token request is not complete, cannot fetch user info');
        return;
      }
      const response = await this.performWithToken(async (accessToken) => {
        const request =
        new Request(this.configuration.userInfoEndpoint, {
          headers: new Headers({ 'Authorization': `Bearer ${accessToken}` }),
          method: 'GET',
          cache: 'no-cache'
        });
        const response = await fetch(request);
        const json = await response.json();
        return json;
      });
      return response;
    }

    async logout(): Promise<void> {
      this.authState.isAuthorizationComplete = false;
      this.authState.isTokrnRequestComplete = false;
      opener(this.configuration.endSessionEndpoint);
    }
}

