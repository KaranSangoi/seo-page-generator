const https = require('https');

const options = {
  hostname: 'chummyfunding.com',
  port: 443,
  path: '/wp-json/wp/v2/pages/1673',
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
      console.log('Response status:', res.statusCode);
      console.log('Page keys:', Object.keys(page));
      if (page.meta) {
        console.log('Meta keys:', Object.keys(page.meta));
      }
      const elementorData = page.meta?._elementor_data;
      if (!elementorData) {
        console.log('No _elementor_data found');
        return;
      }
      const parsed = JSON.parse(elementorData);

      // Find FAQ element
      function findFAQ(elements) {
        for (const el of elements) {
          if (el.settings && el.settings._element_id === 'faq-questions') {
            console.log('Found FAQ widget!');
            console.log('Widget type:', el.widgetType);
            console.log('Settings keys:', Object.keys(el.settings));
            if (el.settings.tabs) {
              console.log('\n=== TABS STRUCTURE ===');
              console.log('Number of tabs:', el.settings.tabs.length);
              if (el.settings.tabs[0]) {
                console.log('First tab keys:', Object.keys(el.settings.tabs[0]));
                console.log('First tab:', JSON.stringify(el.settings.tabs[0], null, 2));
              }
            }
            return el;
          }
          if (el.elements) {
            const found = findFAQ(el.elements);
            if (found) return found;
          }
        }
      }

      findFAQ(parsed);
    } catch (err) {
      console.error('Error:', err.message);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e));
req.end();
