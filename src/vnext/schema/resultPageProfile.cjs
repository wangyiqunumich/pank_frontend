const schema = require('./result_page_schema.json');

function resultPageProfile(profile) {
  const visuals = schema.main_visuals;
  const extensions = visuals.extension_profiles[profile];
  const items = Object.fromEntries(Object.entries(visuals.items).map(([id, definition]) => [
    id,
    definition.extension && !extensions.includes(id) ? {...definition, hidden: true} : definition,
  ]));
  return {...schema, main_visuals: {...visuals, items}};
}

module.exports = resultPageProfile;
