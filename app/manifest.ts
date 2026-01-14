
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Shamieda Family System',
        short_name: 'Shamieda',
        description: 'SaaS HR & Operations System for Shamieda Family',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
            {
                src: '/icon-pwa.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-pwa.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/icon-pwa.png',
                sizes: 'any',
                type: 'image/png',
            },
        ],
    }
}
