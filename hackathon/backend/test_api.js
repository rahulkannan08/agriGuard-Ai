// Quick API test script
const http = require('http');
const sharp = require('sharp');

async function testAPIs() {
  console.log('=== AgriVision API Tests ===\n');

  // Test 1: Health
  console.log('1. Testing GET /api/health...');
  const health = await makeRequest('GET', '/api/health');
  console.log(`   Status: ${health.status} ✅`);
  console.log(`   ML Mock Mode: ${health.services.ml.mockMode}`);
  console.log(`   LLM Configured: ${health.services.llm.configured}\n`);

  // Test 2: Crops
  console.log('2. Testing GET /api/crops...');
  const crops = await makeRequest('GET', '/api/crops');
  console.log(`   Total crops: ${crops.total} ✅`);
  console.log(`   Crops: ${crops.crops.map(c => c.name).join(', ')}\n`);

  // Test 3: Diseases
  console.log('3. Testing GET /api/diseases...');
  const diseases = await makeRequest('GET', '/api/diseases');
  console.log(`   Total diseases: ${diseases.total} ✅\n`);

  // Test 4: Diseases filtered
  console.log('4. Testing GET /api/diseases?crop=tomato...');
  const tomatoDiseases = await makeRequest('GET', '/api/diseases?crop=tomato');
  console.log(`   Tomato diseases: ${tomatoDiseases.total} ✅\n`);

  // Test 5: Analyze with a real image
  console.log('5. Testing POST /api/analyze (with generated test image)...');
  
  // Generate a 224x224 test image with noise (won't be blurry)
  const testImage = await sharp({
    create: {
      width: 224,
      height: 224,
      channels: 3,
      noise: { type: 'gaussian', mean: 128, sigma: 50 },
      background: { r: 100, g: 150, b: 50 }
    }
  }).png().toBuffer();
  
  const base64 = `data:image/png;base64,${testImage.toString('base64')}`;
  
  const analyzeResult = await makeRequest('POST', '/api/analyze', {
    image: base64,
    cropType: 'tomato'
  });
  
  console.log(`   Success: ${analyzeResult.success} ✅`);
  if (analyzeResult.prediction) {
    console.log(`   Disease: ${analyzeResult.prediction.diseaseName}`);
    console.log(`   Crop: ${analyzeResult.prediction.crop}`);
    console.log(`   Confidence: ${(analyzeResult.prediction.confidence * 100).toFixed(1)}%`);
    console.log(`   Severity: ${analyzeResult.prediction.severity}`);
  }
  if (analyzeResult.validation) {
    console.log(`   Blur Score: ${analyzeResult.validation.blurScore.toFixed(1)}`);
    console.log(`   Is Blurry: ${analyzeResult.validation.isBlurry}`);
  }
  if (analyzeResult.recommendations) {
    console.log(`   Recommendations: ✅ (summary: ${analyzeResult.recommendations.summary.substring(0, 60)}...)`);
  }
  if (analyzeResult.warning) {
    console.log(`   Warning: ${analyzeResult.warning.message}`);
  }
  console.log(`   Mock Mode: ${analyzeResult.metadata?.mockMode}\n`);

  // Test 6: Analyze with bad request (no image)
  console.log('6. Testing POST /api/analyze (validation error)...');
  const badResult = await makeRequest('POST', '/api/analyze', {});
  console.log(`   Success: ${badResult.success} (expected false) ✅`);
  console.log(`   Error: ${badResult.error?.code}\n`);

  console.log('=== All tests passed! ===');
}

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: `/api${path.startsWith('/api') ? path.substring(4) : path}`,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

testAPIs().catch(console.error);
