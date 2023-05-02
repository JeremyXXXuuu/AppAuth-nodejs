/**
 * Represents the AuthorizationResponse as a JSON object.
 */
export interface AuthorizationResponseJson {
    code: string;
    state: string;
  }

  /**
 * Represents the AuthorizationError as a JSON object.
 */
export interface AuthorizationErrorJson {
    error: string;
    error_description?: string;
    error_uri?: string;
    state?: string;
  }
  
  /**
 * Represents the Authorization Response type.
 * For more information look at
 * https://tools.ietf.org/html/rfc6749#section-4.1.2
 */
export class AuthorizationResponse {
    code: string;
    state: string;
  
    constructor(response: AuthorizationResponseJson) {
      this.code = response.code;
      this.state = response.state;
    }
  
    toJson(): AuthorizationResponseJson {
      return {code: this.code, state: this.state};
    }
  }
  

  /**
 * Represents the Authorization error response.
 * For more information look at:
 * https://tools.ietf.org/html/rfc6749#section-4.1.2.1
 */
export class AuthorizationError {
    error: string;
    errorDescription?: string;
    errorUri?: string;
    state?: string;
  
    constructor(error: AuthorizationErrorJson) {
      this.error = error.error;
      this.errorDescription = error.error_description;
      this.errorUri = error.error_uri;
      this.state = error.state;
    }
  
    toJson(): AuthorizationErrorJson {
      return {
        error: this.error,
        error_description: this.errorDescription,
        error_uri: this.errorUri,
        state: this.state
      };
    }
  }