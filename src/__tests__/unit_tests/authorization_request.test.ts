import { AuthorizationRequest, AuthorizationRequestJson } from "../../Auth/authorization_request";
import { StringMap } from "../../Auth/types";

describe("Authorization Request Tests", () => {
    const clientId = 'client_id';
    const redirectUri = 'http://my/redirect_uri';
    const scope = 'scope';
    const state = 'state';
    const extras: StringMap = {key: 'value'};

    const jsonRequest: AuthorizationRequestJson = {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
        scope: scope,
        state: state,
        extras: extras
      };

      const jsonRequest2: AuthorizationRequestJson = {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
        scope: scope,
        state: undefined,
        extras: extras
      };

      const jsonRequest3: AuthorizationRequestJson = {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: AuthorizationRequest.RESPONSE_TYPE_TOKEN,
        scope: scope,
        state: undefined,
        extras: extras
      };
      const request: AuthorizationRequest = new AuthorizationRequest(jsonRequest);
      const request2: AuthorizationRequest = new AuthorizationRequest(jsonRequest2);
      const request3: AuthorizationRequest = new AuthorizationRequest(jsonRequest3);

    it("should be able to construct a request", () => {
        expect(request).toBeDefined();
        expect(request2).toBeDefined();
        expect(request3).toBeDefined();
    });

    it("should be able to construct a request with a random state", () => {
        expect(request2.state).not.toBeNull();
        expect(request2.state.length).toBeGreaterThan(0);
    });
    it('To Json() and from Json() should work', () => {
        request.toJson().then(result => {
          const json = JSON.parse(JSON.stringify(result));
          expect(json).not.toBeNull();
          const newRequest = new AuthorizationRequest(json);
          expect(newRequest).not.toBeNull();
          expect(newRequest.responseType).toBe(AuthorizationRequest.RESPONSE_TYPE_CODE);
          expect(newRequest.clientId).toBe(clientId);
          expect(newRequest.redirectUri).toBe(redirectUri);
          expect(newRequest.scope).toBe(scope);
          expect(newRequest.state).toBe(state);
          expect(newRequest.extras).toBeTruthy();
          expect(newRequest.extras?.['key']).toBe('value');
          expect(newRequest.extras).toEqual(request.extras);
          expect(newRequest.internal).toEqual(request.internal);
        });
      });
});
