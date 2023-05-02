import * as Http from "http";
import * as Url from "url";
import { AuthorizationRequest } from "./authorization_request";
import { BasicQueryStringUtils, QueryStringUtils } from "./query_string_utils";
import { AuthorizationServiceConfiguration } from "./authorization_configuration";
import { Crypto, NodeCrypto } from "./crypto_utils";
import { log } from "../logger";
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
  constructor(
    public httpServerPort: number,
    emitter: ServerEventsEmitter,
    public utils = new BasicQueryStringUtils(),
    protected crypto: Crypto = new NodeCrypto()
  ) {
    this.emitter = emitter;
    this.authorizationPromise = new Promise<AuthorizationRequestResponse>((resolve, reject) => {
      emitter.once(ServerEventsEmitter.ON_UNABLE_TO_START, () => {
        reject(`Unable to create HTTP server at port ${this.httpServerPort}`);
      });
      emitter.once(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, (result: any) => {
        // Set timeout for the server connections to 1 ms as we wish to close and end the server
        // as soon as possible. This prevents a user failing to close the redirect window from
        // causing a hanging process due to the server.
        this.server.setTimeout(1);
        this.server.close();
        // resolve pending promise
        resolve(result as AuthorizationRequestResponse);
        // complete authorization flow
        this.completeAuthorizationRequestIfPossible();
      });
    });
  }
  completeAuthorizationRequestIfPossible(){

  }


  protected buildRequestUrl(
    configuration: AuthorizationServiceConfiguration,
    request: AuthorizationRequest
  ) {
    // build the query string
    // coerce to any type for convenience
    let requestMap: StringMap = {
      redirect_uri: request.redirectUri,
      client_id: request.clientId,
      response_type: request.responseType,
      state: request.state,
      scope: request.scope,
    };

    // copy over extras
    if (request.extras) {
      for (let extra in request.extras) {
        if (request.extras.hasOwnProperty(extra)) {
          // check before inserting to requestMap
          if (BUILT_IN_PARAMETERS.indexOf(extra) < 0) {
            requestMap[extra] = request.extras[extra];
          }
        }
      }
    }

    let query = this.utils.stringify(requestMap);
    let baseUrl = configuration.authorizationEndpoint;
    let url = `${baseUrl}?${query}`;
    return url;
  }

  async performAuthorizationRequest(
    configuration: AuthorizationServiceConfiguration,
    request: AuthorizationRequest,
  ): Promise<void> {
    const requestHandler = (
      httpRequest: Http.IncomingMessage,
      httpResponse: Http.ServerResponse
    ) => {
      if (!httpRequest.url) {
        return;
      }
      const url = httpRequest.url;
      const urlParts = Url.parse(url ? url : "", true);
      const search = urlParts.search;
      const query = urlParts.query;
      if (!search) {
        httpResponse.statusCode = 500;
        httpResponse.end();
        return;
      }
      const requestState = query.state as string;
      const code = query.code as string;
      const error = query.error as string;
      const errorDescription = query.error_description as string;
      const errorUri = query.error_uri as string;
      if (!requestState || (!code && !error)) {
        httpResponse.statusCode = 500;
        httpResponse.end();
        return;
      }
      if (requestState !== request.state) {
        httpResponse.statusCode = 500;
        httpResponse.end();
        return;
      }
      log("Handling Authorization Request ", query, requestState, code, error);
      let authorizationResponse: AuthorizationResponse|null = null;
      let authorizationError: AuthorizationError|null = null;
      if(query.error) {
        authorizationError = new AuthorizationError( {error: error, error_description: errorDescription, error_uri: errorUri, state: requestState});
      } else {
      authorizationResponse = new AuthorizationResponse({ code: code, state: requestState });
      }
      const res: AuthorizationRequestResponse = {
        request,
        response: authorizationResponse,
        error: authorizationError
      };
      this.emitter.emit(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, res);
      httpResponse.setHeader("Content-Type", "text/html");
      httpResponse.statusCode = 200;
      httpResponse.end("<html><body><h1>You can now close this window</h1></body></html>");
    };

    let server: Http.Server;
    request
      .setupCodeVerifier()
      .then(() => {
        server = Http.createServer(requestHandler);
        server.listen(this.httpServerPort);
        const url = this.buildRequestUrl(configuration, request);
        log("Making a request to ", request, url);
        // open authorization request in external browser
        opener(url);
      })
      .catch((error) => {
        log("Something bad happened ", error);
        this.emitter.emit(ServerEventsEmitter.ON_UNABLE_TO_START);
      });
  }
}
