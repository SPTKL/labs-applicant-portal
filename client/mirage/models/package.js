import { Model, belongsTo } from 'ember-cli-mirage';

export default Model.extend({
  project: belongsTo('project'),
  pasForm: belongsTo('pas-form'),
  rwcdsForm: belongsTo('rwcds-form'),
  landuseForm: belongsTo('landuse-form'),
});
