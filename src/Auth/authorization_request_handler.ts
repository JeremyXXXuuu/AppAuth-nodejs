/* eslint-disable no-prototype-builtins */
import * as Http from "http";
import * as Url from "url";
import { AuthorizationRequest } from "./authorization_request";
import { BasicQueryStringUtils } from "./query_string_utils";
import { AuthorizationServiceConfiguration } from "./authorization_service_configuration";
import { Crypto, NodeCrypto } from "./crypto_utils";
import { Log, Logger } from '@orosound/log';
import { EventEmitter } from "events";
import { StringMap } from "./types";
import { AuthorizationResponse, AuthorizationError } from "./authorization_response";

import opener = require('opener');

export const BUILT_IN_PARAMETERS = [
  "redirect_uri",
  "client_id",
  "response_type",
  "state",
  "scope",
];
/**
 * Represents a structural type holding both authorization request and response.
 */
export interface AuthorizationRequestResponse {
  request: AuthorizationRequest;
  response: AuthorizationResponse|null;
  error: AuthorizationError|null;
}

class ServerEventsEmitter extends EventEmitter {
  static ON_UNABLE_TO_START = "unable_to_start";
  static ON_AUTHORIZATION_RESPONSE = "authorization_response";
}

export class AuthorizationRequestHandler {
  authorizationPromise: Promise<AuthorizationRequestResponse|null>|null = null;
  emitter: ServerEventsEmitter|null = null;
  server: Http.Server|null = null;
  log: Logger;
  constructor(
    public httpServerPort: number,
    log: Log,
    public utils = new BasicQueryStringUtils(),
    protected crypto: Crypto = new NodeCrypto()
  ) {
    this.emitter = new ServerEventsEmitter();
    this.log = log.logger('AuthorizationRequestHandler');
  }

  async completeAuthorizationRequestIfPossible(): Promise<void> {
    const result_1 = await this.completeAuthorizationRequest();
    if (!result_1) {
      this.log.verbose(`No result is available yet.`);
    }
    if (result_1) {
      this.log.verbose(`Receive authorization response.`);
    }
  }

  completeAuthorizationRequest(): Promise<AuthorizationRequestResponse> {
    if (!this.authorizationPromise) {
      return Promise.reject(
        'No pending authorization request. Call performAuthorizationRequest() ?');
    }
    return this.authorizationPromise;
  }



  buildRequestUrl(
    configuration: AuthorizationServiceConfiguration,
    request: AuthorizationRequest
  ): string {
    // build the query string
    // coerce to any type for convenience
    // eslint-disable-next-line prefer-const
    let requestMap: StringMap = {
      redirect_uri: request.redirectUri,
      client_id: request.clientId,
      response_type: request.responseType,
      state: request.state,
      scope: request.scope,
    };

    // copy over extras
    if (request.extras) {
      for (const extra in request.extras) {
        if (request.extras.hasOwnProperty(extra)) {
          // check before inserting to requestMap
          if (BUILT_IN_PARAMETERS.indexOf(extra) < 0) {
            requestMap[extra] = request.extras[extra];
          }
        }
      }
    }

    const query = this.utils.stringify(requestMap);
    const baseUrl = configuration.authorizationEndpoint;
    const url = `${baseUrl}?${query}`;
    return url;
  }

  performAuthorizationRequest(
    configuration: AuthorizationServiceConfiguration,
    request: AuthorizationRequest,
  ): void {
    this.emitter.emit(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, null);

    this.authorizationPromise = new Promise<AuthorizationRequestResponse>((resolve, reject) => {
      this.log.verbose("Authorization Flow pending .......");
      this.emitter.once(ServerEventsEmitter.ON_UNABLE_TO_START, () => {
        reject(`Unable to create HTTP server at port ${this.httpServerPort}`);
      });
      this.log.verbose('regestering ON_AUTHORIZATION_RESPONSE event');
      this.emitter.once(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, (result: unknown) => {
        // Set timeout for the server connections to 1 ms as we wish to close and end the server
        // as soon as possible. This prevents a user failing to close the redirect window from
        // causing a hanging process due to the server.
        this.server.setTimeout(1);
        this.log.verbose("closing server");
        this.server.close();
        // resolve pending promise
        resolve(result as AuthorizationRequestResponse);
        // complete authorization flow
        this.log.verbose("Authorization Flow complete")
        this.completeAuthorizationRequestIfPossible();
      });
    });

    const requestHandler = (
      httpRequest: Http.IncomingMessage,
      httpResponse: Http.ServerResponse
    ) => {
      if (!httpRequest.url) {
        return;
      }
      const url = httpRequest.url;
      const urlParts = Url.parse(url ? url : "", true);
      const query = urlParts.query;
      const requestState = query.state as string;
      const code = query.code as string;
      const error = query.error as string;
      const errorDescription = query.error_description as string;
      const errorUri = query.error_uri as string;
      if (!requestState || (!code && !error)) {
        // httpResponse.statusCode = 500;
        // httpResponse.end();
        return;
      }
      // if (requestState !== request.state) {
      //   httpResponse.statusCode = 500;
      //   httpResponse.end();
      //   return;
      // }
      this.log.verbose("Handling Authorization Request ", JSON.stringify(query), requestState, code, error);
      let authorizationResponse: AuthorizationResponse|null = null;
      let authorizationError: AuthorizationError|null = null;
      if(query.error) {
        authorizationError = new AuthorizationError( {error: error, error_description: errorDescription, error_uri: errorUri, state: requestState});
      } else {
        authorizationResponse = new AuthorizationResponse({ code: code, state: requestState });
      }
      const completeResponse: AuthorizationRequestResponse = {
        request,
        response: authorizationResponse,
        error: authorizationError
      };
      this.log.verbose("emitted authorization response")
      this.emitter.emit(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, completeResponse);
      httpResponse.setHeader("Content-Type", "text/html");
      // httpResponse.statusCode = 200;
      httpResponse.end("<html><body><h1>You can now close this window</h1></body></html>");
      this.log.verbose("repsonse end")
    };
    request
      .setupCodeVerifier()
      .then(() => {
        this.server = Http.createServer(requestHandler);
        this.log.verbose("Created HTTP server ")
        this.server.listen(this.httpServerPort);
        const url = this.buildRequestUrl(configuration, request);
        this.log.verbose("Making a request to ", request, url);
        // open authorization request in external browser
        opener(url);
      })
      .catch((error) => {
        this.log.error("Something bad happened ", error);
        this.emitter.emit(ServerEventsEmitter.ON_UNABLE_TO_START);
      });
  }
}
