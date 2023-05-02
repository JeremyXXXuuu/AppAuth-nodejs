import { Auth } from "../Auth/auth";

describe('Auth tests', () => {
    const openIdConnectUrl = "https://staging.auth.orosound.com";
    const clientId = "foo";
    const redirectUri = "http://127.0.0.1:8000";
    const scope = "openid profile email";
    const responseType = "code";

    const authFlow = new Auth(openIdConnectUrl, clientId, redirectUri, scope, responseType);
    it('Initialization should work', () => {
        expect(authFlow).toBeTruthy();
        expect(authFlow.openIdConnectUrl).toBe(openIdConnectUrl);
        expect(authFlow.authorizationRequest).toBeTruthy();
        expect(authFlow.authorizationRequest.clientId).toBe(clientId);
        expect(authFlow.authorizationRequest.redirectUri).toBe(redirectUri);
        expect(authFlow.authorizationRequest.scope).toBe(scope);
        expect(authFlow.authorizationRequest.responseType).toBe(responseType);
    });

    it('fetchServiceConfiguration should work', async () => {
        await authFlow.fetchServiceConfiguration();
        expect(authFlow.configuration).toBeTruthy();
        expect(authFlow.configuration.authorizationEndpoint).toBeTruthy();
        expect(authFlow.configuration.tokenEndpoint).toBeTruthy();
    });

    it('makeAuthorizationRequest should work', async () => {
      await authFlow.authRequest();
      expect(authFlow.authorizationResponse).toBeTruthy();
      expect(authFlow.authorizationResponse.code).toBeTruthy();
      expect(authFlow.authorizationResponse.state).toBeTruthy();
      expect(authFlow.authState.isAuthorizationComplete).toBe(true);
    });
});
