import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Model | project applicant', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let store = this.owner.lookup('service:store');
    let model = store.createRecord('project-applicant', {});
    assert.ok(model);
  });
});
