import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | packages/show', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    const route = this.owner.lookup('route:packages/show');
    assert.ok(route);
  });
});
