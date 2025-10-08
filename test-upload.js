const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testUpload() {
  // Create a test file
  const testContent = 'This is a test file content for upload testing.';
  fs.writeFileSync('/tmp/test-file.txt', testContent);

  const form = new FormData();
  form.append('libraryId', '98e9ab95-5c79-4d6f-b25c-db053395c5dc');
  form.append('file', fs.createReadStream('/tmp/test-file.txt'), {
    filename: 'patrick.txt',
    contentType: 'text/plain',
  });

  console.log('Form boundary:', form.getBoundary());
  console.log('Form headers:', form.getHeaders());

  try {
    const response = await fetch('http://localhost:3001/source', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMwN2ZjZTVjLTdkYzktNDFjMC04NzY3LTJiYzhmMjA2ZDI5NCIsIm5hbWUiOiJNYXJrdXMiLCJlbWFpbCI6Im1hcmt1c0BrYXR0LmdkbiIsImlhdCI6MTc1OTk1MTg2NCwiZXhwIjoxNzU5OTU1NDY0fQ.Hyq20tudKZSFVcGpTNU5APmveeXMQoBh8f5R_goCS_s',
      },
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testUpload();
