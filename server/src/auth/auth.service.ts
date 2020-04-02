import { 
  Injectable, 
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as moment from 'moment';
import { ConfigService } from '../config/config.service';
import { ContactService } from '../contact/contact.service';

@Injectable()
export class AuthService {
  // required env variables
  NYCID_TOKEN_SECRET = '';
  // development environment features
  CRM_IMPOSTER_ID = '';
  ZAP_TOKEN_SECRET = '';

  constructor(
    private readonly config: ConfigService,
    private readonly contactService: ContactService,
  ) {
    this.NYCID_TOKEN_SECRET = this.config.get('NYCID_TOKEN_SECRET');
    this.CRM_IMPOSTER_ID = this.config.get('CRM_IMPOSTER_ID');
  }

  private signNewToken(
    contactId: string,
    expiration: number = moment().add(1, 'days').unix(),
  ): string {
    const { ZAP_TOKEN_SECRET } = this;

    return jwt.sign({ contactId, expiration }, ZAP_TOKEN_SECRET);
  }

  private async lookupContact(email: string) {
    try {
      return await this.contactService.findOneByEmail(email);
    } catch (e) {
      throw new HttpException(`
        CRM user not found. Please make sure your e-mail is associated with an assignment.
      `, HttpStatus.UNAUTHORIZED);
    }
  }

  private verifyToken(token, secret): string | {} {
    try {
      return jwt.verify(token, secret);
    } catch (e) {
      throw new HttpException(e, HttpStatus.UNAUTHORIZED);
    }
  }

  private verifyNYCIDToken(token): any {
    const { NYCID_TOKEN_SECRET } = this;

    return this.verifyToken(token, NYCID_TOKEN_SECRET);
  }

  public async generateNewToken(NYCIDToken: string): Promise<string> {
    const { email, expirationDate } = this.verifyNYCIDToken(NYCIDToken);
    const { CRM_IMPOSTER_ID } = this;

    let contactId = '';
    // prefer CRM_IMPOSTER_ID if it exists
	if (CRM_IMPOSTER_ID) {
	  contactId = await this.contactService.findOneById(CRM_IMPOSTER_ID)
	} else {
 	  contactId = await this.lookupContact(email);
	};
    
    return this.signNewToken(contactId, expirationDate);
  }	
}