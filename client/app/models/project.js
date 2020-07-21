import Model, { attr, hasMany } from '@ember-data/model';
import { optionset } from '../helpers/optionset';

export default class ProjectModel extends Model {
  // The human-readable, descriptive name.
  // e.g. "Marcus Garvey Blvd Project"
  @attr dcpProjectname;

  // The CRM Project 5-letter ID.
  // e.g. 2020M0442
  // This is NOT the project GUID.
  @attr dcpName;

  @attr dcpBorough;

  @attr statuscode;

  // e.g. 'Prefiled', 'Filed', 'In Public Review', 'Completed'
  @attr dcpPublicstatus;

  @attr dcpApplicantCustomerValue;

  @hasMany('package', { async: false })
  packages;

  get pasPackages() {
    const [firstPackage] = this.packages
      .filter((projectPackage) => projectPackage.dcpPackagetype === optionset(['package', 'type', 'code', 'PAS_PACKAGE']))
      .sortBy('dcpPackageversion')
      .reverse();

    if (firstPackage) {
      return [firstPackage];
    }
    return [];
  }
}
