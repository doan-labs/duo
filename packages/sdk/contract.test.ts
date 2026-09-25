import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compatible, semver, supports } from './compat.ts'
import { bytes, deviceEventName, deviceEventValid, keyValid, requestValid, widgetValid } from './guards.ts'
import { networkOrigin } from './manifest.ts'
import { frameAllow, permissionsValid, servicePermission } from './permissions.ts'

test('full caret matrix, including patch floors and 0.x', () => {
  const versions = ['0.0.0', '0.0.1', '0.1.0', '0.1.1', '0.2.5', '0.3.0', '1.0.0', '1.0.1', '1.2.0', '1.2.1', '2.0.0']
  for (const h of versions)
    for (const a of versions) {
      const host = semver(h)!
      const app = semver(a)!
      const expected =
        host.major === app.major &&
        (app.major > 0
          ? host.minor > app.minor || (host.minor === app.minor && host.patch >= app.patch)
          : app.minor > 0
            ? host.minor === app.minor && host.patch >= app.patch
            : host.minor === 0 && host.patch === app.patch)
      assert.equal(compatible(host, app), expected, `${h} satisfies ^${a}`)
    }
  assert.equal(supports('0.0.0-dev.1'), false)
  assert.equal(supports('0.0.0-dev.1', true), true)
  for (const bad of ['01.0.0', '1.0', '1.0.0+abc', '1.0.0-01', '1.0.0-', '9007199254740992.0.0'])
    assert.equal(semver(bad), null)
})
test('origin validation excludes CSP syntax and non-origin URLs', () => {
  assert.equal(networkOrigin('https://api.open-meteo.com'), true)
  for (const bad of [
    'https://*.example.com',
    'https://example.com/',
    'https://a.com/path',
    'https://a.com;script-src',
    'https://user@a.com',
    'http://a.com',
    "'self'"
  ])
    assert.equal(networkOrigin(bad, true), false, bad)
  assert.equal(networkOrigin('http://localhost:5173'), false)
  assert.equal(networkOrigin('http://localhost:5173', true), true)
})
test('table grants only declared features and identifies service methods', () => {
  assert.match(frameAllow(['geolocation', 'photos']), /geolocation \*/)
  assert.match(frameAllow(['geolocation']), /camera 'none'/)
  assert.match(frameAllow(), /fullscreen 'none'/)
  assert.equal(permissionsValid(['unknown']), false)
  assert.equal(permissionsValid(['camera']), false)
  assert.equal(permissionsValid(['microphone']), false)
  assert.match(frameAllow(['geolocation']), /microphone 'none'/)
  assert.equal(permissionsValid(['photos', 'photos']), false)
  assert.equal(servicePermission('photos.add'), 'photos')
})
test('UTF-8 bounds and request/widget guards', () => {
  assert.equal(bytes('🐈'), 4)
  assert.equal(keyValid('🐈'.repeat(32)), true)
  assert.equal(keyValid('🐈'.repeat(33)), false)
  assert.equal(keyValid('a\nb'), false)
  assert.equal(requestValid({ id: 1, m: 'session.keys' }), true)
  assert.equal(requestValid({ id: 1, m: 'native.exec' }), false)
  assert.equal(widgetValid({ lines: [{ text: 'hello', role: 'value' }] }), true)
  assert.equal(widgetValid({ lines: [{ text: 'a'.repeat(65), role: 'value' }] }), false)
})
test('device events: known types only, and every payload checked', () => {
  assert.equal(requestValid({ id: 1, m: 'device.watch', p: { type: 'volume' } }), true)
  assert.equal(deviceEventName('camera-control'), true)
  assert.equal(deviceEventName('accelerometer'), false)
  assert.equal(deviceEventValid('volume', { action: 'press', button: 'up' }), true)
  assert.equal(deviceEventValid('volume', { action: 'press', button: 'mute' }), false)
  assert.equal(deviceEventValid('camera-control', { action: 'slide', offset: -0.3 }), true)
  assert.equal(deviceEventValid('camera-control', { action: 'slide', offset: Number.NaN }), false)
  assert.equal(deviceEventValid('orientation', { yaw: -180, hinge: 90 }), true)
  assert.equal(deviceEventValid('orientation', { yaw: 180, hinge: 90 }), false)
  const switches = { airplane: false, cell: true, wifi: true, bt: true, drop: true, hotspot: false }
  const rest = { rotate: false, mirror: false, focus: false, torch: false, darkMode: false }
  assert.equal(deviceEventValid('switches', { ...switches, ...rest }), true)
  assert.equal(deviceEventValid('switches', switches), false)
})
