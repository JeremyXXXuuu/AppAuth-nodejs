import { Auth } from "../Auth/auth";
import { StringMap } from "../Auth/types";

describe('Auth tests', () => {
    const openIdConnectUrl = "https://staging.auth.orosound.com";
    const clientId = "foo";
    const redirectUri = "http://127.0.0.1:8000";
    const scope = "openid profile email offline_access";
    const responseType = "code";
    const extras: StringMap = { prompt: "consent", access_type: "offline" };
    const authFlow = new Auth(openIdConnectUrl, clientId, redirectUri, scope, responseType, extras);

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

    describe("Authorization Request", () => {
      it("makeAuthRequest should work", async () => {
        await authFlow.makeAuthRequest();
        expect(authFlow.authorizationResponse).toBeTruthy();
        expect(authFlow.authorizationResponse.code).toBeTruthy();
        expect(authFlow.authorizationResponse.state).toBeTruthy();
        expect(authFlow.authState.isAuthorizationComplete).toBe(true);
      });
    });

    describe("Token Request", () => {
      it("makeTokenRequest should work", async () => {
        await authFlow.makeTokenRequest();
        expect(authFlow.tokenResponse).toBeTruthy();
        expect(authFlow.tokenResponse.refreshToken).toBeTruthy();
        expect(authFlow.tokenResponse.accessToken).toBeTruthy();
        expect(authFlow.tokenResponse.idToken).toBeTruthy();
        expect(authFlow.tokenResponse.scope).toBe(scope);
        expect(authFlow.authState.isAuthorizationComplete).toBe(true);
      });

      it("refreshAccessToken should work when access_token is valid", async () => {
        await authFlow.refreshAccessToken();
        expect(authFlow.tokenResponse).toBeTruthy();
        expect(authFlow.tokenResponse.refreshToken).toBeTruthy();
        expect(authFlow.tokenResponse.accessToken).toBeTruthy();
        expect(authFlow.tokenResponse.idToken).toBeTruthy();
        expect(authFlow.tokenResponse.scope).toBe(scope);
        expect(authFlow.authState.isAuthorizationComplete).toBe(true);
      });

      it("refreshAccessToken should work when access_token is not valid", async () => {
        authFlow.tokenResponse.expiresIn = 1;
        await authFlow.refreshAccessToken();
        expect(authFlow.tokenResponse).toBeTruthy();
        expect(authFlow.tokenResponse.refreshToken).toBeTruthy();
        expect(authFlow.tokenResponse.accessToken).toBeTruthy();
        expect(authFlow.tokenResponse.idToken).toBeTruthy();
        expect(authFlow.tokenResponse.scope).toBe(scope);
        expect(authFlow.authState.isAuthorizationComplete).toBe(true);
      });
    });

    describe("User Info Request", () => {
      it("fetchUserInfo should work", async () => {
        const userInfo = await authFlow.fetchUserInfo();
        expect(userInfo).toBeTruthy();
        expect(userInfo).toHaveProperty("sub");
        expect(userInfo).toHaveProperty("email");
        expect(userInfo).toHaveProperty("profile");
      });
    });
});
