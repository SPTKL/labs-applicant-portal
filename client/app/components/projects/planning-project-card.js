import Component from '@glimmer/component';
import { PACKAGE_STATUS, PACKAGE_VISIBILITY } from '../../optionsets/package';

/**
  * Generates a  project card listed under "Planning is working on it..."
  * @param      {Project Model}  project
  */
export default class ProjectsPlanningProjectCardComponent extends Component {
  /**
  * @return      {bool} true if this card shows the "View Pre-Application Statement" button
  */
  get showViewPas() {
    return this.args.project.pasPackages.some((projectPackage) => {
      if (
        [
          PACKAGE_STATUS.SUBMITTED.code,
          PACKAGE_STATUS.UNDER_REVIEW.code,
          PACKAGE_STATUS.REVIEWED_NO_REVISIONS_REQUIRED.code,
          PACKAGE_STATUS.REVIEWED_REVISIONS_REQUIRED.code,
        ].includes(projectPackage.statuscode)
        && [
          PACKAGE_VISIBILITY.APPLICANT_ONLY.code,
          PACKAGE_VISIBILITY.GENERAL_PUBLIC.code,
        ].includes(projectPackage.dcpVisibility)
      ) {
        return true;
      }
      return false;
    });
  }
}
