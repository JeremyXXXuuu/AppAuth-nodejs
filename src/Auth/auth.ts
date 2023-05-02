import {TokenRequestHandler} from './token_request_handler';
import {AuthorizationRequestHandler, AuthorizationRequestResponse} from './authorization_request_handler';
import { AuthorizationServiceConfiguration } from './authorization_service_configuration';
import {log} from '../logger';
import {EventEmitter} from 'events';
import { AuthorizationRequest } from './authorization_request';
import { AuthorizationResponse, AuthorizationError } from './authorization_response';
import { StringMap } from './types';
import { NodeCrypto } from './crypto_utils';
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

    tokenRequestHandler: TokenRequestHandler;

    // tokenResponse: TokenResponse,
    // tokenError: TokenError,
    openIdConnectUrl: string;
    configuration: AuthorizationServiceConfiguration;
    emmiter: ServerEventsEmitter = new ServerEventsEmitter();

    constructor(openIdConnectUrl: string, clientId: string, redirectUri: string, scope: string,  responseType: string) {
        this.openIdConnectUrl = openIdConnectUrl;
        this.authorizationRequest = new AuthorizationRequest({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scope,
            response_type: responseType,
            state: undefined,
        }, new NodeCrypto());

        this.authorizationRequestHandler = new AuthorizationRequestHandler(8000, this.emmiter);
    }



    async fetchServiceConfiguration(): Promise<void> {
        log("Fetching service configuration", this.openIdConnectUrl)
        try {
            const response = await AuthorizationServiceConfiguration.fetchFromIssuer(this.openIdConnectUrl);
            log('Fetched service configuration', response);
            this.configuration = response;
        } catch (error) {
            log('Something bad happened', error);
            log(`Something bad happened ${error}`);
        }
      }

    async authRequest(): Promise<void> {

      if (!this.authorizationRequestHandler.authorizationPromise) {
        log('Authorization request handler is not ready');
      }
      // this.emmiter.once(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, (res: AuthorizationRequestResponse) => {
      //   log('Authorization request complete form AUTH', res);
      // });
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

    // async tokenRequest(code: string, codeVerifier: string): Promise<void> {

    // }

}

