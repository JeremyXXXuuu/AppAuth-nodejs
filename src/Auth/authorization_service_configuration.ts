import {FetchRequestor, Requestor} from './xhr';

/**
 * Represents AuthorizationServiceConfiguration as a JSON object.
 */
export interface AuthorizationServiceConfigurationJson {
    authorization_endpoint: string;
    token_endpoint: string;
    revocation_endpoint: string;
    end_session_endpoint?: string;
    userinfo_endpoint?: string;
  }

  /**
 * The standard base path for well-known resources on domains.
 * See https://tools.ietf.org/html/rfc5785 for more information.
 */
const WELL_KNOWN_PATH = '.well-known';

/**
 * The standard resource under the well known path at which an OpenID Connect
 * discovery document can be found under an issuer's base URI.
 */
const OPENID_CONFIGURATION = 'openid-configuration';

/**
 * Configuration details required to interact with an authorization service.
 *
 * More information at https://openid.net/specs/openid-connect-discovery-1_0-17.html
 */
export class AuthorizationServiceConfiguration {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string;
  userInfoEndpoint?: string;
  endSessionEndpoint?: string;

  constructor(request: AuthorizationServiceConfigurationJson) {
    this.authorizationEndpoint = request.authorization_endpoint;
    this.tokenEndpoint = request.token_endpoint;
    this.revocationEndpoint = request.revocation_endpoint;
    this.userInfoEndpoint = request.userinfo_endpoint;
    this.endSessionEndpoint = request.end_session_endpoint;
  }

  toJson(): AuthorizationServiceConfigurationJson {
    return {
      authorization_endpoint: this.authorizationEndpoint,
      token_endpoint: this.tokenEndpoint,
      revocation_endpoint: this.revocationEndpoint,
      end_session_endpoint: this.endSessionEndpoint,
      userinfo_endpoint: this.userInfoEndpoint
    };
  }

  static async fetchFromIssuer(openIdIssuerUrl: string, requestor?: Requestor):
      Promise<AuthorizationServiceConfiguration> {
    const fullUrl = `${openIdIssuerUrl}/${WELL_KNOWN_PATH}/${OPENID_CONFIGURATION}`;

    const requestorToUse = requestor || new FetchRequestor();

    const json = await requestorToUse
      .xhr<AuthorizationServiceConfigurationJson>({ url: fullUrl, dataType: 'json', method: 'GET' });
    return new AuthorizationServiceConfiguration(json);
  }
}
