import { Auth } from "../Auth/auth";
import { StringMap } from "../Auth/types";

describe('Google Auth tests', () => {
    const openIdConnectUrl = 'https://accounts.google.com';
    const clientId = "659276355877-am8th2ah8s028ho58bnn8q48murgn878.apps.googleusercontent.com";
    const redirectUri = "http://127.0.0.1:8000";
    const scope = "openid profile";
    const responseType = "code";
    const extras: StringMap = { prompt: "consent"};
    const authFlow = new Auth(openIdConnectUrl, clientId, redirectUri, scope, responseType, extras);
    authFlow.tokenRequest.clientSecret = "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";

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
        console.log(authFlow.authorizationResponse);
        expect(authFlow.authorizationResponse).toBeTruthy();
        expect(authFlow.authorizationResponse.code).toBeTruthy();
        expect(authFlow.authorizationResponse.state).toBeTruthy();
        expect(authFlow.authState.isAuthorizationComplete).toBe(true);
      });
    });

    describe("Token Request", () => {
      it("makeTokenRequest should work", async () => {
        await authFlow.makeTokenRequest();
        console.log(authFlow.tokenResponse);
        expect(authFlow.tokenResponse).toBeTruthy();
        expect(authFlow.tokenResponse.refreshToken).toBeTruthy();
        expect(authFlow.tokenResponse.accessToken).toBeTruthy();
        expect(authFlow.tokenResponse.idToken).toBeTruthy();
        // expect(authFlow.tokenResponse.scope).toBe(scope);
        expect(authFlow.authState.isAuthorizationComplete).toBe(true);
      });

      it("refreshAccessToken should work when access_token is valid", async () => {
        await authFlow.refreshAccessToken();
        expect(authFlow.tokenResponse).toBeTruthy();
        expect(authFlow.tokenResponse.refreshToken).toBeTruthy();
        expect(authFlow.tokenResponse.accessToken).toBeTruthy();
        expect(authFlow.tokenResponse.idToken).toBeTruthy();
        // expect(authFlow.tokenResponse.scope).toBe(scope);
        expect(authFlow.authState.isAuthorizationComplete).toBe(true);
      });

      it("refreshAccessToken should work when access_token is not valid", async () => {
        authFlow.tokenResponse.expiresIn = 1;
        const newAccessToken = await authFlow.refreshAccessToken();
        expect(newAccessToken).toBeTruthy();
        expect(authFlow.tokenResponse).toBeTruthy();
        expect(authFlow.tokenResponse.refreshToken).toBeTruthy();
        expect(authFlow.tokenResponse.accessToken).toBeTruthy();
        expect(authFlow.tokenResponse.idToken).toBeTruthy();
        // expect(authFlow.tokenResponse.scope).toBe(scope);
        expect(authFlow.authState.isAuthorizationComplete).toBe(true);
      });
    });

    describe("User Info Request", () => {
      it("fetchUserInfo should work", async () => {
        const userInfo = await authFlow.fetchUserInfo();
        console.log(userInfo);
        expect(userInfo).toBeTruthy();
      });
    });

});
