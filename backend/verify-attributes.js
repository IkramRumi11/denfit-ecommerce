const { normalizeAttributesInput } = await import('./utils/attributes.js');
const parsed = normalizeAttributesInput('{"material":["Leather"],"color":["Black"]}');
console.log('typeof=' + typeof parsed);
console.log('value=' + JSON.stringify(parsed));
