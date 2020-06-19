import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Session,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ConfigService } from '../config/config.service';
import { ContactService } from '../contact/contact.service';
import { JsonApiSerializeInterceptor } from '../json-api-serialize.interceptor';
import { AuthenticateGuard } from '../authenticate.guard';

export const PROJECT_ATTRS = [
  'dcp_projectname',
  'dcp_name',
  'dcp_borough',
  'statecode',
  'statuscode',
  'dcp_visibility',
  '_dcp_applicant_customer_value',
  'dcp_dcp_project_dcp_projectapplicant_Project',
];

@UseInterceptors(new JsonApiSerializeInterceptor('projects', {
  id: 'dcp_name',
  attributes: [
    ...PROJECT_ATTRS,

    'packages',
  ],
  packages: {
    ref: 'dcp_packageid',
    attributes: [
      'statuscode',
      'statecode',
      'dcp_packagetype',
      'dcp_visibility',
      'dcp_packageversion',
    ],
  },

  // remap verbose navigation link names to
  // more concise names
  transform(project) {
    return {
      ...project,
      packages: project.dcp_dcp_project_dcp_package_project,
    };
  },
}))
@UseGuards(AuthenticateGuard)
@Controller()
export class ProjectsController {
  CRM_IMPOSTER_ID = '';

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly contactService: ContactService,
    private readonly config: ConfigService,
  ) {
    this.CRM_IMPOSTER_ID = this.config.get('CRM_IMPOSTER_ID');
  }

  @Get('/projects')
  async listOfCurrentUserProjects(@Session() session, @Query('email') email) {
    let { contactId } = session;

    if (email) {
      ({ contactid: contactId } = await this.contactService.findOneByEmail(
        email,
      ));
    }

    try {
      if (contactId) {
        return this.projectsService.findManyByContactId(contactId);
      }
    } catch (e) {
      const errorMessage = `${e}`;

      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }
}
