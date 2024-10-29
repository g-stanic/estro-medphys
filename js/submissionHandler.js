import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';
import { getGitHubToken } from './auth.js';

// Function to encode content in Base64 (required by GitHub API)
function encodeContent(content) {
    return btoa(unescape(encodeURIComponent(content)));
}

// Function to generate a unique branch name
function generateBranchName(projectName) {
    const timestamp = new Date().getTime();
    return `add-project-${projectName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;
}

// Function to create YAML content from form data
function generateYAMLContent(formData) {
    return `---
name: ${formData.name}
description: ${formData.description}
repository: ${formData.repository}
website: ${formData.website || ''}
tags: ${JSON.stringify(formData.tags)}
license: ${formData.license}
maintainers: ${JSON.stringify(formData.maintainers)}
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

    async submitProject(formData) {
        const token = getGitHubToken();
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
}

