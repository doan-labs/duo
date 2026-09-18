export async function permissionProbe() {
  const result = {
    loader: window.name,
    secureContext: isSecureContext,
    opaqueOrigin: self.origin,
    geolocationPolicy: document.featurePolicy?.allowsFeature('geolocation'),
    cameraPolicy: document.featurePolicy?.allowsFeature('camera')
  }
  result.geolocation = await new Promise((resolve) => {
    if (!navigator.geolocation) return resolve('unavailable')
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (e) => resolve({ code: e.code, message: e.message }),
      { timeout: 5000 }
    )
  })
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    result.camera = 'allowed'
    stream.getTracks().forEach((track) => track.stop())
  } catch (e) {
    result.camera = { name: e.name, message: e.message }
  }
  parent.postMessage({ stage2: result }, '*')
}
