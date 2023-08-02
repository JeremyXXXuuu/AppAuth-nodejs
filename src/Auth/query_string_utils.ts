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
  parse(input: LocationLike, useHash?: boolean): StringMap {
    if (useHash) {
      return this.parseQueryString(input.hash);
    } else {
      return this.parseQueryString(input.search);
    }
  }

  parseQueryString(query: string): StringMap {
    const result: StringMap = {};
    // if anything starts with ?, # or & remove it
    query = query.trim().replace(/^(\?|#|&)/, '');
    const params = query.split('&');
    for (let i = 0; i < params.length; i += 1) {
      const param = params[i];  // looks something like a=b
      const parts = param.split('=');
      if (parts.length >= 2) {
        const key = decodeURIComponent(parts.shift());
        const value = parts.length > 0 ? parts.join('=') : null;
        if (value) {
          result[key] = decodeURIComponent(value);
        }
      }
    }
    return result;
  }

  stringify(input: StringMap): string {
    const encoded: string[] = [];
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input,key) && input[key]) {
        encoded.push(`${encodeURIComponent(key)}=${encodeURIComponent(input[key])}`)
      }
    }
    return encoded.join('&');
  }
}
