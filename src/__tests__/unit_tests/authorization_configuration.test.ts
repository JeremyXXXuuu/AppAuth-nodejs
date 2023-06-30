import { AuthorizationServiceConfiguration, AuthorizationServiceConfigurationJson } from '../../Auth/authorization_service_configuration';
import { Requestor } from '../../Auth/xhr';

class TestRequestor extends Requestor {
  constructor(public promise: Promise<AuthorizationServiceConfigurationJson|any>) {
    super();
  }
  xhr<T>(settings: JQueryAjaxSettings): Promise<T> {
    return this.promise;  // unsafe cast
  }
}


describe('Authorization Service Configuration tests', () => {
  const authorizationEndpoint = 'authorization://endpoint';
  const tokenEndpoint = 'token://endpoint';
  const revocationEndpoint = 'revocation://endpoint';
  const userInfoEndpoint = 'userInfo://endpoint';
  const endSessionEndpoint = 'endSession://endpoint';

  const configuration = new AuthorizationServiceConfiguration({
    authorization_endpoint: authorizationEndpoint,
    token_endpoint: tokenEndpoint,
    revocation_endpoint: revocationEndpoint,
    userinfo_endpoint: userInfoEndpoint,
    end_session_endpoint: endSessionEndpoint,
  });
  it('Initialization should work', () => {
    expect(configuration).toBeTruthy();
    expect(configuration.authorizationEndpoint).toBe(authorizationEndpoint);
    expect(configuration.tokenEndpoint).toBe(tokenEndpoint);
    expect(configuration.revocationEndpoint).toBe(revocationEndpoint);
    expect(configuration.endSessionEndpoint).toBe(endSessionEndpoint);
    expect(configuration.userInfoEndpoint).toBe(userInfoEndpoint);
  });

  it('Conversion to Json and back should work', () => {
    const json = configuration.toJson();
    const newConfiguration = new AuthorizationServiceConfiguration(json);
    expect(newConfiguration).toBeTruthy();
    expect(newConfiguration.authorizationEndpoint).toBe(configuration.authorizationEndpoint);
    expect(newConfiguration.tokenEndpoint).toBe(configuration.tokenEndpoint);
    expect(newConfiguration.revocationEndpoint).toBe(configuration.revocationEndpoint);
    expect(configuration.endSessionEndpoint).toBe(endSessionEndpoint);
    expect(configuration.userInfoEndpoint).toBe(userInfoEndpoint);
  });


  describe('Tests with dependencies', () => {
    it('Fetch from issuer tests should work', async () => {
      const promise: Promise<AuthorizationServiceConfigurationJson> =
          Promise.resolve(configuration.toJson());
      const requestor = new TestRequestor(promise);
      const result_1 = await AuthorizationServiceConfiguration.fetchFromIssuer('some://endpoint', requestor);
      expect(result_1).toBeTruthy();
      expect(result_1.authorizationEndpoint).toBe(configuration.authorizationEndpoint);
      expect(result_1.tokenEndpoint).toBe(configuration.tokenEndpoint);
      expect(result_1.revocationEndpoint).toBe(configuration.revocationEndpoint);
      expect(configuration.endSessionEndpoint).toBe(endSessionEndpoint);
      expect(configuration.userInfoEndpoint).toBe(userInfoEndpoint);
    });

    it('Fetch from real OP issuer tests should work', async () => {
      const openIdConnectUrl = "https://staging.auth.orosound.com";
      const result = await AuthorizationServiceConfiguration.fetchFromIssuer(openIdConnectUrl);
      expect(result).toBeTruthy();
      expect(result.authorizationEndpoint).toBeTruthy();
      expect(result.tokenEndpoint).toBeTruthy();
    });
  });
});
