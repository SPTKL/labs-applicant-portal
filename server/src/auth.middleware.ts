import { Injectable, NestMiddleware } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth/auth.service';
import { ConfigService } from './config/config.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) { }

  async use(req: any, res: any, next: () => void) {
    // skip for the login route
    if (req.originalUrl.includes('login')) {
      next();

      return;
    }

    req.session = false;

    const { authorization = '' } = req.headers;
    const token = authorization.split(' ')[1];

    try {
      // this promise will throw if invalid
      let validatedToken = await this.authService.validateCurrentToken(token);

      const { email } = req.query; // the query param, email, sent from the client. this is who the "Creeper" wants to be.
      const { mail } = validatedToken; // the "creepers" actual email, for verification.

      // REDO: env variables.
      // if an e-mail is provided, implicitly it means force creeper mode. then verify creeper mode
      // with some criteria.
      if (email && (mail === 'dcpcreeper@gmail.com' || mail.includes('@planning.nyc.gov'))) {
        validatedToken = await this._spoofToken(validatedToken, email);
      }

      req.session = validatedToken;
       
      next();
    } catch (e) {
      next();
    }
  }

  // spoof a token for the creeper user, provided their verified token and email param
  // returns a new token with new credentials, allowing all routes access to the spoofed user's
  // resources
  async _spoofToken(validatedToken, creeperEmail) {
    const NYCID_TOKEN_SECRET = this.config.get('NYCID_TOKEN_SECRET');

    // these simulate the flow of authentication for the app
    const spoofedNycIdToken = jwt.sign({
      ...validatedToken,
      mail: creeperEmail,
    }, NYCID_TOKEN_SECRET);
    const spoofedZapToken = await this.authService.generateNewToken(spoofedNycIdToken);
    const validatedSpoofedToken = await this.authService.validateCurrentToken(spoofedZapToken);

    validatedSpoofedToken.isCreeper = true;

    return validatedSpoofedToken;
  }
}
