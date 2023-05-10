import {StringMap} from './types';

export const GRANT_TYPE_AUTHORIZATION_CODE = 'authorization_code';
export const GRANT_TYPE_REFRESH_TOKEN = 'refresh_token';

/**
 * Represents the Token Request as JSON.
 */
export interface TokenRequestJson {
  grant_type: string;
  code?: string;
  refresh_token?: string, redirect_uri: string;
  client_id: string;
  client_secret?: string;
  extras?: StringMap;
}

/**
 * Represents an Access Token request.
 * For more information look at:
 * https://tools.ietf.org/html/rfc6749#section-4.1.3
 */
export class TokenRequest {
    clientId: string;
    clinetSecret: string|undefined;
    redirectUri: string;
    grantType: string;
    code: string|undefined;
    refreshToken: string|undefined;
    extras: StringMap|undefined

    constructor(request: TokenRequestJson) {
      this.clientId = request.client_id;
      this.clinetSecret = request.client_secret;
      this.redirectUri = request.redirect_uri;
      this.grantType = request.grant_type;
      this.code = request.code;
      this.refreshToken = request.refresh_token;
      this.extras = request.extras;
    }

    /**
     * Serializes a TokenRequest to a JavaScript object.
     */
    toJson(): TokenRequestJson {
      return {
        grant_type: this.grantType,
        code: this.code,
        refresh_token: this.refreshToken,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clinetSecret,
        extras: this.extras
      };
    }

    toStringMap(): StringMap {
      const map: StringMap = {
        grant_type: this.grantType,
        client_id: this.clientId,
        redirect_uri: this.redirectUri
      };

      if (this.code) {
        map['code'] = this.code;
      }

      if(this.clinetSecret) {
        map['client_secret'] = this.clinetSecret;
      }

      if (this.refreshToken) {
        map['refresh_token'] = this.refreshToken;
      }

      // copy over extras
      if (this.extras) {
        for (const extra in this.extras) {
          // eslint-disable-next-line no-prototype-builtins
          if (this.extras.hasOwnProperty(extra) && !map.hasOwnProperty(extra)) {
            // check before inserting to requestMap
            map[extra] = this.extras[extra];
          }
        }
      }
      return map;
    }
}
