import { AuthorizationServiceConfiguration } from "./authorization_service_configuration";
import { TokenRequest } from "./token_request";
import {
  RevokeTokenRequest
} from "./revoke_token_request";
import { Requestor, FetchRequestor } from "./xhr";
import { QueryStringUtils, BasicQueryStringUtils } from "./query_string_utils";
import {
  TokenError,
  TokenErrorJson,
  TokenResponse,
  TokenResponseJson,
} from "./token_response";
import { AppAuthError } from "./error";
/**
 * Represents an interface which can make a token request.
 */
export interface TokenRequestHandler {
  /**
   * Performs the token request, given the service configuration.
   */
  performTokenRequest(
    configuration: AuthorizationServiceConfiguration,
    request: TokenRequest
  ): Promise<TokenResponse>;

  performRevokeTokenRequest(
    configuration: AuthorizationServiceConfiguration,
    request: RevokeTokenRequest
  ): Promise<boolean>;
}

export class TokenRequestHandler implements TokenRequestHandler {
  constructor(
    public readonly requestor: Requestor = new FetchRequestor(),
    public readonly utils: QueryStringUtils = new BasicQueryStringUtils()
  ) {}

  private isTokenResponse(
    response: TokenResponseJson | TokenErrorJson
  ): response is TokenResponseJson {
    return (response as TokenErrorJson).error === undefined;
  }

  async performRevokeTokenRequest(
    configuration: AuthorizationServiceConfiguration,
    request: RevokeTokenRequest
  ): Promise<boolean> {
    const revokeTokenResponse = this.requestor.xhr<boolean>({
      url: configuration.revocationEndpoint,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: this.utils.stringify(request.toStringMap()),
    });

    await revokeTokenResponse;
    return true;
  }

  async performTokenRequest(
    configuration: AuthorizationServiceConfiguration,
    request: TokenRequest
  ): Promise<TokenResponse> {
    const tokenResponse = this.requestor.xhr<TokenResponseJson | TokenErrorJson>({
      url: configuration.tokenEndpoint,
      method: "POST",
      dataType: "json", // adding implicit dataType
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: this.utils.stringify(request.toStringMap()),
    });

    const response = await tokenResponse;
    if (this.isTokenResponse(response)) {
      return new TokenResponse(response);
    } else {
      return Promise.reject<TokenResponse>(
        new AppAuthError(response.error, new TokenError(response))
      );
    }
  }
}
