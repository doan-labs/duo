import AppKit

// macOS app icons sit on a 1024pt canvas with the squircle body spanning 824pt.
// Crop to the body so each icon fills its tile the way an iOS icon does.
let BODY = 824.0 / 1024.0
let outDir = CommandLine.arguments[1]
let S = Double(CommandLine.arguments[2])!

for arg in CommandLine.arguments.dropFirst(3) {
  let p = arg.split(separator: "|", maxSplits: 1).map(String.init)
  let real = URL(fileURLWithPath: p[1]).resolvingSymlinksInPath()
  guard FileManager.default.fileExists(atPath: real.path) else { print("MISS \(p[0])"); continue }
  let img = NSWorkspace.shared.icon(forFile: real.path)
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(S), pixelsHigh: Int(S),
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  rep.size = NSSize(width: S, height: S)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  NSGraphicsContext.current!.imageInterpolation = .high
  let full = S / BODY, off = (full - S) / 2
  img.draw(in: NSRect(x: -off, y: -off, width: full, height: full), from: .zero, operation: .sourceOver, fraction: 1)
  NSGraphicsContext.restoreGraphicsState()
  try! rep.representation(using: .png, properties: [:])!
    .write(to: URL(fileURLWithPath: outDir).appendingPathComponent("\(p[0]).png"))
  print("OK \(p[0])")
}
