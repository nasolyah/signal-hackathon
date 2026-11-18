// Encodes the frame list from record.cjs ("<jpeg>\t<repeat count>" per line) into a constant 30 fps H.264 MP4.
//   swift encode.swift <frames>/list.txt signal-demo.mp4
import AVFoundation
import Foundation
import ImageIO

let args = CommandLine.arguments
guard args.count == 3 else { print("usage: swift encode.swift list.txt out.mp4"); exit(2) }
let fps: Int32 = 30
let lines = try! String(contentsOfFile: args[1], encoding: .utf8).split(separator: "\n").map { $0.split(separator: "\t") }

func image(_ path: Substring) -> CGImage {
  let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: String(path)) as CFURL, nil)!
  return CGImageSourceCreateImageAtIndex(src, 0, nil)!
}

let first = image(lines[0][0])
let w = first.width, h = first.height
let out = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: out)
let writer = try! AVAssetWriter(outputURL: out, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: w,
  AVVideoHeightKey: h,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 8_000_000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoExpectedSourceFrameRateKey: 30,
    AVVideoMaxKeyFrameIntervalKey: 60,
  ],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
  kCVPixelBufferWidthKey as String: w,
  kCVPixelBufferHeightKey as String: h,
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

var frame: Int64 = 0
let space = CGColorSpace(name: CGColorSpace.sRGB)!
for parts in lines {
  let cg = image(parts[0])
  let count = Int(parts[1])!
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  CVPixelBufferLockBaseAddress(pb!, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: w, height: h, bitsPerComponent: 8,
                      bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: space,
                      bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
  CVPixelBufferUnlockBaseAddress(pb!, [])
  for _ in 0..<count {
    while !input.isReadyForMoreMediaData { usleep(2000) }
    adaptor.append(pb!, withPresentationTime: CMTime(value: frame, timescale: fps))
    frame += 1
  }
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
print("frames \(frame) (\(Double(frame) / Double(fps)) s), status \(writer.status.rawValue)", writer.error?.localizedDescription ?? "")
