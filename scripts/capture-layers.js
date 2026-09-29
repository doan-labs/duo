// Evaluated in the shell by capture-layers.sh, under `?debug`: lays the phone
// flat, fixes the camera, and shows one layer at a time. The real ones are the
// scene's (the chassis with its glass dark, the live display); the window, the
// sandbox frame and the kit are drawn onto the same panel so they share its
// projection.
;(() => {
  const d = window.__duo
  const canvas = d.renderer.domElement
  const css = [...document.body.children].find((e) => e.tagName === 'DIV' && e.style.position === 'fixed')
  const panel = [...css.firstElementChild.firstElementChild.children].find((c) => c.offsetWidth > 700)
  const pose = () => {
    d.controls.enabled = false
    d.controls.enableDamping = false
    d.phone.rotation.set(-Math.PI / 2, 0, 0)
    d.camera.position.setFromSphericalCoords(60, 1.08, -0.5).add(d.controls.target)
    d.controls.update()
  }
  const black = (on) => {
    for (const k of ['inner', 'outer']) {
      const c = d.screens[k].material.color
      if (on) {
        c.set(0)
        c.setScalar = () => c
      } else delete c.setScalar
    }
  }
  const kids = () => [...panel.children].filter((c) => !c.dataset.cap)
  let over = null
  const overlay = (html, inset = 0) => {
    over?.remove()
    over = null
    for (const c of kids()) c.style.visibility = html ? 'hidden' : ''
    panel.style.background = html ? 'transparent' : ''
    panel.style.overflow = html ? 'visible' : ''
    if (!html) return
    over = document.createElement('div')
    over.dataset.cap = '1'
    over.style.cssText = `position:absolute;inset:${inset}px;z-index:9999;visibility:visible;font-family:-apple-system,system-ui,sans-serif`
    over.innerHTML = html
    panel.appendChild(over)
  }
  const A = '#7a7ae6'
  const G = '#3fae66'
  const chip = (t, c = A) =>
    `<span style="display:inline-block;padding:10px 18px;border-radius:999px;border:2px solid ${c};color:${c};font:600 22px ui-monospace,Menlo,monospace;background:rgba(122,122,230,0.08)">${t}</span>`
  const HTML = {
    window: `<div style="position:absolute;inset:0;border-radius:44px;background:rgba(150,150,160,0.16);border:2.5px solid rgba(150,150,165,0.75)">
      <div style="position:absolute;left:34px;top:26px;display:flex;gap:14px">
        <i style="width:20px;height:20px;border-radius:50%;background:#ff5f57"></i>
        <i style="width:20px;height:20px;border-radius:50%;background:#febc2e"></i>
        <i style="width:20px;height:20px;border-radius:50%;background:#28c840"></i>
      </div>
      <div style="position:absolute;left:0;right:0;top:72px;border-top:2px solid rgba(150,150,165,0.5)"></div></div>`,
    runtime: `<div style="position:absolute;inset:18px;border-radius:40px;border:4px dashed ${A};background:rgba(122,122,230,0.07)"></div>
      <div style="position:absolute;right:-12px;top:50%;width:26px;height:26px;margin-top:-13px;border-radius:50%;background:${G};box-shadow:0 0 0 8px rgba(63,174,102,0.25)"></div>`,
    sdk: `<div style="position:absolute;inset:0;border-radius:52px;border:2.5px solid ${A};background:rgba(122,122,230,0.10);display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:22px;padding:60px">
      <span style="width:92px;height:54px;border-radius:999px;background:${G};position:relative"><i style="position:absolute;right:5px;top:5px;width:44px;height:44px;border-radius:50%;background:#fff"></i></span>
      <span style="padding:14px 34px;border-radius:999px;background:${A};color:#fff;font:600 24px -apple-system,system-ui">Button</span>
      <span style="width:260px;height:10px;border-radius:5px;background:rgba(122,122,230,0.35);position:relative;align-self:center"><i style="position:absolute;left:0;top:0;width:150px;height:10px;border-radius:5px;background:${A}"></i><i style="position:absolute;left:136px;top:-12px;width:34px;height:34px;border-radius:50%;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.3)"></i></span>
      <span style="display:flex;border-radius:14px;border:2px solid ${A};overflow:hidden;font:600 22px -apple-system,system-ui;color:${A}"><b style="padding:10px 22px;background:${A};color:#fff">Day</b><b style="padding:10px 22px">Week</b><b style="padding:10px 22px">Month</b></span>
      <div style="flex-basis:100%;height:0"></div>
      ${chip('os.storage')} ${chip('os.device.on()')} ${chip('os.notify()')}</div>`
  }
  window.__cap = {
    pose,
    bg: (c) => {
      document.body.style.background = c
    },
    layer(name) {
      pose()
      const real = name === 'shell' || name === 'os' || name === 'app'
      canvas.style.visibility = name === 'shell' ? '' : 'hidden'
      css.style.visibility = name === 'shell' ? 'hidden' : ''
      black(name === 'shell')
      overlay(real ? null : HTML[name], name === 'window' ? -64 : 0)
      return name
    }
  }
  pose()
  return 'ready'
})()
