const fetch = require('cross-fetch');
const base64 = require('base-64');
const qs = require('qs');

const { errorTypes } = require('./error');

function toBase64(str) {
  return base64.encode(str);
}

class Api {
  static setApiUrl(apiUrl) {
    this._apiUrl = apiUrl;
  }

  static buildUri(url, options = {}) {
    const queryString = qs.stringify(options);
    return `${this._apiUrl}/${url}?${queryString}`.replace(/\/+/g, '/');
  }

  static get(url, queryOptions) {
    return this.requestPromise({ url, queryOptions, method: 'GET' });
  }

  static post(url, body = {}, queryOptions) {
    return this.requestPromise({ url, queryOptions, method: 'POST', data: body });
  }

  static put(url, body = {}, queryOptions) {
    return this.requestPromise({ url, queryOptions, method: 'PUT', data: body });
  }

  static delete(url, body = {}, queryOptions) {
    return this.requestPromise({ url, queryOptions, method: 'DELETE', data: body });
  }

  static handleInvalidRequest(error, code) {
    const errorObject = {
      type: errorTypes.INVALID_REQUEST,
    };

    if (code === 'INVALID_PARAM') {
      throw ({
        ...errorObject,
        message: 'Validation error',
      });
    }

    throw ({
      ...errorObject,
      message: error.message || 'Unknown error occurred',
    });
  }

  static requestPromise({ url, data, method, queryOptions }) {
    const options = {
      method,
      headers: {
        ...this._headers,
        'Authorization': toBase64(`${this._credentials.user}:${this._credentials.password}`),
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    return fetch(this.buildUri(url, queryOptions), {
      ...options
    }).then((response) =>
      response
        .text()
        .then(JSON.parse)
        .catch(body => body)
        .then((json) => {
          const { error: { code, message } = {} } = json;
          const status = response.status;


          if (status >= 400) {
            switch (status) {
              case 400:
              case 404:
                this.handleInvalidRequest(json.error, code);
                break;
              case 401:
                throw ({ type: errorTypes.AUTHENTICATION_ERROR, message: 'Unauthorized' });
              case 429:
                throw({ type: errorTypes.RATE_LIMIT_ERROR, message: 'Too many requests' });
              case 500:
                throw ({ type: errorTypes.API_ERROR, message: 'Unknown error occurred' });
            }

            throw (message || 'An unknown error occurred');
          }

          return json;
        }),
    );
  }
}

Api._credentials = {
  user: null,
  password: null,
};

Api._headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Pragma': 'no-cache',
};

Api._apiUrl = 'localhost:3000';

module.exports = Api;