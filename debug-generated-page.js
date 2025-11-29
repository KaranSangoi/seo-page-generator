const https = require('https');

// Get the generated sample page - use direct page ID
const options = {
  hostname: 'chummyfunding.com',
  port: 443,
  path: '/wp-json/wp/v2/pages/1818?context=edit',  // context=edit gives us all meta fields
  method: 'GET',
  headers: {
    'Authorization': 'Basic ' + Buffer.from('StrykerDev:uHhQ MkyU 1j1A WNMl B0i5 fKWC').toString('base64')
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const page = JSON.parse(data);
      console.log('Response code:', res.statusCode);
      if (page.code) {
        console.log('Error code:', page.code);
        console.log('Error message:', page.message);
        return;
      }
      if (!page.id) {
        console.log('Page not found');
        console.log('Response keys:', Object.keys(page));
        return;
      }
      console.log('Page ID:', page.id);
      console.log('Page title:', page.title.rendered);
      console.log('Meta keys:', page.meta ? Object.keys(page.meta) : 'no meta');

      const elementorData = page.meta?._elementor_data;
      if (!elementorData || elementorData === 'undefined') {
        console.log('No Elementor data found in page meta');
        console.log('Trying direct page fetch with page ID...');
        // Try fetching with page ID directly
        return;
      }
      const parsed = JSON.parse(elementorData);

      // Find FAQ element
      function findFAQ(elements, depth = 0) {
        for (const el of elements) {
          if (el.settings && el.settings._element_id === 'faq-questions') {
            console.log('\n=== FOUND FAQ WIDGET ===');
            console.log('Widget type:', el.widgetType);
            console.log('Settings keys:', Object.keys(el.settings));
            if (el.settings.tabs) {
              console.log('\n=== TABS STRUCTURE ===');
              console.log('Number of tabs:', el.settings.tabs.length);
              if (el.settings.tabs[0]) {
                console.log('\nFirst tab keys:', Object.keys(el.settings.tabs[0]));
                console.log('\nFirst tab full structure:');
                console.log(JSON.stringify(el.settings.tabs[0], null, 2));
              }
              if (el.settings.tabs[1]) {
                console.log('\nSecond tab (to compare):');
                console.log(JSON.stringify(el.settings.tabs[1], null, 2));
              }
            }
            return el;
          }
          if (el.elements) {
            const found = findFAQ(el.elements, depth + 1);
            if (found) return found;
          }
        }
      }

      findFAQ(parsed);
    } catch (err) {
      console.error('Error:', err.message);
      console.error(err.stack);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e));
req.end();
