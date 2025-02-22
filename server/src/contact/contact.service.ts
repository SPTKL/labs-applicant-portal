import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { pick } from 'underscore';

import { CONTACT_ATTRS } from './contacts.attrs';
import { CrmService } from '../crm/crm.service';
import { NycidService } from './nycid/nycid.service';

const ACTIVE_CODE = 1;
const GHOST_CONTACT = {
  // if no contact is found, still return something, but
  // denote that this is not a real contact.
  // the client still needs a contact object
  contactid: -1,
  has_crm_contact: false,
};

/**
 * This service is responsible for looking up contacts from CRM
 *
 * @class      ContactService (name)
 */
@Injectable()
export class ContactService {
  constructor(
    private readonly crmService: CrmService,
    private readonly nycid: NycidService,
  ) {}

  /**
   * Uses the CRM Web API to query and return a Contact entity for given contactid
   *
   * @param      {string}  contactId  A CRM Contact Entity's contactid
   * @return     {object}             Object representing a CRM contact
   */
  public async findOneById(contactId: string) {
    try  {
      const { records: [firstRecord = GHOST_CONTACT] } = await this.crmService.get('contacts', `
        $select=${CONTACT_ATTRS.join(',')}
        &$filter=contactid eq ${contactId}
          and statuscode eq ${ACTIVE_CODE}
        &$top=1
      `);

      return {
        has_crm_contact: true,
        ...firstRecord, // how can this be ghost and still return an emailaddress1
        ...await this.nycid.getNycidStatus(firstRecord.emailaddress1, firstRecord.dcp_nycid_guid),
      };
    } catch(e) {
      console.log(e);

      const error = {
        code: "CONTACT_FROM_ID_ERROR",
        title: "Error finding contact by ID.",
        detail: `Error finding contact by ID, possibly due to missing or bad ID. ${e.message}`,
      }
      console.log(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Uses the CRM Web API to query and return a Contact entity for given email
   *
   * @param      {string}  email      Email matching a CRM Contact Entity's emailaddress1 property
   * @return     {object}             Object representing a CRM contact
   */
  public async findOneByEmail(email: string) {
    try {
      const { records: [firstRecord = GHOST_CONTACT] } = await this.crmService.get('contacts', `
        $select=${CONTACT_ATTRS.join(',')}
        &$filter=startswith(emailaddress1, '${email}')
          and statuscode eq ${ACTIVE_CODE}
        &$top=1
      `);

      return {
        has_crm_contact: true,
        ...firstRecord,
        ...await this.nycid.getNycidStatus(email, firstRecord.dcp_nycid_guid),
      };
    } catch(e) {
      console.log(e);
      const error = {
        code: "CONTACT_FROM_EMAIL_ERROR",
        title: "Error finding contact by email.",
        detail: `Error finding contact by email, possibly due to missing or bad email. ${e.message}`,
      };
      console.log(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Uses the CRM Web API to query and return a Contact entity for given email
   *
   * @param      {string}  email      Email matching a CRM Contact Entity's emailaddress1 property
   * @return     {object}             Object representing a CRM contact
   */
  public async findOneByNycidGuid(nycidGuid: string) {
    try {
      const { records: [firstRecord = GHOST_CONTACT] } = await this.crmService.get('contacts', `
        $select=${CONTACT_ATTRS.join(',')}
        &$filter=dcp_nycid_guid eq '${nycidGuid}'
          and statuscode eq ${ACTIVE_CODE}
        &$top=1
      `);

      return {
        has_crm_contact: true,
        ...firstRecord,
        ...await this.nycid.getNycidStatus(firstRecord.emailaddress1, firstRecord.dcp_nycid_guid),
      };
    } catch (e) {
      console.log(e);
      const error = {
        code: "CONTACT_FROM_NYCID_GUID_ERROR",
        title: "Error finding contact by NYCID GUID.",
        detail: `Error finding contact by NYCID GUID. ${e.message}`,
      };
      console.log(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public async update(id: string, body: object) {
    const allowedAttrs = pick(body, CONTACT_ATTRS);

    return this.crmService.update('contacts', id, allowedAttrs);
  }

  public async create(body: object) {
    const allowedAttrs = pick(body, CONTACT_ATTRS);

    return this.crmService.create('contacts', allowedAttrs);
  }
}
