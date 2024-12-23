/**
 * Base URL for accessing raw files from GitHub.
 * @constant {string}
 */
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

/**
 * Constructs the URL for a GitHub logo based on the provided parameters.
 *
 * @param {string} owner - The GitHub username or organization that owns the repository.
 * @param {string} repo - The name of the repository.
 * @param {string} path - The path to the logo file within the repository.
 * @param {string} [branch='site'] - The branch of the repository to use (default is 'site').
 * @returns {string|null} The constructed URL for the logo, or null if the path is not provided.
 */
export function getGitLogoUrl(owner, repo, path, branch = 'site') {
    if (!path) return null;
    return `${GITHUB_RAW_BASE}/${owner}/${repo}/${branch}/${path}`;
}

/**
 * Generates a safe file path for a project logo based on the project name and file extension.
 *
 * @param {string} projectName - The name of the project for which the logo is being generated.
 * @param {string} fileExtension - The file extension for the logo (e.g., '.png', '.jpg').
 * @returns {string} The generated file path for the logo.
 */
export function generateLogoPath(projectName, fileExtension) {
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `assets/logos/${safeName}-logo${fileExtension}`;
}