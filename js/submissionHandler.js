import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';
import { getGitHubToken } from './auth.js';
import { generateLogoPath } from './logoUtils.js';

// Function to encode content in Base64 (required by GitHub API)
function encodeContent(content) {
    return btoa(unescape(encodeURIComponent(content)));
}

// Function to create YAML content from form data
function generateYAMLContent(formData) {
    return `---
name: ${formData.name}
${formData.abbreviation ? `abbreviation: ${formData.abbreviation}` : ''}
${formData.description ? `description: ${formData.description}` : ''}
repository: ${formData.repository}
${formData.language ? `language: ${formData.language}` : ''}
${formData.website ? `website: ${formData.website}` : ''}
${formData.tags && formData.tags.length > 0 ? `tags: ${JSON.stringify(formData.tags)}` : ''}
${formData.license ? `license: ${formData.license}` : ''}
${formData.logo ? `logo: ${formData.logo}` : ''}
${formData.submitted_by ? `submitted_by: ${JSON.stringify(formData.submitted_by)}` : ''}
added_date: ${new Date().toISOString().split('T')[0]}
---`;
}

export class GitHubSubmissionHandler {
    constructor(options) {
        this.owner = options.owner;
        this.repo = options.repo;
        this.baseBranch = options.baseBranch || 'main';
        this.projectsPath = options.projectsPath || '_projects';
    }

    async initialize() {
        const token = await getGitHubToken();
        if (!token) {
            throw new Error('No GitHub token found. Please login first.');
        }
        this.github = new Octokit({ auth: token });
        return this;
    }

    async submitProject(formData) {
        const token = await getGitHubToken();
        if (!token) {
            return {
                success: false,
                message: 'Please login with GitHub first'
            };
        }

        const github = new Octokit({ auth: token });
        
        try {
            // Create the new file with project data directly on the base branch
            const fileName = `${formData.name.toLowerCase().replace(/\s+/g, '-')}.yml`;
            const filePath = `${this.projectsPath}/${fileName}`;
            
            await github.repos.createOrUpdateFileContents({
                owner: this.owner,
                repo: this.repo,
                path: filePath,
                message: `Add new project: ${formData.name}`,
                content: encodeContent(generateYAMLContent(formData)),
                branch: this.baseBranch  // Commit directly to base branch
            });

            return {
                success: true,
                message: 'Project submitted successfully!'
            };
        } catch (error) {
            console.error('Error submitting project:', error);
            return {
                success: false,
                message: 'Error submitting project. Please try again later.'
            };
        }
    }

    async uploadLogo(file, projectName) {
        try {
            const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
            const logoPath = generateLogoPath(projectName, fileExtension);
            
            // Get the file's SHA if it exists
            let sha;
            try {
                const response = await this.github.repos.getContent({
                    owner: this.owner,
                    repo: this.repo,
                    path: logoPath,
                    ref: this.baseBranch
                });
                sha = response.data.sha;
            } catch (error) {
                // File doesn't exist yet, which is fine
                if (error.status !== 404) {
                    throw error;
                }
            }

            const base64Content = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const params = {
                owner: this.owner,
                repo: this.repo,
                path: logoPath,
                message: `Add logo for ${projectName}`,
                content: base64Content,
                branch: this.baseBranch
            };

            // Only include sha if the file exists
            if (sha) {
                params.sha = sha;
            }

            await this.github.repos.createOrUpdateFileContents(params);

            return logoPath;
        } catch (error) {
            console.error('Error uploading logo:', error);
            throw error;
        }
    }

    async removeProject(projectName) {
        const fileName = `${projectName.toLowerCase().replace(/\s+/g, '-')}.yml`;
        const filePath = `${this.projectsPath}/${fileName}`;

        try {
            // Get the file's SHA
            const fileResponse = await this.github.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path: filePath,
                ref: this.baseBranch
            });

            // Delete the file
            await this.github.repos.deleteFile({
                owner: this.owner,
                repo: this.repo,
                path: filePath,
                message: `Remove project: ${projectName}`,
                sha: fileResponse.data.sha,
                branch: this.baseBranch
            });

            return true;
        } catch (error) {
            console.error('Error removing project:', error);
            throw error;
        }
    }
}

