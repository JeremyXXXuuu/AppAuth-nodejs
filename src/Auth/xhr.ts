import {AppAuthError} from './error';

export abstract class Requestor {
    abstract xhr<T>(settings: JQueryAjaxSettings): Promise<T>;
  }

export class FetchRequestor extends Requestor {
    xhr<T>(settings: JQueryAjaxSettings): Promise<T> {
      if (!settings.url) {
        return Promise.reject(new AppAuthError('A URL must be provided.'));
      }
      const url: URL = new URL(<string>settings.url);
      const requestInit: RequestInit = {};
      requestInit.method = settings.method;
      requestInit.mode = 'cors';

      if (settings.data) {
        if (settings.method && settings.method.toUpperCase() === 'POST') {
          requestInit.body = <string>settings.data;
        } else {
          const searchParams = new URLSearchParams(settings.data);
          searchParams.forEach((value, key)=>{
            url.searchParams.append(key, value);
          });
        }
      }

      // Set the request headers
      requestInit.headers = {};
      if (settings.headers) {
        // eslint-disable-next-line
        for (let i in settings.headers) {
          // eslint-disable-next-line no-prototype-builtins
          if (settings.headers.hasOwnProperty(i)) {
            requestInit.headers[i] = <string>settings.headers[i];
          }
        }
      }

      const isJsonDataType = settings.dataType && settings.dataType.toLowerCase() === 'json';

      // Set 'Accept' header value for json requests (Taken from
      // https://github.com/jquery/jquery/blob/e0d941156900a6bff7c098c8ea7290528e468cf8/src/ajax.js#L644
      // )
      if (isJsonDataType) {
        requestInit.headers['Accept'] = 'application/json, text/javascript, */*; q=0.01';
      }

      return fetch(url.toString(), requestInit).then(response => {
        if (response.status >= 200 && response.status < 300) {
          const contentType = response.headers.get('content-type');
          if (isJsonDataType || (contentType && contentType.indexOf('application/json') !== -1)) {
            return response.json();
          } else {
            return response.text();
          }
        } else {
          return Promise.reject(new AppAuthError(response.status.toString(), response.statusText));
        }
      });
    }
  }
