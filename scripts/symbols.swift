// Exports SF Symbols as white PNGs, for use as CSS masks (recolour via currentColor).
// Usage: xcrun swift tools/symbols.swift <outDir> <px> <symbol> ...
import AppKit

let outDir = CommandLine.arguments[1]
let S = CGFloat(Double(CommandLine.arguments[2])!)

for name in CommandLine.arguments.dropFirst(3) {
  guard let base = NSImage(systemSymbolName: name, accessibilityDescription: nil),
        let img = base.withSymbolConfiguration(.init(pointSize: S * 0.82, weight: .semibold))
  else { print("MISS \(name)"); continue }
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(S), pixelsHigh: Int(S),
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  rep.size = NSSize(width: S, height: S)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  let f = min(S / img.size.width, S / img.size.height)
  let w = img.size.width * f, hh = img.size.height * f
  img.draw(in: NSRect(x: (S - w) / 2, y: (S - hh) / 2, width: w, height: hh))
  NSColor.white.setFill()
  NSRect(x: 0, y: 0, width: S, height: S).fill(using: .sourceAtop)
  NSGraphicsContext.restoreGraphicsState()
  try! rep.representation(using: .png, properties: [:])!
    .write(to: URL(fileURLWithPath: outDir).appendingPathComponent("\(name.replacingOccurrences(of: ".", with: "-")).png"))
  print("OK \(name)")
}
