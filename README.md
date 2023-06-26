![](https://orosound-link.s3.eu-west-3.amazonaws.com/assets/banner_orosound.png)

# auth_client_sdk_nodejs

JavaScript client SDK for communicating with OAuth 2.0 and OpenID Connect providers.

The library also supports the [PKCE](https://tools.ietf.org/html/rfc7636)
extension to OAuth which was created to secure authorization codes in public
clients when custom URI scheme redirects are used. The library is friendly to
other extensions (standard or otherwise) with the ability to handle additional
parameters in all protocol requests and responses.
## Installation

Install auth_client_sdk_nodejs with npm

```bash
  yarn add @orosound/auth_client_sdk_nodejs
```


### Examples
https://github.com/orosound/electron-auth-demo

### Auth flow

Electron public client example:
```typescript
import Auth from '@orosound/auth_client_sdk_nodejs';

const openIdConnectUrl = "https://staging.auth.orosound.com";
const clientId = "foo";
const redirectUri = "http://127.0.0.1:8000";
const scope = "openid profile email offline_access";
const responseType = "code";
const extras = { prompt: "consent", access_type: "offline" };

const authFlow = new Auth(openIdConnectUrl, clientId, redirectUri, scope, responseType, extras);
```

##### Fetch Service Configuration
```typescript
authFlow.fetchServiceConfiguration().then((conf) => {
    console.log(conf);
})
```
##### Make Authorization Requests
```typescript
authFlow.makeAuthRequest()
```
##### Make Token Requests
```typescript
authFlow.makeTokenRequest()
```
##### Refresh AccessToken
```typescript
authFlow.refreshAccessToken().then(() => {
    console.log(authFlow.tokenResponse);
})
```
##### Log out
```typescript
authFlow.logout()
```
##### Whole Flow Examples
```typescript
async function auth() {
    await authFlow.fetchServiceConfiguration();
    await authFlow.makeAuthRequest();
    await authFlow.makeTokenRequest();
    await authFlow.refreshAccessToken();
    console.log(authFlow.tokenResponse);
}
```
### LOG Mode
```bash
IS_LOG = true
```
### Test

```bash
// test orosound Oauth2 flow
yarn oro-test
// test google Oauth2 flow
yarn google-test
```


