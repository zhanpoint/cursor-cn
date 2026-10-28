import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setJsoncProperty } from './jsonc.ts';

test('preserves comments, settings, trailing commas and Windows newlines', () => {
  const source = '// startup\r\n{\r\n  // keep\r\n  "url": "https://example.com",\r\n}\r\n';
  const result = setJsoncProperty(source, 'locale', 'zh-cn');
  assert.equal(result, '// startup\r\n{\r\n  "locale": "zh-cn",\r\n  // keep\r\n  "url": "https://example.com",\r\n}\r\n');
  assert.equal(setJsoncProperty(result, 'locale', 'zh-cn'), result);
});

test('edits only the root value, preserving its comment and nested properties', () => {
  const source = '{"nested":{"locale":"en"}, "locale": /* keep */ "en" /* note */}';
  assert.equal(setJsoncProperty(source, 'locale', 'zh-cn'), source.replace('"en" /* note */', '"zh-cn" /* note */'));
});

test('supports empty objects, BOMs and escaped property names', () => {
  assert.equal(setJsoncProperty('\uFEFF{/*empty*/}', 'locale', 'zh-cn'), '\uFEFF{\n  "locale": "zh-cn"/*empty*/}');
  assert.equal(setJsoncProperty('{"lo\\u0063ale":"en"}', 'locale', 'zh-cn'), '{"lo\\u0063ale":"zh-cn"}');
});

test('can replace compound property values without touching adjacent settings', () => {
  assert.equal(setJsoncProperty('{"locale":{"a":[1,2]},"keep":true}', 'locale', 'zh-cn'), '{"locale":"zh-cn","keep":true}');
});

test('rejects malformed input instead of overwriting existing configuration', () => {
  for (const source of ['{"locale":}', '[]', '{/* unterminated', '{"locale":"en"']) {
    assert.throws(() => setJsoncProperty(source, 'locale', 'zh-cn'));
  }
});
