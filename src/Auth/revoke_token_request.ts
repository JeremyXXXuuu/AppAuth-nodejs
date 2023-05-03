import {StringMap} from './types';

/**
 * Supported token types
 */
export type TokenTypeHint = 'refresh_token'|'access_token';

/**
 * Represents the Token Request as JSON.
 */
export interface RevokeTokenRequestJson {
  token: string;
  token_type_hint?: TokenTypeHint;
  client_id?: string;
  client_secret?: string;
}

/**
 * Represents a revoke token request.
 * For more information look at:
 * https://tools.ietf.org/html/rfc7009#section-2.1
 */
export class RevokeTokenRequest {
  token: string;
  tokenTypeHint: TokenTypeHint|undefined;
  clientId: string|undefined;
  clientSecret: string|undefined;

  constructor(request: RevokeTokenRequestJson) {
    this.token = request.token;
    this.tokenTypeHint = request.token_type_hint;
    this.clientId = request.client_id;
    this.clientSecret = request.client_secret;
  }

  /**
   * Serializes a TokenRequest to a JavaScript object.
   */
  toJson(): RevokeTokenRequestJson {
    let json: RevokeTokenRequestJson = {token: this.token};
    if (this.tokenTypeHint) {
      json['token_type_hint'] = this.tokenTypeHint;
    }
    if (this.clientId) {
      json['client_id'] = this.clientId;
    }
    if (this.clientSecret) {
      json['client_secret'] = this.clientSecret;
    }
    return json;
  }

  toStringMap(): StringMap {
    let json = this.toJson();
    // :(
    return (json as any);
  }
}
