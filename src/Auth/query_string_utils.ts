import {LocationLike, StringMap} from './types';


/**
 * Query String Utilities.
 */
export interface QueryStringUtils {
  stringify(input: StringMap): string;
  parse(query: LocationLike, useHash?: boolean): StringMap;
  parseQueryString(query: string): StringMap;
}

export class BasicQueryStringUtils implements QueryStringUtils {
  parse(input: LocationLike, useHash?: boolean) {
    if (useHash) {
      return this.parseQueryString(input.hash);
    } else {
      return this.parseQueryString(input.search);
    }
  }

  parseQueryString(query: string): StringMap {
    let result: StringMap = {};
    // if anything starts with ?, # or & remove it
    query = query.trim().replace(/^(\?|#|&)/, '');
    let params = query.split('&');
    for (let i = 0; i < params.length; i += 1) {
      let param = params[i];  // looks something like a=b
      let parts = param.split('=');
      if (parts.length >= 2) {
        let key = decodeURIComponent(parts.shift()!);
        let value = parts.length > 0 ? parts.join('=') : null;
        if (value) {
          result[key] = decodeURIComponent(value);
        }
      }
    }
    return result;
  }

  stringify(input: StringMap) {
    let encoded: string[] = [];
    for (let key in input) {
      if (input.hasOwnProperty(key) && input[key]) {
        encoded.push(`${encodeURIComponent(key)}=${encodeURIComponent(input[key])}`)
      }
    }
    return encoded.join('&');
  }
}
