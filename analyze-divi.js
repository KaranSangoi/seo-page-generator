const content = `[et_pb_section fb_built="1" custom_padding_last_edited="off|desktop" admin_label="Hero" _builder_version="4.27.3" _module_preset="74c69059-8e69-4122-b1e6-dfeabf6c5711" use_background_color_gradient="on" background_color_gradient_direction="189deg" background_color_gradient_stops="rgba(0,0,0,0.6) 0%|`;

// Extract all module_id values
const moduleIdPattern = /module_id="([^"]+)"/g;
const matches = [];
let match;
while ((match = moduleIdPattern.exec(content)) !== null) {
  matches.push(match[1]);
}

console.log('Module IDs found in template:');
matches.forEach(id => console.log(`  - ${id}`));
