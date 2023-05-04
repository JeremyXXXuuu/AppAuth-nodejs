import {StringMap}            from './types';
import {log}                  from '../logger';
import {Crypto, DefaultCrypto} from './crypto_utils';
/**
 * Represents an AuthorizationRequest as JSON.
 */
export interface AuthorizationRequestJson {
    response_type: string;
    client_id: string;
    redirect_uri: string;
    scope: string;
    state?: string;
    extras?: StringMap;
    internal?: StringMap;
  }

  /**
 * Generates a cryptographically random new state. Useful for CSRF protection.
 */
const SIZE = 10;  // 10 bytes
const newState = function(crypto: Crypto): string {
  return crypto.generateRandom(SIZE);
};

/**
 * Represents the AuthorizationRequest.
 * For more information look at
 * https://tools.ietf.org/html/rfc6749#section-4.1.1
 */
export class AuthorizationRequest {
    static RESPONSE_TYPE_TOKEN = 'token';
    static RESPONSE_TYPE_CODE = 'code';

    // NOTE:
    // Both redirect_uri and state are actually optional.
    // However AppAuth is more opionionated, and requires you to use both.

    clientId: string;
    redirectUri: string;
    scope: string;
    responseType: string;
    state: string;
    extras?: StringMap;
    internal?: StringMap;
    /**
     * Constructs a new AuthorizationRequest.
     * Use a `undefined` value for the `state` parameter, to generate a random
     * state for CSRF protection.
     */
    constructor(
        request: AuthorizationRequestJson,
        private crypto: Crypto = new DefaultCrypto(),
        private usePkce: boolean = true) {
      this.clientId = request.client_id;
      this.redirectUri = request.redirect_uri;
      this.scope = request.scope;
      this.responseType = request.response_type || AuthorizationRequest.RESPONSE_TYPE_CODE;
      this.state = request.state || newState(crypto);
      this.extras = request.extras;
      // read internal properties if available
      this.internal = request.internal;
    }

    async setupCodeVerifier(): Promise<void> {
      if (!this.usePkce) {
        return Promise.resolve();
      } else {
        const codeVerifier = this.crypto.generateRandom(128);
        const challenge: Promise<string|undefined> =
            this.crypto.deriveChallenge(codeVerifier).catch(error => {
              log('Unable to generate PKCE challenge. Not using PKCE', error);
              return undefined;
            });
        const result = await challenge;
          if (result) {
              // keep track of the code used.
              this.internal = this.internal || {};
              this.internal['code_verifier'] = codeVerifier;
              this.extras = this.extras || {};
              this.extras['code_challenge'] = result;
              // We always use S256. Plain is not good enough.
              this.extras['code_challenge_method'] = 'S256';
          }
      }
    }

    /**
     * Serializes the AuthorizationRequest to a JavaScript Object.
     */
    async toJson(): Promise<AuthorizationRequestJson> {
      // Always make sure that the code verifier is setup when toJson() is called.
      await this.setupCodeVerifier();
        return {
            response_type: this.responseType,
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: this.scope,
            state: this.state,
            extras: this.extras,
            internal: this.internal
        };
    }
  }
