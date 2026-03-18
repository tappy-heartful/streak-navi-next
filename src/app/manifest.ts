import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Streak Navi',
    short_name: 'Streak Navi',
    description: 'Swing Streak Jazz Orchestra 公式ナビサイト',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000ff',
    icons: [
      {
        src: 'https://tappy-heartful.github.io/streak-images/navi/favicon.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: 'https://tappy-heartful.github.io/streak-images/navi/favicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://tappy-heartful.github.io/streak-images/navi/favicon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
