const fs = require('node:fs/promises');
const path = require('node:path');

const backendUrl = (process.env.KINGUARDIAN_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const scenarioFile = path.resolve(__dirname, '..', 'COMPLETE_113_TEST_SCENARIOS.md');

async function request(route) {
  const response = await fetch(`${backendUrl}${route}`);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function scenarioIds(markdown) {
  return [
    ...new Set(
      [...markdown.matchAll(/TEST\s+([A-Z0-9-]+):/g)]
        .map((match) => match[1])
        .filter((id) => id !== 'RESULTS')
    )
  ];
}

function result(id, title, passed, detail) {
  return { id, title, passed, detail };
}

async function main() {
  const markdown = await fs.readFile(scenarioFile, 'utf8');
  const ids = scenarioIds(markdown);
  const results = [];

  if (ids.length !== 113) {
    results.push(result('INVENTORY', '113 scenario inventory', false, `Found ${ids.length} unique scenario IDs`));
  } else {
    results.push(result('INVENTORY', '113 scenario inventory', true, 'Found 113 unique scenario IDs'));
  }

  const probes = [
    ['/health', 'Backend liveness'],
    ['/api/v1/db/health', 'Database health'],
    ['/api/v1/insights/verify-tests', 'Insights verification matrix'],
    ['/api/v1/ai/verify-tests', 'AI verification matrix'],
    ['/api/v1/wearables/test-scenarios', 'Wearables verification matrix']
  ];

  for (const [route, title] of probes) {
    try {
      const response = await request(route);
      const body = response.body;
      const matrix = Array.isArray(body?.results) ? body.results : null;
      const passed = response.status >= 200 && response.status < 300 && (matrix ? matrix.every((item) => item.passed !== false) : true);
      const detail = matrix ? `${matrix.filter((item) => item.passed !== false).length}/${matrix.length} checks passed` : `HTTP ${response.status}`;
      results.push(result(route, title, passed, detail));
    } catch (error) {
      results.push(result(route, title, false, `Unavailable: ${error.message}`));
    }
  }

  const automated = results.filter((item) => item.id !== 'INVENTORY');
  const passed = results.filter((item) => item.passed).length;
  console.log('KINGUARDIAN FUNCTIONAL TEST RUNNER');
  console.log(`Backend: ${backendUrl}`);
  console.log(`Scenario inventory: ${ids.length}/113`);
  console.log('');
  for (const item of results) {
    console.log(`[${item.passed ? 'PASS' : 'FAIL'}] ${item.id} - ${item.title}: ${item.detail}`);
  }
  console.log('');
  console.log(`Automated probe checks: ${automated.filter((item) => item.passed).length}/${automated.length} passed`);
  console.log(`Documented scenarios: ${ids.length}/113 discovered; individual execution requires the missing E2E harness.`);

  if (ids.length !== 113 || passed !== results.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Functional runner failed: ${error.message}`);
  process.exitCode = 1;
});
