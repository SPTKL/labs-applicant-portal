import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { ADAL } from '../_utils/adal';
import * as Request from 'request';
import * as zlib from 'zlib';

/**
 * This service is responsible for providing convenience
 * methods for interacting with CRM.
 * TODO: Leverage the oData service written by @allthesignals
 * See
 * https://github.com/NYCPlanning/labs-zap-api/blob/api-only/src/odata/odata.service.ts
 * https://github.com/NYCPlanning/labs-zap-api/blob/api-only/src/contact/contact.service.ts
 *
 * @class      CrmService (name)
 */
@Injectable()
export class CrmService {
  crmUrlPath = '';
  crmHost = '';
  host = '';
  fileUrl = '';

  constructor(
    private readonly config: ConfigService,
  ) {
      ADAL.ADAL_CONFIG = {
      CRMUrl: this.config.get('CRM_HOST'),
      webAPIurl: this.config.get('CRM_URL_PATH'),
      clientId: this.config.get('CLIENT_ID'),
      clientSecret: this.config.get('CLIENT_SECRET'),
      tenantId: this.config.get('TENANT_ID'),
      authorityHostUrl: this.config.get('AUTHORITY_HOST_URL'),
      tokenPath: this.config.get('TOKEN_PATH'),
      SharepointUrl: this.config.get('SHAREPOINT_HOST'),
      thumbprint: this.config.get('CERT_KEY_THUMBPRINT'),
      certKeyPath: this.config.get('CERT_KEY_PATH'),
    };
      this.crmUrlPath = this.config.get('CRM_URL_PATH');
      this.crmHost = this.config.get('CRM_HOST');
      this.host = `${this.crmHost}${this.crmUrlPath}`;
      this.fileUrl = this.config.get('FILE_URL');
    }

  private parseErrorMessage (json) {
    if (json) {
      if (json.error) {
        return json.error;
      }
      if (json._error) {
        return json._error;
      }
    }
    return "Error";
  }

  private dateReviver (key, value) {
    if (typeof value === 'string') {
      // YYYY-MM-DDTHH:mm:ss.sssZ => parsed as UTC
      // YYYY-MM-DD => parsed as local date

      if (value != "") {
        const a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);

        if (a) {
          const s = parseInt(a[6]);
          const ms = Number(a[6]) * 1000 - s * 1000;
          return new Date(Date.UTC(parseInt(a[1]), parseInt(a[2]) - 1, parseInt(a[3]), parseInt(a[4]), parseInt(a[5]), s, ms));
        }

        const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

        if (b) {
          return new Date(parseInt(b[1]), parseInt(b[2]) - 1, parseInt(b[3]), 0, 0, 0, 0);
        }
      }
    }

    return value;
  }

  private fixLongODataAnnotations (dataObj) {
    const newObj = {};

    for (let name in dataObj) {
      const formattedValuePrefix = name.indexOf("@OData.Community.Display.V1.FormattedValue");
      const logicalNamePrefix = name.indexOf("@Microsoft.Dynamics.CRM.lookuplogicalname");
      const navigationPropertyPrefix = name.indexOf("@Microsoft.Dynamics.CRM.associatednavigationproperty");

      if (formattedValuePrefix >= 0) {
        const newName = name.substring(0, formattedValuePrefix);
        if(newName) newObj[`${newName}_formatted`] = dataObj[name];
      }

      else if (logicalNamePrefix >= 0) {
        const newName = name.substring(0, logicalNamePrefix);
        if(newName) newObj[`${newName}_logical`] = dataObj[name];
      }

      else if (navigationPropertyPrefix >= 0) {
        const newName = name.substring(0, navigationPropertyPrefix);
        if (newName) newObj[`${newName}_navigationproperty`] = dataObj[name];
      }

      else {
        newObj[name] = dataObj[name];
      }
    }

    return newObj;
  }

  async getDocument(headers={}) {
    const JWToken = await ADAL.acquireSharepointToken();

    console.log("JWToken from sharepoint: ", JWToken);

    const fileUrl = this.fileUrl; 

    const options = {
      url: fileUrl,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${JWToken}`,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        ...headers
      },
      encoding: null,
    };

    return new Promise((resolve, reject) => {
      Request.get(options, (error, response, body) => {
        console.log("Request promise resolved: ", response);
        console.log("body: ", body);
        if (response.statusCode === 403) {
          resolve("Forbidden.");
        }
        if (response.statusCode === 204) {
          resolve("Got document successfully.")
        }
        // If response body exists,
        // allow CRM error message to bubble up.
        console.log("response: ", response);
        if (body) {
          try {
            const jsonBody = JSON.parse(body);
            reject(jsonBody);
            // const parsedErrorMessage = this.parseErrorMessage(jsonBody);
            // if (parsedErrorMessage) {
            //   // Nest was throwing server Errors on Promise.reject()?
            //   resolve(parsedErrorMessage);
            // }
          } catch(error) {
            reject(body);
          }
        }
      });
    });
  }

  async get(query, maxPageSize = 100, headers= {}) {
    //  get token
    const JWToken = await ADAL.acquireToken();
    const options = {
      url: `${this.host}${query}`,
      headers: {
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${JWToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
        Prefer: 'odata.include-annotations="*"',
        ...headers
      },
      encoding: null,
    };

    return new Promise((resolve, reject) => {
      Request.get(options, (error, response, body) => {
        const encoding = response.headers['content-encoding'];

        if (!error && response.statusCode === 200) {
          // If response is gzip, unzip first

          const parseResponse = jsonText => {
            const json_string = jsonText.toString('utf-8');

            var result = JSON.parse(json_string, this.dateReviver);
            if (result["@odata.context"].indexOf("/$entity") >= 0) {
                // retrieve single
                result = this.fixLongODataAnnotations(result);
            }
            else if (result.value ) {
                // retrieve multiple
                var array = [];
                for (var i = 0; i < result.value.length; i++) {
                  array.push(this.fixLongODataAnnotations(result.value[i]));
                }
                result.value = array;
            }
            resolve(result);
          };

          if (encoding && encoding.indexOf('gzip') >= 0) {
            zlib.gunzip(body, (err, dezipped) => {
                parseResponse(dezipped);
            });
          }
          else {
            parseResponse(body);
          }
        } else {
          const parseError = jsonText => {
            // Bug: sometimes CRM returns 'object reference' error
            // Fix: if we retry error will not show again
            const json_string = jsonText.toString('utf-8');
            const result = JSON.parse(json_string, this.dateReviver);
            const err = this.parseErrorMessage(result);

            if (err == "Object reference not set to an instance of an object.") {
              this.get(query, maxPageSize, options)
                .then(
                  resolve, reject
                );
            } else {
              reject(err);
            }
          };

          if (encoding && encoding.indexOf('gzip') >= 0) {
            zlib.gunzip(body, (err, dezipped) => {
              parseError(dezipped);
            });
          } else {
            parseError(body);
          }
        }
      });
    });
  }
}
