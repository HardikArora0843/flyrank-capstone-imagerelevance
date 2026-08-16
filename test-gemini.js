require('dotenv').config();

async function testGemini() {
  const model = process.env.GEMINI_TEXT_MODEL;
  const apiKey = process.env.GEMINI_API_KEY;

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log('Testing Gemini model:', model);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Reply with exactly: Gemini connection successful'
            }
          ]
        }
      ]
    })
  });

  const body = await response.text();

  console.log('\nHTTP status:', response.status);
  console.log('Response:', body);
}

testGemini().catch((error) => {
  console.error('Test failed:', error);
});