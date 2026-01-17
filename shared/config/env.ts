export const env = {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'https://only-btc.app',
    NEXT_PUBLIC_TITLE: process.env.NEXT_PUBLIC_TITLE || 'Only Bitcoin',
    NEXT_PUBLIC_GA_TRACKING_ID: process.env.NEXT_PUBLIC_GA_TRACKING_ID || '',
    NEXT_PUBLIC_MEME_IMAGE_URL: process.env.NEXT_PUBLIC_MEME_IMAGE_URL || '',
    BLINK_ACCESS_TOKEN: process.env.BLINK_ACCESS_TOKEN || '',
} as const;