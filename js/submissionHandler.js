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
      
        // Get the latest commit SHA from the base branch
        const {data: ref} = await github.git.getRef({
            owner: this.owner,
            repo: this.repo,
            ref: `heads/${this.baseBranch}`
        });
        const baseSha = ref.object.sha;

        // Create a new branch
        const newBranch = generateBranchName(formData.name);
        await github.git.createRef({
            owner: this.owner,
            repo: this.repo,
            ref: `refs/heads/${newBranch}`,
            sha: baseSha
        });

        // Create the new file with project data
        const content = generateYAMLContent(formData);
        const fileName = `${formData.name.toLowerCase().replace(/\s+/g, '-')}.yml`;
        const filePath = `${this.projectsPath}/${fileName}`;

        await github.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path: filePath,
            message: `Add new project: ${formData.name}`,
            content: encodeContent(content),
            branch: newBranch
        });

        // Create a Pull Request
        const {data: pr} = await github.pulls.create({
            owner: this.owner,
            repo: this.repo,
            title: `Add new project: ${formData.name}`,
            head: newBranch,
            base: this.baseBranch,
            body: `
                New project submission:
                - Name: ${formData.name}
                - Description: ${formData.description}
                - Repository: ${formData.repository}
                - License: ${formData.license}

                Submitted through the website form.`
            });

        return {
            success: true,
            prUrl: pr.html_url,
            message: 'Project submitted successfully! Your submission is under review.'
        };

    } catch (error) {
        console.error('Error submitting project:', error);
        return {
            success: false,
            message: 'Error submitting project. Please try again later.'
        };
    }
}
