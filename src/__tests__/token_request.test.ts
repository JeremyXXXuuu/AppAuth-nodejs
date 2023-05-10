import { TokenRequest, GRANT_TYPE_AUTHORIZATION_CODE } from "../Auth/token_request";
import {StringMap} from '../Auth/types';

describe('Token Request tests', () => {
    const clientId = 'client_id';
    const redirectUri = 'http://my/redirect_uri';
    const code = 'some_code';
    const extras: StringMap = {'key': 'value'};

    const request: TokenRequest = new TokenRequest({
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
      code: code,
      refresh_token: undefined,
      extras: extras
    });

    it('Basic Token Request Tests', () => {
      expect(request).not.toBeNull();
      expect(request.clientId).toBe(clientId);
      expect(request.redirectUri).toBe(redirectUri);
      expect(request.code).toBe(code);
      expect(request.grantType).toBe(GRANT_TYPE_AUTHORIZATION_CODE);
      expect(request.extras).toBeTruthy();
      expect(request.extras?.['key']).toBe('value');
      expect(request.extras).toEqual(extras);
    });

    it('To Json() and from Json() should work', () => {
      const json = JSON.parse(JSON.stringify(request.toJson()));
      expect(json).not.toBeNull();
      const newRequest = new TokenRequest(json);
      expect(newRequest).not.toBeNull();
      expect(newRequest.clientId).toBe(clientId);
      expect(newRequest.redirectUri).toBe(redirectUri);
      expect(newRequest.code).toBe(code);
      expect(newRequest.grantType).toBe(GRANT_TYPE_AUTHORIZATION_CODE);
      expect(newRequest.extras).toBeTruthy();
      expect(newRequest.extras?.['key']).toBe('value');
      expect(newRequest.extras).toEqual(extras);
    });
  });
