import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compatible, conditional, HOST_PROFILES, HOST_SDK, semver, supports } from './compat.ts'
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
  assert.equal(supports(`${HOST_SDK}-dev.1`), false)
  assert.equal(supports(`${HOST_SDK}-dev.1`, true), true)
  // The approved legacy profile admits exactly the audited 0.0.0 contract on
  // this host; every other profile candidate stays refused.
  for (const version of HOST_PROFILES) assert.equal(supports(version), true, version)
  assert.equal(supports('0.0.0-dev.1'), false, 'a prerelease cannot take the profile')
  assert.equal(supports('0.0.0-dev.1', true), false, 'not even in development')
  for (const bad of ['0.0.1', '0.2.0', '1.0.0', '0.0.0.0', 'garbage']) assert.equal(supports(bad), false, bad)
  // A host that predates this contract keeps the pure caret rule: a bundle
  // built on 0.1.0 is refused, while its own 0.0.0 bundles still satisfy it.
  assert.equal(supports(HOST_SDK, false, '0.0.0'), false)
  assert.equal(supports('0.0.0', false, '0.0.0'), true)
  assert.equal(supports('0.0.0', false, '0.1.0'), true, 'the current host honors its own profile')
  assert.equal(supports('0.0.0', false, '0.2.0'), false, 'other hosts never take profiles')
  // Only the current contract may use conditional writes.
  assert.equal(conditional(HOST_SDK), true)
  assert.equal(conditional('0.0.0'), false, 'legacy profile cannot forge CAS')
  assert.equal(conditional('0.0.1'), false)
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
  // `microphone` is a declarable service grant, but never a frame capability:
  // declaring it must not open `allow` - capture stays host-side (decisions 42/103).
  assert.equal(permissionsValid(['microphone', 'files']), true)
  assert.match(frameAllow(['microphone']), /microphone 'none'/)
  assert.match(frameAllow(['geolocation']), /microphone 'none'/)
  assert.equal(permissionsValid(['photos', 'photos']), false)
  assert.equal(servicePermission('photos.add'), 'photos')
  assert.equal(servicePermission('mic.stop'), 'microphone')
  assert.equal(servicePermission('file.put'), 'files')
  assert.equal(servicePermission('mic.none'), undefined)
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
