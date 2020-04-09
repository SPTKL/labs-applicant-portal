import * as ADALNode from 'adal-node';
import * as fs from 'fs';

function getPrivateKey(filename) {
  var privatePem = fs.readFileSync(filename, { encoding : 'utf8'});
  return privatePem;
}

export const ADAL = {
  // In one or more classes that import ADAL,
  // you must instantiate these variables in the constructor.
  // Likely you want to pull in these variables from the ConfigService
  ADAL_CONFIG: {
    CRMUrl: '',
    webAPIurl: '',
    clientId: '',
    clientSecret: '',
    tenantId: '',
    authorityHostUrl: '',
    tokenPath: '',
    SharepointUrl: '',
    thumbprint: '',
    certKeyPath: '',
  },

  token: null,
  expirationDate: null,
  acquireToken() {
    return new Promise((resolve, reject) => {
      if (this.expirationDate) {
        const tokenLimit = new Date(this.expirationDate.getTime() - (15*60*1000));
        const now = new Date();

        if (now <= tokenLimit){
          resolve(this.token);

          return;
        }
      }

      const { AuthenticationContext } = ADALNode;
      const {
        authorityHostUrl,
        tenantId,
        tokenPath,
        clientId,
        clientSecret,
        CRMUrl,
      } = this.ADAL_CONFIG;
      const context = new AuthenticationContext(`${authorityHostUrl}/${tenantId}${tokenPath}`);

      context.acquireTokenWithClientCredentials(CRMUrl, clientId, clientSecret,
        (err, tokenResponse:any ) => {
          if (err) {
            console.log(`well that didn't work: ${err.stack}`);
            reject(err);
          }

          const {
            accessToken,
            expiresOn,
          } = tokenResponse;

          this.token = accessToken;
          this.expirationDate = expiresOn;

          resolve(accessToken);
        }
      );
    })
  },

  acquireSharepointToken() {
    return new Promise((resolve, reject) => {
      const { AuthenticationContext } = ADALNode;
      const {
        authorityHostUrl,
        tenantId,
        tokenPath,
        clientId,
        SharepointUrl,
        thumbprint,
        certKeyPath,
      } = this.ADAL_CONFIG;

      console.log(`AuthenticationContext: ${authorityHostUrl}/${tenantId}${tokenPath}`);
      const context = new AuthenticationContext(`${authorityHostUrl}/${tenantId}${tokenPath}`);

      const key = getPrivateKey(certKeyPath);

      context.acquireTokenWithClientCertificate(SharepointUrl, clientId, key, thumbprint, 
        (err, tokenResponse:any ) => {
          if (err) {
            console.log(`well that didn't work: ${err.stack}`);
            reject(err);
          }

          const {
            accessToken,
            expiresOn,
          } = tokenResponse;

          this.token = accessToken;
          this.expirationDate = expiresOn;

          resolve(accessToken);
        }
      );
    })
  }
};