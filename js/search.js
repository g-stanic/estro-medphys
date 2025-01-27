/**
 * Search and filter functionality for the project list.
 * This module provides functions to search and filter projects based on user input.
 */

import { fetchProjects, createProjectCard, projectsCache } from './proj.js';

// Search and filter state
const searchState = {
    searchTerm: '',
    selectedLanguages: [],
    selectedTags: []
};

// Function to extract unique values from projects
function extractUniqueValues(projects, key) {
    const values = new Set();
    projects.forEach(project => {
        if (Array.isArray(project[key])) {
            project[key].forEach(value => values.add(value));
        } else if (project[key]) {
            values.add(project[key]);
        }
    });
    return Array.from(values).sort();
}

// Function to populate filter dropdowns
export function populateFilters(projects) {
    const languages = extractUniqueValues(projects, 'language');
    const tags = extractUniqueValues(projects, 'tags');

    const languageFilter = document.getElementById('languageFilter');
    const tagFilter = document.getElementById('tagFilter');

    // Populate language filter
    languages.forEach(language => {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language;
        languageFilter.appendChild(option);
    });

    // Populate tags filter
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });
}

export function setupSearchListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const languageFilter = document.getElementById('languageFilter');
    const tagFilter = document.getElementById('tagFilter');
    const clearFiltersBtn = document.getElementById('clearFilters');

    // Search button click
    searchButton.addEventListener('click', performSearch);

    // Enter key in search input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Filter changes
    languageFilter.addEventListener('change', performSearch);
    tagFilter.addEventListener('change', performSearch);

    // Clear filters
    clearFiltersBtn.addEventListener('click', clearAllFilters);
}

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const languageFilter = document.getElementById('languageFilter');
    const tagFilter = document.getElementById('tagFilter');
    
    // Get search criteria
    const searchTerm = searchInput.value.toLowerCase();
    const selectedLanguages = Array.from(languageFilter.selectedOptions).map(opt => opt.value);
    const selectedTags = Array.from(tagFilter.selectedOptions).map(opt => opt.value);

    // Show loading state
    const searchButton = document.getElementById('searchButton');
    searchButton.classList.add('loading');

    try {
        // Use cached projects instead of fetching
        const projects = projectsCache.data || await fetchProjects();
        
        const filteredProjects = projects.filter(project => {
            // Check search term
            const matchesSearch = !searchTerm || 
                project.name.toLowerCase().includes(searchTerm) ||
                (project.description && project.description.toLowerCase().includes(searchTerm));

            // Check languages
            const matchesLanguage = selectedLanguages.length === 0 || 
                selectedLanguages.includes(project.language);

            // Check tags
            const matchesTags = selectedTags.length === 0 || 
                selectedTags.some(tag => project.tags && project.tags.includes(tag));

            return matchesSearch && matchesLanguage && matchesTags;
        });

        // Update UI with filtered results
        await displayFilteredProjects(filteredProjects);
    } catch (error) {
        console.error('Search error:', error);
    } finally {
        searchButton.classList.remove('loading');
    }
}

function clearAllFilters() {
    const searchInput = document.getElementById('searchInput');
    const languageFilter = document.getElementById('languageFilter');
    const tagFilter = document.getElementById('tagFilter');

    searchInput.value = '';
    languageFilter.selectedIndex = -1;
    tagFilter.selectedIndex = -1;

    performSearch();
}

async function displayFilteredProjects(filteredProjects) {
    const projectsContainer = document.getElementById('projects-container');
    
    if (filteredProjects.length === 0) {
        projectsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No projects found matching your criteria</p>
            </div>`;
        return;
    }

    // Use existing createProjectCard function to display filtered projects
    projectsContainer.innerHTML = '';
    const projectCards = await Promise.all(
        filteredProjects.map(project => createProjectCard(project))
    );
    projectCards.forEach(card => projectsContainer.appendChild(card));
} 