/**
 * Configuration file for GitHub authentication and application settings.
 * Contains constants used throughout the application.
 */

export const REDIRECT_URI = 'https://g-stanic.github.io/estro-medphys/callback.html'; // URI to redirect after GitHub authentication
export const GITHUB_USERNAME = 'g-stanic'; // GitHub username for the repository
export const GITHUB_REPO = 'estro-medphys'; // GitHub repository name

// Use window.location to check if we're in production
export const PROXY_URL = 'https://taupe-pudding-eebc72.netlify.app/.netlify/functions'; // Proxy URL for API requests during development
