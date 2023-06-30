import { AuthorizationResponse, AuthorizationError } from '../../Auth/authorization_response';

describe('Authorization Response Tests', () => {
  const code = 'code';
  const state = 'state';
  const error = 'error';

  it('should be able to construct a response', () => {
    const response = new AuthorizationResponse({ code: code, state: state });
    expect(response).toBeDefined();
    expect(response.code).toBe(code);
    expect(response.state).toBe(state);
  });

  it('should be able to construct an error', () => {
    const errorResponse = new AuthorizationError({ error: error });
    expect(errorResponse).toBeDefined();
    expect(errorResponse.error).toBe(error);
  });

  it('should be able to convert a response to JSON', () => {
    const response = new AuthorizationResponse({ code: code, state: state });
    const json = response.toJson();
    expect(json).toBeDefined();
    expect(json.code).toBe(code);
    expect(json.state).toBe(state);
    const newResponse = new AuthorizationResponse(json);
    expect(newResponse).toBeDefined();
    expect(newResponse.code).toBe(code);
    expect(newResponse.state).toBe(state);
  });

});
