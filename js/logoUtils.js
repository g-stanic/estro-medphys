const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

export function getGitLogoUrl(owner, repo, path, branch = 'site') {
    if (!path) return null;
    return `${GITHUB_RAW_BASE}/${owner}/${repo}/${branch}/${path}`;
}

export function generateLogoPath(projectName, fileExtension) {
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `assets/logos/${safeName}${fileExtension}`;
}