import { module, test } from 'qunit';
import {
  visit,
  click,
  currentURL,
  settled,
  waitFor,
  fillIn,
  triggerKeyEvent,
} from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { setupMirage } from 'ember-cli-mirage/test-support';
import { authenticateSession } from 'ember-simple-auth/test-support';
import { selectFiles } from 'ember-file-upload/test-support';
import { selectChoose } from 'ember-power-select/test-support';

const saveForm = async () => {
  await click('[data-test-save-button]');
  await settled();
};

module('Acceptance | user can click pas-form edit', function(hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(() => {
    authenticateSession({
      emailaddress1: 'me@me.com',
    });
  });

  test('User can visit edit pas-form route', async function(assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/projects');
    await click('[data-test-project-link="1"]');
    await click('[data-test-package-link="1"]');

    assert.equal(currentURL(), '/pas-form/1/edit');
  });

  test('User can visit save and submit pas-form package', async function (assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/projects');
    await click('[data-test-project-link="1"]');
    await click('[data-test-package-link="1"]');
    await fillIn('[data-test-input="dcpRevisedprojectname"]', 'my project name');
    await click('[data-test-add-applicant-button]');
    await fillIn('[data-test-input="dcpFirstname"]', 'Tess');
    await fillIn('[data-test-input="dcpLastname"]', 'Ter');
    await fillIn('[data-test-input="dcpEmail"]', 'tesster@planning.nyc.gov');
    await click('[data-test-save-button]');

    await waitFor('[data-test-submit-button]:not([disabled])');
    await click('[data-test-submit-button]');
    await click('[data-test-confirm-submit-button]');

    // for some reason promises aren't being captured so we await for settled state
    await settled();

    // use waitFor as a way to "wait" for the transition
    // within the pas-form/edit Component submit() task
    await waitFor('[data-test-show="dcpRevisedprojectname"]');

    assert.equal(currentURL(), '/pas-form/1');
  });

  test('Save button is enabled when file marked for deletion', async function (assert) {
    // TODO: Refactor factories so there doesn't need to be duplicate package
    const project = this.server.create('project', 'toDo');
    this.server.create('package', 'toDo', 'pasForm', 'withExistingDocuments', {
      project,
    });

    await visit('/pas-form/2/edit');

    assert.dom('[data-test-save-button]').isDisabled();

    await click('[data-test-delete-file-button="0"]');

    assert.dom('[data-test-save-button]').isEnabled();
  });

  test('Save button is enabled when file marked for upload', async function (assert) {
    const project = this.server.create('project', 'toDo');
    this.server.create('package', 'toDo', 'pasForm', 'withExistingDocuments', {
      project,
    });

    await visit('/pas-form/2/edit');

    assert.dom('[data-test-save-button]').isDisabled();

    const file = new File(['foo'], 'Zoning Application.pdf', { type: 'text/plain' });

    await selectFiles('#FileUploader2 > input', file);

    assert.dom('[data-test-save-button]').isEnabled();
  });

  test('Files marked for upload and deletion are cleared on Save', async function (assert) {
    const project = this.server.create('project', 'toDo');
    this.server.create('package', 'toDo', 'pasForm', 'withExistingDocuments', {
      project,
    });

    await visit('/pas-form/2/edit');

    const file = new File(['foo'], 'Zoning Application.pdf', { type: 'text/plain' });
    await selectFiles('#FileUploader2 > input', file);

    await click('[data-test-delete-file-button="0"]');

    await assert.dom('[data-test-document-to-be-deleted-name]').exists();
    await assert.dom('[data-test-document-to-be-uploaded-name]').exists();

    await click('[data-test-save-button]');

    await assert.dom('[data-test-document-to-be-deleted-name]').doesNotExist();
    await assert.dom('[data-test-document-to-be-uploaded-name]').doesNotExist();
  });

  test('Urban Renewal Area sub Q shows conditionally', async function (assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/pas-form/1/edit');
    assert.dom('[data-test-input="dcpUrbanareaname"]').doesNotExist();

    await click('[data-test-radio="dcpUrbanrenewalarea"][data-test-radio-option="Yes"]');
    assert.dom('[data-test-input="dcpUrbanareaname"]').exists();
  });

  test('SEQRA or CEQR sub Q shows conditionally', async function (assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/pas-form/1/edit');

    assert.dom('[data-test-input="dcpPleaseexplaintypeiienvreview"]').doesNotExist();
    await click('[data-test-radio="dcpLanduseactiontype2"][data-test-radio-option="Yes"]');
    assert.dom('[data-test-input="dcpPleaseexplaintypeiienvreview"]').exists();
  });

  test('Industrial Business Zone sub Q shows conditionally', async function (assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/pas-form/1/edit');

    assert.dom('[data-test-input="dcpProjectareaindutrialzonename"]').doesNotExist();
    await click('[data-test-radio="dcpProjectareaindustrialbusinesszone"][data-test-radio-option="Yes"]');
    assert.dom('[data-test-input="dcpProjectareaindutrialzonename"]').exists();
  });

  test('Landmark or Historic District sub Q shows conditionally', async function (assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/pas-form/1/edit');

    assert.dom('[data-test-input="dcpProjectarealandmarkname"]').doesNotExist();
    await click('[data-test-radio="dcpIsprojectarealandmark"][data-test-radio-option="Yes"]');
    assert.dom('[data-test-input="dcpProjectarealandmarkname"]').exists();
  });

  test('Other Type sub Q shows conditionally', async function (assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/pas-form/1/edit');

    assert.dom('[data-test-input="dcpProposeddevelopmentsiteotherexplanation"]').doesNotExist();
    await click('[data-test-checkbox="dcpProposeddevelopmentsiteinfoother"]');
    assert.dom('[data-test-input="dcpProposeddevelopmentsiteotherexplanation"]').exists();
  });

  test('MIH sub Q shows conditionally', async function (assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/pas-form/1/edit');

    assert.dom('[data-test-input="dcpInclusionaryhousingdesignatedareaname"]').doesNotExist();
    await click('[data-test-radio="dcpIsinclusionaryhousingdesignatedarea"][data-test-radio-option="Yes"]');
    assert.dom('[data-test-input="dcpInclusionaryhousingdesignatedareaname"]').exists();
  });

  test('Funding Source sub Q shows conditionally', async function (assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/pas-form/1/edit');

    assert.dom('[data-test-radio="dcpHousingunittype"][data-test-radio-option="City"]').doesNotExist();
    assert.dom('[data-test-radio="dcpHousingunittype"][data-test-radio-option="State"]').doesNotExist();
    assert.dom('[data-test-radio="dcpHousingunittype"][data-test-radio-option="Federal"]').doesNotExist();
    assert.dom('[data-test-radio="dcpHousingunittype"][data-test-radio-option="Other"]').doesNotExist();

    await click('[data-test-radio="dcpDiscressionaryfundingforffordablehousing"][data-test-radio-option="Yes"]');
    assert.dom('[data-test-radio="dcpHousingunittype"][data-test-radio-option="City"]').exists();
    assert.dom('[data-test-radio="dcpHousingunittype"][data-test-radio-option="State"]').exists();
    assert.dom('[data-test-radio="dcpHousingunittype"][data-test-radio-option="Federal"]').exists();
    assert.dom('[data-test-radio="dcpHousingunittype"][data-test-radio-option="Other"]').exists();
  });

  test('user can save pas form', async function (assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/pas-form/1/edit');

    // save button should start disabled
    // TODO: fix this test.  The form starts dirty because we implicitly create a new applicant when the applicants array is empty
    // assert.dom('[data-test-save-button').hasProperty('disabled', true);

    // edit a field to make it pasForm dirty
    await fillIn('[data-test-input="dcpRevisedprojectname"]', 'Some Cool New Project Name');

    // save button should become active when dirty
    assert.dom('[data-test-save-button').hasProperty('disabled', false);

    // save it
    await saveForm(); // async make sure save action finishes before assertion

    // database record should have new updated value
    assert.equal(this.server.db.pasForms[0].dcpRevisedprojectname, 'Some Cool New Project Name');
  });

  test('user sees a confirmation modal upon submit', async function (assert) {
    this.server.create('project', 1, 'toDo');

    // render form
    await visit('/pas-form/1/edit');

    await fillIn('[data-test-input="dcpRevisedprojectname"]', 'my project name');

    await click('[data-test-add-applicant-button]');
    await fillIn('[data-test-input="dcpFirstname"]', 'Tess');
    await fillIn('[data-test-input="dcpLastname"]', 'Ter');
    await fillIn('[data-test-input="dcpEmail"]', 'tesster@planning.nyc.gov');

    // modal doesn't exist to start
    assert.dom('[data-test-reveal-modal]').doesNotExist();
    assert.dom('[data-test-confirm-submit-button]').doesNotExist();

    // click submit
    await click('[data-test-submit-button]');

    // modal should exist
    assert.dom('[data-test-reveal-modal]').exists();
    assert.dom('[data-test-confirm-submit-button]').exists();

    await click('[data-test-confirm-submit-button]');

    // research: ember changeset validations save method triggers a
    // promise that resolves _after_ mirage has been torn down by tests
    await settled();

    assert.ok(true);
  });

  test('Urban Renewal Area sub Q, after set to no, does not block submit', async function (assert) {
    this.server.create('package', 'withExistingDocuments', 1, {
      pasForm: this.server.create('pas-form', {
        dcpUrbanrenewalarea: null,
        dcpUrbanareaname: '',
        applicants: [this.server.create('applicant', 'organizationApplicant')],
      }),
      project: this.server.create('project'),
    });

    await visit('/pas-form/1/edit');

    await fillIn('[data-test-input="dcpRevisedprojectname"]', 'my project name');

    assert.dom('[data-test-save-button]').hasNoAttribute('disabled');
    assert.dom('[data-test-submit-button]').hasNoAttribute('disabled');

    await click('[data-test-radio="dcpUrbanrenewalarea"][data-test-radio-option="Yes"]');

    assert.dom('[data-test-validation-message="dcpUrbanareaname"]').exists();
    assert.dom('[data-test-save-button]').hasNoAttribute('disabled');
    assert.dom('[data-test-submit-button]').hasAttribute('disabled');

    await fillIn('[data-test-input="dcpUrbanareaname"]', 'abc');

    assert.dom('[data-test-validation-message="dcpUrbanareaname"]').doesNotExist();
    assert.dom('[data-test-save-button]').hasNoAttribute('disabled');
    assert.dom('[data-test-submit-button]').hasNoAttribute('disabled');

    await fillIn('[data-test-input="dcpUrbanareaname"]', '');

    assert.dom('[data-test-validation-message="dcpUrbanareaname"]').exists('it revalidates');
    assert.dom('[data-test-save-button]').hasNoAttribute('disabled');
    assert.dom('[data-test-submit-button]').hasAttribute('disabled');
  });

  test('It sends an associated project to the server, and associates the correct project', async function (assert) {
    this.server.create('package', 'pasForm', {
      project: this.server.create('project', { id: '42' }),
    });

    await visit('/pas-form/1/edit');
    await fillIn('[data-test-section="project-geography"] .map-search-input', '1000120001');
    await triggerKeyEvent('[data-test-section="project-geography"] .labs-geosearch', 'keypress', 13);
    await click('[data-test-save-button]');

    assert.equal(this.server.db.bbls.firstObject.projectId, '42');
  });

  test('Docs appear in attachments section when visiting from another route', async function(assert) {
    this.server.create('package', 'toDo', 'pasForm', 'withExistingDocuments', {
      id: '1',
      project: this.server.create('project'),
    });

    // simulate a "sparse fieldset"
    this.server.get('/projects', function (schema) {
      const projects = schema.projects.all();
      const json = this.serialize(projects);

      json.included[0].attributes.documents = [];

      return json;
    });

    await visit('/projects');
    await click('[data-test-project-link="1"]');
    await click('[data-test-package-link="1"]');

    assert.dom('[data-test-section="attachments"').hasTextContaining('PAS Form.pdf');
  });

  test('For input dependent on radio button/checkbox -- when user fills out input, then clicks radio button/checkbox that hides input, text is not saved to model', async function(assert) {
    this.server.create('package', 'pasForm', {
      project: this.server.create('project'),
    });

    await visit('/pas-form/1/edit');

    // dcpInclusionaryhousingdesignatedareaname (radio button) -----------------------------------------
    // user selects "Yes" radio button and fills out input, then saves
    await click('[data-test-radio="dcpIsinclusionaryhousingdesignatedarea"][data-test-radio-option="Yes"]');
    await fillIn('[data-test-input="dcpInclusionaryhousingdesignatedareaname"]', 'bananas');
    await saveForm();
    assert.equal(this.server.db.pasForms[0].dcpInclusionaryhousingdesignatedareaname, 'bananas');
    // user selects "No" radio button and fills out input, then saves
    await click('[data-test-radio="dcpIsinclusionaryhousingdesignatedarea"][data-test-radio-option="No"]');
    await saveForm();
    // clicking on the radio button should set the value to an empty string
    assert.equal(this.server.db.pasForms[0].dcpInclusionaryhousingdesignatedareaname, '');
    // user re-selects "Yes" radio button and re-fills out input, then saves
    await click('[data-test-radio="dcpIsinclusionaryhousingdesignatedarea"][data-test-radio-option="Yes"]');
    await fillIn('[data-test-input="dcpInclusionaryhousingdesignatedareaname"]', 'peaches');
    await saveForm();
    assert.equal(this.server.db.pasForms[0].dcpInclusionaryhousingdesignatedareaname, 'peaches');

    // dcpProposeddevelopmentsiteotherexplanation (checkbox) -----------------------------------------
    // user selects checkbox and fills out input, then saves
    await click('[data-test-checkbox="dcpProposeddevelopmentsiteinfoother"]');
    await fillIn('[data-test-input="dcpProposeddevelopmentsiteotherexplanation"]', 'pecan pie');
    await saveForm();
    assert.equal(this.server.db.pasForms[0].dcpProposeddevelopmentsiteotherexplanation, 'pecan pie');
    await click('[data-test-checkbox="dcpProposeddevelopmentsiteinfoother"]');
    await saveForm();
    // clicking the checkbox should set the value to an empty string
    assert.equal(this.server.db.pasForms[0].dcpProposeddevelopmentsiteotherexplanation, '');
    // user re-selects checkbox and re-fills out input, then saves
    await click('[data-test-checkbox="dcpProposeddevelopmentsiteinfoother"]');
    await fillIn('[data-test-input="dcpProposeddevelopmentsiteotherexplanation"]', 'strawberry rhubarb');
    await saveForm();
    assert.equal(this.server.db.pasForms[0].dcpProposeddevelopmentsiteotherexplanation, 'strawberry rhubarb');
  });

  // applicants
  test('user can see existing applicants', async function(assert) {
    const project = this.server.create('project', 1, 'toDo');
    const { pasForm } = project.packages.models[0];

    // 3 scenarios/permutations of kinds of applicants
    this.server.create('applicant', 'organizationApplicant', { pasForm });
    this.server.create('applicant', 'individualApplicant', { pasForm });
    this.server.create('applicant', 'applicantTeamMember', { pasForm });

    await visit('/pas-form/1/edit');

    // there are 3 fieldsets visibile
    assert.dom('[data-test-applicant-fieldset="0"]').exists();
    assert.dom('[data-test-applicant-fieldset="1"]').exists();
    assert.dom('[data-test-applicant-fieldset="2"]').exists();
  });

  test('user can add new applicants', async function(assert) {
    this.server.create('project', 1, 'toDo');
    await visit('/pas-form/1/edit');

    // can add an applicant
    await click('[data-test-add-applicant-button]');
    assert.dom('[data-test-applicant-type="Applicant"]').exists();

    // can add an applicant team member
    await click('[data-test-add-applicant-team-member-button]');
    assert.dom('[data-test-applicant-type="Other Team Member"]').exists();

    await saveForm();

    assert.dom('[data-test-applicant-type="Applicant"]').exists();
    assert.dom('[data-test-applicant-type="Other Team Member"]').exists();
  });

  test('user can remove applicants', async function(assert) {
    const project = this.server.create('project', 1, 'toDo');
    const { pasForm } = project.packages.models[0];
    // create an applicant model
    const serverSideApplicant = this.server.create('applicant', 'organizationApplicant', { pasForm });
    // get the reference to the model instance
    const applicant = await this.owner.lookup('service:store').findRecord('applicant', serverSideApplicant.id);

    await visit('/pas-form/1/edit');

    await assert.equal(applicant.hasDirtyAttributes, false);
    await assert.equal(applicant.isDeleted, false);

    // remove the applicant
    await click('[data-test-remove-applicant-button');

    // should trigger dirty state, be queued for deletion when user saves
    await assert.equal(applicant.hasDirtyAttributes, true);
    await assert.equal(applicant.isDeleted, true);

    // FIXME: user shouldn't see the fieldset
    assert.dom('[data-test-applicant-fieldset="0"]').doesNotExist();

    await saveForm();

    assert.dom('[data-test-applicant-fieldset="0"]').doesNotExist();
  });

  test('user can toggle individual or organization applicant type', async function(assert) {
    const project = this.server.create('project', 1, 'toDo');
    const { pasForm } = project.packages.models[0];
    this.server.create('applicant', 'individualApplicant', { pasForm });

    this.applicants = [
      await this.owner.lookup('service:store').findRecord('applicant', 1),
    ];

    await visit('/pas-form/1/edit');

    // switch from Individual to Organization applicant type
    await click('[data-test-radio-option="Organization"]');

    // organization input should appear after user toggles to "Organization"
    assert.dom('[data-test-applicant-organization]').hasText('Organization Name');

    await saveForm();

    // should be reflected in the applicants array!
    assert.equal(this.applicants[0].dcpType, 717170001);
  });

  test('user can select a state for an applicant team member', async function(assert) {
    const project = this.server.create('project', 1, 'toDo');
    const { pasForm } = project.packages.models[0];

    this.server.create('applicant', 'individualApplicant', { pasForm });
    this.server.create('applicant', 'individualApplicant', { pasForm });

    this.applicants = [
      await this.owner.lookup('service:store').findRecord('applicant', 1),
    ];

    await visit('/pas-form/1/edit');

    await selectChoose('[data-test-applicant-state-dropdown]', 'OR');

    await saveForm();

    assert.equal(this.applicants[0].dcpState, 717170037);

    await saveForm();

    assert.equal(this.applicants[0].dcpState, 717170037);
  });

  test('user can search and add new bbls', async function (assert) {
    const project = this.server.create('project', 1, 'toDo');
    const { pasForm } = project.packages.models[0];

    // array of bbl objects is dcp_dcp_projectbbl_dcp_pasform
    this.server.create('bbl', {
      dcpBblnumber: '3071590111',
      dcpDevelopmentsite: null,
      dcpPartiallot: null,
      pasForm,
    });

    this.server.create('bbl', {
      dcpBblnumber: '3071590115',
      dcpDevelopmentsite: null,
      dcpPartiallot: null,
      pasForm,
    });

    this.bbls = [
      await this.owner.lookup('service:store').findRecord('bbl', 1),
      await this.owner.lookup('service:store').findRecord('bbl', 2),
    ];

    await visit('/pas-form/1/edit');

    // labs-ember-search class for search input
    await fillIn('.map-search-input', '1000120001');
    await triggerKeyEvent('.labs-geosearch', 'keypress', 13);

    assert.dom(this.element).includesText('1 Bowling Green, Manhattan');

    assert.dom('[data-test-bbl-title="1000120001"]').exists();

    // test that user can add more than one bbl
    await fillIn('.map-search-input', '1000030001');
    await triggerKeyEvent('.labs-geosearch', 'keypress', 13);

    assert.dom(this.element).includesText('10 Battery Park, Manhattan');

    assert.dom('[data-test-bbl-title="1000030001"]').exists();
  });

  test('user can remove a bbl', async function (assert) {
    const project = this.server.create('project', 1, 'toDo');
    const { pasForm } = project.packages.models[0];

    // array of objects
    // bbls array is dcp_dcp_projectbbl_dcp_pasform
    this.server.create('bbl', {
      dcpBblnumber: '3071590111',
      dcpDevelopmentsite: null,
      dcpPartiallot: null,
      pasForm,
    });

    this.server.create('bbl', {
      dcpBblnumber: '3071590115',
      dcpDevelopmentsite: null,
      dcpPartiallot: null,
      pasForm,
    });

    this.bbls = [
      await this.owner.lookup('service:store').findRecord('bbl', 1),
      await this.owner.lookup('service:store').findRecord('bbl', 2),
    ];

    await visit('/pas-form/1/edit');

    // labs-ember-search class for search input
    await fillIn('.map-search-input', '1000120001');
    await triggerKeyEvent('.labs-geosearch', 'keypress', 13);

    assert.dom('[data-test-bbl-title="3071590115"]').exists();
    assert.dom('[data-test-bbl-title="1000120001"]').exists();

    await click('[data-test-button-remove-bbl="1000120001"]');

    assert.dom('[data-test-bbl-title="3071590115"]').exists();
    assert.dom('[data-test-bbl-title="1000120001"]').doesNotExist();

    await click('[data-test-button-remove-bbl="3071590115"]');

    assert.dom('[data-test-bbl-title="3071590115"]').doesNotExist();
    assert.dom('[data-test-bbl-title="1000120001"]').doesNotExist();
  });

  test('user can update dcpDevelopmentsite through the radio buttons', async function (assert) {
    const project = this.server.create('project', 1, 'toDo');
    const { pasForm } = project.packages.models[0];

    // array of objects
    // bbls array is dcp_dcp_projectbbl_dcp_pasform
    this.server.create('bbl', {
      dcpBblnumber: '3071590111',
      dcpDevelopmentsite: null,
      dcpPartiallot: null,
      pasForm,
    });

    this.server.create('bbl', {
      dcpBblnumber: '3071590115',
      dcpDevelopmentsite: null,
      dcpPartiallot: null,
      pasForm,
    });

    this.bbls = [
      await this.owner.lookup('service:store').findRecord('bbl', 1),
      await this.owner.lookup('service:store').findRecord('bbl', 2),
    ];

    await visit('/pas-form/1/edit');

    // labs-ember-search class for search input
    await fillIn('.map-search-input', '1000120001');
    await triggerKeyEvent('.labs-geosearch', 'keypress', 13);

    // check that radio buttons work for bbl that already existed
    assert.dom('[data-test-development-site-question="3071590111-true"]').doesNotExist();
    assert.dom('[data-test-development-site-question="3071590111-false"]').doesNotExist();

    await click('[data-test-bbl-development-site-yes="3071590111"]');

    assert.dom('[data-test-development-site-question="3071590111-true"]').exists();
    assert.dom('[data-test-development-site-question="3071590111-false"]').doesNotExist();

    await click('[data-test-bbl-development-site-no="3071590111"]');
    assert.dom('[data-test-development-site-question="3071590111-true"]').doesNotExist();
    assert.dom('[data-test-development-site-question="3071590111-false"]').exists();

    // check that radio buttons work for user-added bbl
    assert.dom('[data-test-development-site-question="1000120001-true"]').doesNotExist();
    assert.dom('[data-test-development-site-question="1000120001-false"]').doesNotExist();

    await click('[data-test-bbl-development-site-yes="1000120001"]');
    assert.dom('[data-test-development-site-question="1000120001-true"]').exists();
    assert.dom('[data-test-development-site-question="1000120001-false"]').doesNotExist();

    await click('[data-test-bbl-development-site-no="1000120001"]');
    assert.dom('[data-test-development-site-question="1000120001-true"]').doesNotExist();
    assert.dom('[data-test-development-site-question="1000120001-false"]').exists();
  });

  test('user can update dcpPartiallot through the radio buttons', async function (assert) {
    const project = this.server.create('project', 1, 'toDo');
    const { pasForm } = project.packages.models[0];

    // array of objects
    // bbls array is dcp_dcp_projectbbl_dcp_pasform
    this.server.create('bbl', {
      dcpBblnumber: '3071590111',
      dcpDevelopmentsite: null,
      dcpPartiallot: null,
      pasForm,
    });

    this.server.create('bbl', {
      dcpBblnumber: '3071590115',
      dcpDevelopmentsite: null,
      dcpPartiallot: null,
      pasForm,
    });

    this.bbls = [
      await this.owner.lookup('service:store').findRecord('bbl', 1),
      await this.owner.lookup('service:store').findRecord('bbl', 2),
    ];

    await visit('/pas-form/1/edit');

    // labs-ember-search class for search input
    await fillIn('.map-search-input', '1000120001');
    await triggerKeyEvent('.labs-geosearch', 'keypress', 13);

    // check that radio buttons work for bbl that already existed
    assert.dom('[data-test-partial-lot-question="3071590111-true"]').doesNotExist();
    assert.dom('[data-test-partial-lot-question="3071590111-false"]').doesNotExist();

    await click('[data-test-bbl-partial-lot-yes="3071590111"]');
    assert.dom('[data-test-partial-lot-question="3071590111-true"]').exists();
    assert.dom('[data-test-partial-lot-question="3071590111-false"]').doesNotExist();

    await click('[data-test-bbl-partial-lot-no="3071590111"]');
    assert.dom('[data-test-partial-lot-question="3071590111-true"]').doesNotExist();
    assert.dom('[data-test-partial-lot-question="3071590111-false"]').exists();

    // check that radio buttons work for user-added bbl
    assert.dom('[data-test-partial-lot-question="1000120001-true"]').doesNotExist();
    assert.dom('[data-test-partial-lot-question="1000120001-false"]').doesNotExist();

    await click('[data-test-bbl-partial-lot-yes="1000120001"]');
    assert.dom('[data-test-partial-lot-question="1000120001-true"]').exists();
    assert.dom('[data-test-partial-lot-question="1000120001-false"]').doesNotExist();

    await click('[data-test-bbl-partial-lot-no="1000120001"]');
    assert.dom('[data-test-partial-lot-question="1000120001-true"]').doesNotExist();
    assert.dom('[data-test-partial-lot-question="1000120001-false"]').exists();
  });

  test('user can create bbls and it serializes to validated bbl', async function (assert) {
    this.server.create('project', 1, 'toDo');

    await visit('/pas-form/1/edit');

    await fillIn('.map-search-input', '1000120001');
    await triggerKeyEvent('.labs-geosearch', 'keypress', 13);

    await saveForm();

    const bbl = await this.owner.lookup('service:store').peekRecord('bbl', 1);

    assert.equal(bbl.dcpUserinputborough, 717170001);
  });

  test('User can add new actions and answer extra questions', async function (assert) {
    const projectPackage = this.server.create('package', 'toDo', 'pasForm', 'withLandUseActions');
    const packageModel = await this.owner.lookup('service:store').findRecord('package', projectPackage.id, { include: 'pas-form' });

    // Template block usage:
    await visit('/pas-form/1/edit');

    assert.equal(packageModel.pasForm.dcpPfzoningspecialpermit, undefined);

    await selectChoose('[data-test-land-use-action-picker]', 'Zoning Special Permit');
    await selectChoose('[data-test-land-use-action-picker]', 'Zoning Authorization');
    await saveForm();
    // Check that we can add "Zoning Special Permit" and "Zoning Authorization"
    assert.dom('[data-test-action-name="Zoning Special Permit"]').exists({ count: 1 });
    assert.dom('[data-test-action-name="Zoning Authorization"]').exists({ count: 1 });

    // Check that count field is set to 1 and that extra questions are not yet filled
    assert.equal(packageModel.pasForm.dcpPfzoningspecialpermit, 1);
    assert.equal(packageModel.pasForm.dcpZoningspecialpermitpursuantto, undefined);
    assert.equal(packageModel.pasForm.dcpZoningspecialpermittomodify, undefined);
    assert.equal(packageModel.pasForm.dcpPfzoningauthorization, 1);
    assert.equal(packageModel.pasForm.dcpZoningauthorizationpursuantto, undefined);
    assert.equal(packageModel.pasForm.dcpZoningauthorizationtomodify, undefined);

    // fill in count field for Zoning Special Permit
    await fillIn('[data-test-input="dcpPfzoningspecialpermit"]', 6);
    await saveForm();

    assert.equal(packageModel.pasForm.dcpPfzoningspecialpermit, 6);
    // make sure that changing one count field input did not affect the other
    assert.equal(packageModel.pasForm.dcpPfzoningauthorization, 1);
    // fill in count field for Zoning Authorization
    await fillIn('[data-test-input="dcpPfzoningauthorization"]', 4);
    await saveForm();

    assert.equal(packageModel.pasForm.dcpPfzoningauthorization, 4);
    // make sure that changing one count field input did not affect the other
    assert.equal(packageModel.pasForm.dcpPfzoningspecialpermit, 6);

    // check that user can fill in extra questions
    await fillIn('[data-test-input="dcpZoningspecialpermitpursuantto"]', 'Section 5B');
    await saveForm();

    assert.equal(packageModel.pasForm.dcpZoningspecialpermitpursuantto, 'Section 5B');
    await fillIn('[data-test-input="dcpZoningspecialpermittomodify"]', 'Permit 7A');
    await saveForm();

    assert.equal(packageModel.pasForm.dcpZoningspecialpermittomodify, 'Permit 7A');
  });

  test('User can delete actions', async function (assert) {
    const projectPackage = this.server.create('package', 'toDo', 'pasForm', 'withLandUseActions');

    const packageModel = await this.owner.lookup('service:store').findRecord('package', projectPackage.id, { include: 'pas-form' });

    // Template block usage:
    await visit('/pas-form/1/edit');

    // Check that user can delete action loaded from db, "Change in CityMap"
    assert.equal(packageModel.pasForm.dcpPfchangeincitymap, 1);
    await click('[data-test-delete-button="Change in CityMap"]');
    await saveForm();

    assert.equal(packageModel.pasForm.dcpPfchangeincitymap, null);
    assert.dom('[data-test-action-name="Change in CityMap"]').doesNotExist();

    // Check that user can delete "Zoning Special Permit" after adding
    await selectChoose('[data-test-land-use-action-picker]', 'Zoning Special Permit');

    await fillIn('[data-test-input="dcpPfzoningspecialpermit"]', 6);
    await saveForm();

    assert.equal(packageModel.pasForm.dcpPfzoningspecialpermit, 6);

    await fillIn('[data-test-input="dcpZoningspecialpermitpursuantto"]', 'Section 5B');
    await saveForm();

    assert.equal(packageModel.pasForm.dcpZoningspecialpermitpursuantto, 'Section 5B');

    await fillIn('[data-test-input="dcpZoningspecialpermittomodify"]', 'Permit 7A');
    await saveForm();

    assert.equal(packageModel.pasForm.dcpZoningspecialpermittomodify, 'Permit 7A');

    await click('[data-test-delete-button="Zoning Special Permit"]');
    await saveForm();

    assert.dom('[data-test-action-name="Zoning Special Permit"]').doesNotExist();
    assert.equal(packageModel.pasForm.dcpPfzoningspecialpermit, null);
    assert.equal(packageModel.pasForm.dcpZoningspecialpermitpursuantto, '');
    assert.equal(packageModel.pasForm.dcpZoningspecialpermittomodify, '');
  });

  test('User can load PAS Form with existing Land Use Actions', async function (assert) {
    const projectPackage = this.server.create('package', 'toDo', 'pasForm', 'withLandUseActions');

    await this.owner.lookup('service:store').findRecord('package', projectPackage.id, { include: 'pas-form' });

    // Template block usage:
    await visit('/pas-form/1/edit');

    assert.dom('[data-test-action-name="Change in CityMap"]').exists({ count: 1 });
    assert.dom('[data-test-action-name="Zoning Certification"]').exists({ count: 1 });
    assert.dom('[data-test-action-name="Zoning Text Amendment"]').exists({ count: 1 });

    assert.dom('[data-test-input="dcpPfzoningcertification"]').hasValue('21');
    assert.dom('[data-test-input="dcpZoningpursuantto"]').hasValue('some value');
    assert.dom('[data-test-input="dcpZoningtomodify"]').hasValue('some other val');
    assert.dom('[data-test-input="dcpAffectedzrnumber"]').hasNoValue();
    assert.dom('[data-test-input="dcpZoningresolutiontitle"]').hasNoValue();
  });

  test('Issue #235 Bug: Updating action inputs does not cause actions to show up twice', async function (assert) {
    const projectPackage = this.server.create('package', 'toDo', 'pasForm', 'withLandUseActions');

    await this.owner.lookup('service:store').findRecord('package', projectPackage.id, { include: 'pas-form' });

    // Template block usage:
    await visit('/pas-form/1/edit');

    await selectChoose('[data-test-land-use-action-picker]', 'Zoning Special Permit');
    await saveForm();

    // check that only one input exists
    assert.dom('[data-test-input="dcpZoningspecialpermitpursuantto"]').exists({ count: 1 });

    await fillIn('[data-test-input="dcpZoningspecialpermitpursuantto"]', 'Section 5B');
    await saveForm();

    // check that setting field on the model did NOT add another instance of the action to the UI
    assert.dom('[data-test-input="dcpZoningspecialpermitpursuantto"]').exists({ count: 1 });

    // user removes text
    await fillIn('[data-test-input="dcpZoningspecialpermitpursuantto"]', '');
    await saveForm();

    assert.dom('[data-test-input="dcpPfzoningspecialpermit"]').exists({ count: 1 });

    // check that only one input exists
    await fillIn('[data-test-input="dcpPfzoningspecialpermit"]', 6);
    await saveForm();

    // check that setting field on the model did NOT add another instance of the action to the UI
    assert.dom('[data-test-input="dcpPfzoningspecialpermit"]').exists({ count: 1 });
  });

  test('selected actions are sorted properly', async function (assert) {
    const projectPackage = this.server.create('package', 'toDo', 'pasForm', 'withLandUseActions');

    await this.owner.lookup('service:store').findRecord('package', projectPackage.id, { include: 'pas-form' });

    // Template block usage:
    await visit('/pas-form/1/edit');

    // selectedActions should be sorted:
    // (1) all new (added by user) actions should be on top, sorted by most recently added on top
    // (2) all actions from db should be on bottom, sorted alphabetically

    assert.dom('[data-test-action-name="Change in CityMap"]').exists({ count: 1 });
    assert.dom('[data-test-action-name="Zoning Certification"]').exists({ count: 1 });
    assert.dom('[data-test-action-name="Zoning Text Amendment"]').exists({ count: 1 });

    // if added in this order, should be sorted: (1) Renewal (2) Acquisition (3) Landfill
    await selectChoose('[data-test-land-use-action-picker]', 'Landfill');
    await selectChoose('[data-test-land-use-action-picker]', 'Acquisition of Real Property');
    await selectChoose('[data-test-land-use-action-picker]', 'Renewal');
    await saveForm();

    // check that order is: (1) Renewal (2) Acquisition (3) Landfill (4) CityMap (5) Zoning Cert (6) Zoning Text Amendment
    assert
      .dom('[data-test-section="land-use-actions"]')
      .hasText('Add a Proposed Action: -- select an action -- Land Use Actions Included in This Project Renewal Previous ULURP Numbers: ex. 200307ZRK This field is required Delete Action Acquisition of Real Property No additional information required for this action Delete Action Landfill No additional information required for this action Delete Action Change in CityMap No additional information required for this action Delete Action Zoning Certification How many Zoning Certification actions? Where in the Zoning Resolution can this action be found? Provide the Zoning Resolution section number. Ex. ZR Sec. 74-711 Which sections of the Zoning Resolution does this modify? Provide the Zoning Resolution section number(s). Ex. ZR Sec. 42-10 and 43-17 Delete Action Zoning Text Amendment Affected ZR Section Number: Provide the Zoning Resolution section number. Ex. ZR Sec. 74-711 This field is required Affected ZR Section Title: Provide the Zoning Resolution section Title. Ex. EXAMPLE This field is required Delete Action');
  });
});
