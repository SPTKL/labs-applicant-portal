import {
  Controller,
  Patch,
  Body,
  Param,
  Post,
  UseInterceptors,
  UseGuards,
  UsePipes,
  Delete,
} from '@nestjs/common';
import { pick } from 'underscore';
import { CrmService } from '../../../crm/crm.service';
import { JsonApiSerializeInterceptor } from '../../../json-api-serialize.interceptor';
import { AuthenticateGuard } from '../../../authenticate.guard';
import { JsonApiDeserializePipe } from '../../../json-api-deserialize.pipe';
import { APPLICANT_REPRESENTATIVE_ATTRS } from './applicant-representative.attrs';
import { APPLICANT_ATTRS } from './applicants.attrs';

/**
* CRM has two entities for applicants (dcp_applicantinformation and dcp_applicantrepresentativeinformation)
* On the frontend, we treat applicants as one array (with a target_entity attr to track)/
* In this controller we manage the logic to split them appropriately when interacting with CRM
* and making sure we're routing to the correct entity -- this causes some duplication in code
* and might be simplified by making a 1-to-1 between entity-controller-emberModel.
* the main hack is when we get existing applicant representatives, we prepend "representative-"
* to make sure there are unique IDs, and so we are able to delete the correct CRM record in our
* delete method in this controller (which doesn't have access to body.target_entity!)
**/

@UseInterceptors(
  new JsonApiSerializeInterceptor('applicants', {
    id: 'dcp_applicantinformationid',
    attributes: [...APPLICANT_ATTRS],
  }),
)
@UseGuards(AuthenticateGuard)
@UsePipes(JsonApiDeserializePipe)
@Controller('applicants')
export class ApplicantsController {
  constructor(private readonly crmService: CrmService) {}

  @Patch('/:id')
  async update(@Body() body, @Param('id') id) {
    // access target entity from frontend so we know how to handle in CRM
    const { target_entity } = body;
    let allowedAttrs;

    if (target_entity === 'dcp_applicantinformation') {
      allowedAttrs = pick(body, APPLICANT_ATTRS);

      await this.crmService.update(
        'dcp_applicantinformations',
        id,
        allowedAttrs,
      );
    } else if (target_entity === 'dcp_applicantrepresentativeinformation') {
      allowedAttrs = pick(body, APPLICANT_REPRESENTATIVE_ATTRS);

      // strip the hacky prepended "representative-" to use the exact CRM id
      const representativeId = id.replace('representative-', '');

      await this.crmService.update(
        'dcp_applicantrepresentativeinformations',
        representativeId,
        allowedAttrs,
      )
    }

    // regardless of which entity, return same response back to requesting client
    return {
      dcp_applicantinformationid: id,
      allowedAttrs,
    };
  }

  @Post('/')
  create(@Body() body) {
    const { target_entity } = body;

    let allowedAttrs;

    // determine the appropriate attributes based on the entity type
    if (target_entity === 'dcp_applicantinformation') {
      allowedAttrs = pick(body, APPLICANT_ATTRS);

      if (body.pas_form) {
        return this.crmService.create('dcp_applicantinformations', {
          ...allowedAttrs,
          // Dy365 syntax for associating a newly-created record
          // with an existing record.
          // see: https://docs.microsoft.com/en-us/powerapps/developer/common-data-service/webapi/create-entity-web-api#associate-entity-records-on-create
          'dcp_dcp_applicantinformation_dcp_pasform@odata.bind': [
            `/dcp_pasforms(${body.pas_form})`,
          ],
        });
      } else if (body.landuse_form) {
        return this.crmService.create('dcp_applicantinformations', {
          ...allowedAttrs,
          'dcp_dcp_applicantinformation_dcp_landuse@odata.bind': [
            `/dcp_landuses(${body.landuse_form})`,
          ],
        });
      } else {
        return this.crmService.create(
          `dcp_applicantinformations`,
          allowedAttrs,
        );
      }
    } else if (target_entity === 'dcp_applicantrepresentativeinformation') {
      allowedAttrs = pick(body, APPLICANT_REPRESENTATIVE_ATTRS);

      if (body.pas_form) {
        return this.crmService.create(
          'dcp_applicantrepresentativeinformations',
          {
            ...allowedAttrs,
            // Dy365 syntax for associating a newly-created record
            // with an existing record.
            // see: https://docs.microsoft.com/en-us/powerapps/developer/common-data-service/webapi/create-entity-web-api#associate-entity-records-on-create
            'dcp_dcp_applicantrepinformation_dcp_pasform@odata.bind': [
              `/dcp_pasforms(${body.pas_form})`,
            ],
          },
        );
      } else if (body.landuse_form) {
        return this.crmService.create('dcp_applicantinformations', {
          ...allowedAttrs,
          'dcp_dcp_applicantrepinformation_dcp_landuse@odata.bind': [
            `/dcp_landuses(${body.landuse_form})`,
          ],
        });
      } else {
        return this.crmService.create(
          `dcp_applicantrepresentativeinformations`,
          allowedAttrs,
        );
      }
    }
  }

  @Delete('/:id')
  async delete(@Param('id') id) {

    if (id.includes('representative')) {
      // FIXME: this is a hack from the package controller json api interceptor
      // since in this method we don't have access to body.target_entity.
      // here we strip the string we prepend in package.controller.ts to use the proper system id
      const representativeId = id.replace('representative-', '');

      await this.crmService.delete('dcp_applicantrepresentativeinformations', representativeId);
    } else {
      // anything that doesn't have "representative" in the ID is an applicant information entity
      await this.crmService.delete('dcp_applicantinformations', id);
    }

    // regardless of which entity, we return the client the same ID
    // it sent to the server
    return {
      id,
    };
  }
}
