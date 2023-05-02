import {TokenRequestHandler} from './token_request_handler';
import {AuthorizationRequestHandler, AuthorizationRequestResponse} from './authorization_request_handler';
import { AuthorizationServiceConfiguration } from './authorization_configuration';
import {log} from '../logger';
import {EventEmitter} from 'events';
import { AuthorizationRequest } from './authorization_request';
import { AuthorizationResponse, AuthorizationError } from './authorization_response';
import { StringMap } from './types';
class ServerEventsEmitter extends EventEmitter {
    static ON_UNABLE_TO_START = 'unable_to_start';
    static ON_AUTHORIZATION_RESPONSE = 'authorization_response';
  }

interface AuthState {
    isAuthorizationComplete: boolean;
    isTokrnRequestComplete: boolean;
}
export class Auth {

    authState : AuthState;
    authorizationServiceConfiguration: AuthorizationServiceConfiguration;

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

    constructor(openIdConnectUrl: string, clientId: string, redirectUri: string, scope: string, state: string,  responseType: string) {
        this.openIdConnectUrl = openIdConnectUrl;
        this.authorizationRequest = new AuthorizationRequest({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scope,
            response_type: responseType,
            state: state,
        });

        this.emmiter.once(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, (res: AuthorizationRequestResponse) => {
            log('Authorization request complete ',  res);
            this.authorizationResponse = res.response;
            this.authorizationError = res.error;
            this.authState.isAuthorizationComplete = true;

            if (this.authorizationResponse) {
                this.tokenRequest(this.authorizationResponse.code, this.authorizationRequest.internal.code_verifier);
            }

        });

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
        log('Making authorization request', this.authorizationRequest);
        if (!this.configuration) {
            log("Unknown service configuration");
            return;
          }
        const request = await this.authorizationRequestHandler.performAuthorizationRequest(
            this.configuration,
            this.authorizationRequest,
        );
    }

    async tokenRequest(code: string, codeVerifier: string): Promise<void> {

    }

}

