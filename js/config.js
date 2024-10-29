export const REDIRECT_URI = 'https://g-stanic.github.io/estro-medphys/callback.html';
export const GITHUB_USERNAME = 'g-stanic';
export const GITHUB_REPO = 'estro-medphys';
export const PROXY_URL = 'http://localhost:3000'; // Default to development URL

if (process.env.NODE_ENV === 'production') {
    PROXY_URL = 'https://your-production-proxy-url.com';
}
