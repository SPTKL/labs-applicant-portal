import { 
  Injectable, 
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as moment from 'moment';
import { ConfigService } from '../config/config.service';
import { ContactService } from '../contact/contact.service';

/**
 * This service is responsible for verifying NYCID tokens presented
 * by the user and generating new ZAP token for the user.
 *
 * @class      AuthService (name)
 */
@Injectable()
export class AuthService {
  // required env variables
  NYCID_TOKEN_SECRET = '';
  ZAP_TOKEN_SECRET = '';

  // development environment features
  CRM_IMPOSTER_ID = '';

  constructor(
    private readonly config: ConfigService,
    private readonly contactService: ContactService,
  ) {
    this.NYCID_TOKEN_SECRET = this.config.get('NYCID_TOKEN_SECRET');
    this.CRM_IMPOSTER_ID = this.config.get('CRM_IMPOSTER_ID');
    this.ZAP_TOKEN_SECRET = this.config.get('ZAP_TOKEN_SECRET');
  }

  /**
   * Generates a new ZAP token, including the contact id
   *
   * @param      {string}  contactId  The CRM contactid
   * @param      {string}  exp        A string coercable to a Date
   * @return     {string}             String representing ZAP token
   */
  private signNewToken(
    contactId: string,
    expiration: number = moment().add(1, 'days').unix(),
  ): string {
    const { ZAP_TOKEN_SECRET } = this;

    return jwt.sign({ contactId, expiration }, ZAP_TOKEN_SECRET);
  }

  private verifyToken(token, secret): string | {} {
    try {
      return jwt.verify(token, secret);
    } catch (e) {
      const errorMessage = `Could not verify token. ${e}`;
      console.log(errorMessage);
      throw new HttpException(errorMessage, HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * Verifies a JWT with the NYCID signature. Returns the token object.
   *
   * @param      {string}  token   The token
   * @return     {object}     { mail: 'string', exp: 'string' }
   */
  private verifyNYCIDToken(token): any {
    const { NYCID_TOKEN_SECRET } = this;

    return this.verifyToken(token, NYCID_TOKEN_SECRET);
  }


  /**
   * This function extracts the email from an NYCIDToken and uses it to
   * look up a Contact in CRM. It returns to the client a ZAP token holding
   * (signed with) the acquired Contact's contactid. 
   * 
   * It also allows for looking up a contact by CRM_IMPOSTER_ID, if the
   * environment variable exists, and SKIP_AUTH is true.
   * 
   * @param      {string}  NYCIDToken  Token from NYCID
   * @return     {string}              String representing generated ZAP Token
   */
  public async generateNewToken(NYCIDToken: string): Promise<string> {
    const { mail, exp } = this.verifyNYCIDToken(NYCIDToken);
    const { CRM_IMPOSTER_ID } = this;

    let contact = null;

    // prefer finding contact by CRM_IMPOSTER_ID, if it exists
    if (CRM_IMPOSTER_ID) {
      contact = await this.contactService.findOneById(CRM_IMPOSTER_ID)
    } else {
      contact = await this.contactService.findOneByEmail(mail);
    };

    if (!contact) {
      const errorMessage = 'CRM user not found. Please make sure your e-mail or ID is associated with an assignment.';
      console.log(errorMessage);
      throw new HttpException(errorMessage, HttpStatus.UNAUTHORIZED);
    }

    return this.signNewToken(contact.contactid, exp);
  }
}
