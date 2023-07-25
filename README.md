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

## Auth flow

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

### Electron Deep Link example

```typescript
import { DeepLinkAuthClient } from '@orosound/auth_client_sdk_nodejs'
//note that the mainWindow is the BrowserWindow instance of your electron app
//note that the protocol is the protocol you want to use for the deep linking
const auth_client = new DeepLinkAuthClient(oro_provider, persistToken, mainWindow, protocol, log);

// prevent multiple instances in Electron when using deep linking, see https://www.electronjs.org/docs/latest/api/app#apprequestsingleinstancelockadditionaldata
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.whenReady().then(() => {
    //init the auth client
    auth_client.init();
    createWindow();
    console.log(persistToken.getCredentials())
    app.on("activate", function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}


```
### Electron example

`init()`: Check if there is a token in the local storage and if it is valid. If not, it will open a new window to start the auth flow.
```typescript
import { ElectronAuthClient } from '@orosound/auth_client_sdk_nodejs';;

const auth_client = new ElectronAuthClient(oroProvider, persistToken);
auth_client.signOut();
auth_client.init();
```
#### Your provider config:
```typescript
const oroProvider = {
	name: 'orosound',
	openIdConnectUrl: 'https://staging.auth.orosound.com',
	clientId: 'foo',
	redirectUri: 'http://127.0.0.1:8000',
	scope: 'openid name profile email offline_access',
	responseType: 'code',
	extras: { prompt: 'consent', access_type: 'offline' },
}
```
#### Persist token:
Persist token is an Adapter that you can implement to save your token in your local.
```typescript
interface PersistTokenAdapter {
    setToken: (key: string, value: string) => void;
    getToken: (key: string) => string;
    deleteToken: (key: string) => void;
    getCredentials: () => Array<{
        key: string;
        token: string;
    }>;
}
```
Here is an example of a persist token adapter with [`electron-store`](https://github.com/sindresorhus/electron-store) and [`Electron safeStorage`](https://www.electronjs.org/fr/docs/latest/api/safe-storage)
```typescript
import { safeStorage } from 'electron';
import Store = require('electron-store');

const store = new Store<Record<string, string>>({
  name: 'ray-encrypted',
  watch: true,
  encryptionKey: 'this_only_obfuscates',
});

export default {
  setToken(key: string, token: string) {
    const buffer = safeStorage.encryptString(token);
    store.set(key, buffer.toString('latin1'));
  },

  deleteToken(key: string) {
    store.delete(key);
  },

  getCredentials(): Array<{ key: string; token: string }> {
    return Object.entries(store.store).reduce((credentials, [key, buffer]) => {
      return [...credentials, { key, token: safeStorage.decryptString(Buffer.from(buffer, 'latin1')) }];
    }, [] as Array<{ key: string; token: string }>);
  },

  getToken(key: string): string {
	const buffer = store.get(key);
	return safeStorage.decryptString(Buffer.from(buffer, 'latin1'));
  }
};
```
### Test

```bash
# unit test
yarn test
# test orosound Oauth2 flow
yarn oro-test
# test google Oauth2 flow
yarn google-test
```


