import { SITE_DESCRIPTION, SITE_FEATURES, SITE_NAME } from '@/constants/site'
import { getSiteUrl } from '@/lib/env'

/** GET handlers are dynamic by default, and this body never changes per request. */
export const dynamic = 'force-static'

/** Blocks are joined by a blank line, so each entry is one markdown paragraph or list. */
export function GET() {
  const siteUrl = getSiteUrl()

  const blocks = [
    `# ${SITE_NAME}`,
    `> ${SITE_DESCRIPTION}`,
    [
      `${SITE_NAME} is a free, single-page web app with no account and no server-side processing.`,
      'The image is decoded in the browser, dithered in a Web Worker, and every export is produced',
      'on the device, so no file is ever uploaded.',
    ].join('\n'),

    '## Features',
    SITE_FEATURES.map(function toBullet(feature) {
      return `- ${feature}`
    }).join('\n'),

    '## Limits',
    [
      '- Previews render at up to 1400 px on the longest edge; still exports run at the source resolution.',
      '- WebM video is capped at 1080 px, 4 s at 30 fps. GIF is capped at 800 px, 24 frames at 20 fps.',
      '- Error-diffusion patterns (Floyd–Steinberg, Atkinson) cannot be animated, because a frame cannot be derived from a timestamp alone.',
    ].join('\n'),

    '## Links',
    `- App: ${siteUrl}`,

    '## Usage',
    [
      'Crawling, quoting and citing this page is welcome, including for model training.',
      `Please attribute to ${SITE_NAME} and link to ${siteUrl}.`,
    ].join('\n'),
  ]

  return new Response(`${blocks.join('\n\n')}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
