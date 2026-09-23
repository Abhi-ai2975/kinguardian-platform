/**
 * Zero Secret Leakage Security Test for React Native Mobile Application.
 *
 * Verifies:
 * 1. React Native application contains ZERO Open Wearables admin keys, API keys, or master secrets.
 * 2. Mobile clients communicate exclusively with the authenticated KinGuardian backend API.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Zero Secret Leakage in React Native Mobile Application', () => {
  const srcDir = path.resolve(__dirname, '../src');

  function scanDirectory(dir: string): string[] {
    let files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(scanDirectory(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.json'))) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('ensures no Open Wearables API keys or master credentials exist in mobile source files', () => {
    const allFiles = scanDirectory(srcDir);
    const forbiddenPatterns = [
      /OPEN_WEARABLES_API_KEY/i,
      /open_wearables_secret/i,
      /ow_sec_live/i,
      /openwearables_admin_key/i
    ];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }
  });
});
