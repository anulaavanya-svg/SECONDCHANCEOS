/**
 * Screen capture via Electron's desktopCapturer.
 *
 * `sources()` returns thumbnails for a picker; `capture()` grabs a full-
 * resolution PNG of the requested source (or the primary display by default).
 * Analysis of the captured image is delegated to AnthropicService.
 */
import { desktopCapturer, screen } from 'electron'
import type { CaptureSource, ScreenshotResult } from '@shared/types'
import { createLogger } from './logger'

const log = createLogger('screenshot')

export class ScreenshotService {
  async sources(): Promise<CaptureSource[]> {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 200 }
    })
    return sources.map((s) => ({
      id: s.id,
      name: s.name || 'Screen',
      thumbnail: s.thumbnail.toDataURL()
    }))
  }

  async capture(sourceId?: string): Promise<ScreenshotResult> {
    const primary = screen.getPrimaryDisplay()
    const { width, height } = primary.size
    const scale = primary.scaleFactor || 1

    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: {
        width: Math.round(width * scale),
        height: Math.round(height * scale)
      }
    })
    if (sources.length === 0) {
      throw new Error('No capturable screens were found.')
    }

    const chosen = sourceId ? sources.find((s) => s.id === sourceId) : undefined
    const source = chosen ?? sources.find((s) => s.id.startsWith('screen')) ?? sources[0]
    const image = source.thumbnail
    const size = image.getSize()
    log.info('captured', source.name, `${size.width}x${size.height}`)

    return {
      data: image.toPNG().toString('base64'),
      mediaType: 'image/png',
      width: size.width,
      height: size.height
    }
  }
}
