import { TokenResponse, TokenError } from '../../Auth/token_response';

describe('Token Response Tests', () => {
  const accessToken = 'access_token';
  const idToken = 'id_token';

  it('should be able to construct a response', () => {
    const response = new TokenResponse({ access_token: accessToken, id_token: idToken });
    expect(response).toBeDefined();
    expect(response).not.toBeNull();
    expect(response.accessToken).toBe(accessToken);
    expect(response.idToken).toBe(idToken);
    expect(response.tokenType).toBe('bearer');
    expect(response.issuedAt).toBeTruthy();
    expect(response.isValid()).toBe(true);
    expect(response.refreshToken).toBeFalsy();
    expect(response.scope).toBeFalsy();

  });

  it('Test response token validity', () => {
    const response = new TokenResponse({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: '1000',
      refresh_token: undefined,
      scope: undefined,
      id_token: idToken,
      issued_at: 1
    });

    expect(response).not.toBeNull();
    expect(response.accessToken).toBe(accessToken);
    expect(response.idToken).toBe(idToken);
    expect(response.tokenType).toBe('bearer');
    expect(response.issuedAt).toBeTruthy();
    expect(response.isValid(0)).toBe(false);
    expect(response.refreshToken).toBeFalsy();
    expect(response.scope).toBeFalsy();
  });

  it('Basic Token Error Tests', () => {
    const error = new TokenError({error: 'invalid_client'});
    expect(error).toBeTruthy();
    expect(error.error).toBe('invalid_client');
    expect(error.errorDescription).toBeFalsy();
    expect(error.errorUri).toBeFalsy();
  });
});
