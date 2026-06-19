/**
 * BigQuery Release Notes Hub & Social Composer
 * Client-side logic for fetching, filtering, rendering, and sharing.
 */

// Application State
const state = {
    items: [],
    filteredItems: [],
    selectedItem: null,
    searchQuery: '',
    filterType: 'all',
    activePlatform: 'x', // 'x' or 'linkedin'
    activeFeed: 'vertex-ai' // 'vertex-ai' or 'bigquery'
};

// SVG Progress Ring Constants
const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.querySelector('#refresh-btn i'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    feedSelect: document.getElementById('feed-select'),
    headerTitle: document.getElementById('header-title'),
    headerLogoIcon: document.getElementById('header-logo-icon'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    filterSelect: document.getElementById('filter-select'),
    statsCounter: document.getElementById('stats-counter'),
    loadingIndicator: document.getElementById('loading-indicator'),
    emptyIndicator: document.getElementById('empty-indicator'),
    notesContainer: document.getElementById('notes-container'),
    
    // Modal Elements
    composerModal: document.getElementById('composer-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalCloseBtn: document.getElementById('composer-close'),
    previewBadge: document.getElementById('preview-item-badge'),
    previewDate: document.getElementById('preview-item-date'),
    previewText: document.getElementById('preview-item-text'),
    composerTextarea: document.getElementById('composer-textarea'),
    charCounter: document.getElementById('char-counter'),
    charProgress: document.getElementById('char-progress'),
    composerCopy: document.getElementById('composer-copy'),
    composerSend: document.getElementById('composer-send'),
    
    // Tabs
    tabXBtn: document.getElementById('tab-x-btn'),
    tabLinkedinBtn: document.getElementById('tab-linkedin-btn'),
    
    toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Close message">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    
    // Add event listener to close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    });
    
    elements.toastContainer.appendChild(toast);
    
    // Force reflow and show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }
    }, 4000);
}

// ==========================================================================
// FEED DATA UTILITIES
// ==========================================================================

/**
 * Fetch release notes from the Flask API
 */
async function fetchReleaseNotes(forceRefresh = false) {
    try {
        setLoadingState(true);
        
        // Append query parameter for active feed and refresh status
        const url = `/api/release-notes?feed=${state.activeFeed}${forceRefresh ? '&refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        state.items = data.items || [];
        
        const feedName = state.activeFeed === 'vertex-ai' ? 'Vertex AI' : 'BigQuery';
        if (forceRefresh) {
            showToast('Feed Refreshed', `Latest ${feedName} release notes loaded.`, 'success');
        } else {
            showToast('Feed Sync Complete', `Loaded ${state.items.length} ${feedName} updates successfully.`, 'info');
        }
        
        applyFilters();
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast('Sync Failed', 'Could not retrieve release notes. Please try again.', 'error');
        setLoadingState(false);
    }
}

/**
 * Update UI state while loading
 */
function setLoadingState(isLoading) {
    if (isLoading) {
        document.body.classList.add('loading-feed');
        elements.refreshBtn.disabled = true;
        elements.loadingIndicator.style.display = 'flex';
        elements.notesContainer.style.display = 'none';
        elements.emptyIndicator.style.display = 'none';
        elements.statsCounter.textContent = 'Loading items...';
    } else {
        document.body.classList.remove('loading-feed');
        elements.refreshBtn.disabled = false;
        elements.loadingIndicator.style.display = 'none';
    }
}

/**
 * Apply active search query and type filters
 */
function applyFilters() {
    const searchVal = elements.searchInput.value.toLowerCase().trim();
    const filterVal = elements.filterSelect.value;
    
    state.searchQuery = searchVal;
    state.filterType = filterVal;
    
    state.filteredItems = state.items.filter(item => {
        // Type filter matching
        const matchesType = (filterVal === 'all') || (item.type.toLowerCase() === filterVal);
        
        // Search matching
        const matchesSearch = !searchVal || 
            item.text.toLowerCase().includes(searchVal) ||
            item.type.toLowerCase().includes(searchVal) ||
            item.date.toLowerCase().includes(searchVal);
            
        return matchesType && matchesSearch;
    });
    
    // Toggle search clear button
    elements.clearSearchBtn.style.display = searchVal ? 'block' : 'none';
    
    renderFeed();
}

/**
 * Render list of release note cards
 */
function renderFeed() {
    setLoadingState(false);
    elements.notesContainer.innerHTML = '';
    
    const count = state.filteredItems.length;
    elements.statsCounter.textContent = `${count} ${count === 1 ? 'update' : 'updates'} shown`;
    
    if (count === 0) {
        elements.notesContainer.style.display = 'none';
        elements.emptyIndicator.style.display = 'flex';
        return;
    }
    
    elements.emptyIndicator.style.display = 'none';
    elements.notesContainer.style.display = 'grid';
    
    state.filteredItems.forEach(item => {
        const card = document.createElement('article');
        card.className = `note-card type-${item.type.toLowerCase()}`;
        card.id = `card-${item.id}`;
        
        // Highlight active select state
        const isSelected = state.selectedItem && state.selectedItem.id === item.id;
        if (isSelected) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <div class="card-header">
                <div class="badge-and-date">
                    <span class="type-badge">${item.type}</span>
                    <time class="date-text" datetime="${item.timestamp}">${item.date}</time>
                    ${isSelected ? '<span class="selected-badge" title="Selected update for sharing"><i class="fa-solid fa-circle-check"></i> Selected</span>' : ''}
                </div>
                <div class="card-actions">
                    <button class="icon-btn copy-btn" title="Copy update text" data-id="${item.id}">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button class="icon-btn tweet-btn" title="Share this update" data-id="${item.id}">
                        <i class="fa-solid fa-share-nodes"></i>
                    </button>
                </div>
            </div>
            <div class="card-content">
                ${item.html}
            </div>
            <div class="card-footer">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="feed-link" title="Open official release notes page">
                    <span>Official Release Notes</span>
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
                <button class="btn btn-secondary btn-card-tweet" data-id="${item.id}">
                    <i class="fa-solid fa-paper-plane"></i>
                    <span>Share / Post</span>
                </button>
            </div>
        `;
        
        // Add card selection listener
        card.addEventListener('click', (e) => {
            // Ignore click if user clicked a link, button, or icon
            if (e.target.tagName === 'A' || e.target.closest('a') || e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            selectItem(item);
        });
        
        // Event listeners for actions within card
        card.querySelector('.copy-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            copyTextToClipboard(item.text);
        });
        
        card.querySelector('.tweet-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openComposer(item);
        });
        
        card.querySelector('.btn-card-tweet').addEventListener('click', (e) => {
            e.stopPropagation();
            openComposer(item);
        });
        
        elements.notesContainer.appendChild(card);
    });
}

/**
 * Handle selecting a release note card
 */
function selectItem(item) {
    const oldSelectedId = state.selectedItem ? state.selectedItem.id : null;
    
    // Toggle selection
    if (oldSelectedId === item.id) {
        state.selectedItem = null;
        document.getElementById(`card-${item.id}`)?.classList.remove('selected');
        showToast('Deselected', 'Update deselected.', 'info');
    } else {
        // Remove old selection if exists
        if (oldSelectedId) {
            document.getElementById(`card-${oldSelectedId}`)?.classList.remove('selected');
        }
        state.selectedItem = item;
        document.getElementById(`card-${item.id}`)?.classList.add('selected');
        showToast('Update Selected', 'Click "Share / Post" to compose an update.', 'info');
    }
}

/**
 * Copy plain text to clipboard
 */
function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to Clipboard', 'Text copied successfully.', 'success');
    }).catch(err => {
        console.error('Clipboard copy failed:', err);
        showToast('Copy Failed', 'Unable to write to clipboard.', 'error');
    });
}

// ==========================================================================
// COMPOSER MODAL LOGIC
// ==========================================================================

/**
 * Open the custom Social Composer Modal with preset text based on active platform
 */
function openComposer(item) {
    state.selectedItem = item;
    
    // Highlight card in feed background
    document.querySelectorAll('.note-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`card-${item.id}`)?.classList.add('selected');
    
    // Set preview details
    elements.previewBadge.textContent = item.type;
    elements.previewDate.textContent = item.date;
    elements.previewText.textContent = item.text;
    
    // Set badge style in preview
    elements.previewBadge.className = 'preview-badge';
    elements.previewBadge.parentElement.className = `badge-and-date type-${item.type.toLowerCase()}`;
    
    // Set initial text depending on active platform
    setComposerDraftText();
    
    // Open Modal
    elements.composerModal.classList.add('active');
    elements.composerModal.setAttribute('aria-hidden', 'false');
    elements.composerTextarea.focus();
}

/**
 * Generates and sets draft text inside composer based on selected platform and active feed
 */
function setComposerDraftText() {
    const item = state.selectedItem;
    if (!item) return;
    
    const isVertex = state.activeFeed === 'vertex-ai';
    const productName = isVertex ? 'Vertex AI' : 'BigQuery';
    
    if (state.activePlatform === 'x') {
        const header = `${productName} ${item.type} (${item.date}):\n\n`;
        const footer = isVertex 
            ? `\n\n#${productName.replace(' ', '')} #GoogleCloud #MachineLearning`
            : `\n\n#${productName} #GoogleCloud`;
        
        // X/Twitter 280 char limit calculations
        const maxSnippetLength = 280 - header.length - footer.length - 20; 
        
        let snippet = item.text;
        if (snippet.length > maxSnippetLength) {
            snippet = snippet.substring(0, maxSnippetLength - 3) + '...';
        }
        
        elements.composerTextarea.value = `${header}${snippet}${footer}`;
    } else if (state.activePlatform === 'linkedin') {
        // LinkedIn format is typically longer, more professional, and structural
        const header = `📢 Google Cloud ${productName} Release Update (${item.date})\n\n`;
        const body = `📂 Category: ${item.type}\n\n${item.text}\n\n`;
        const linkStr = `🔗 Learn more: ${item.link}\n\n`;
        
        const tags = isVertex
            ? `#VertexAI #GoogleCloud #MachineLearning #ArtificialIntelligence #ComputerVision #GCP #DataScience`
            : `#BigQuery #GoogleCloud #DataAnalytics #DataEngineering #CloudComputing #GCP`;
        
        elements.composerTextarea.value = `${header}${body}${linkStr}${tags}`;
    }
    
    updatePostProgress();
    updateSubmitButton();
}

/**
 * Close composer modal
 */
function closeComposer() {
    elements.composerModal.classList.remove('active');
    elements.composerModal.setAttribute('aria-hidden', 'true');
}

/**
 * Switches the composer platform (X vs LinkedIn)
 */
function switchPlatform(platform) {
    if (state.activePlatform === platform) return;
    
    state.activePlatform = platform;
    
    // Update active tab buttons UI
    elements.tabXBtn.classList.toggle('active', platform === 'x');
    elements.tabLinkedinBtn.classList.toggle('active', platform === 'linkedin');
    
    // Refill the draft text
    setComposerDraftText();
}

/**
 * Update character count, limits, and SVG progress circle
 */
function updatePostProgress() {
    const text = elements.composerTextarea.value;
    const limit = state.activePlatform === 'x' ? 280 : 3000;
    const remaining = limit - text.length;
    
    // Update counter display
    elements.charCounter.textContent = remaining;
    
    // Set warning/danger classes
    elements.charCounter.className = 'char-counter';
    if (state.activePlatform === 'x') {
        if (remaining <= 40 && remaining > 0) elements.charCounter.classList.add('warning');
        else if (remaining <= 0) elements.charCounter.classList.add('danger');
    } else { // LinkedIn
        if (remaining <= 300 && remaining > 0) elements.charCounter.classList.add('warning');
        else if (remaining <= 0) elements.charCounter.classList.add('danger');
    }
    
    // Circular progress indicator calculations
    const percentage = Math.min(100, Math.max(0, (text.length / limit) * 100));
    const offset = RING_CIRCUMFERENCE - (percentage / 100) * RING_CIRCUMFERENCE;
    elements.charProgress.style.strokeDashoffset = offset;
    
    // Set progress colors
    if (remaining <= 0) {
        elements.charProgress.style.stroke = '#ef4444'; // Red
    } else if (state.activePlatform === 'x' && remaining <= 40) {
        elements.charProgress.style.stroke = '#ff9f1c'; // Orange
    } else if (state.activePlatform === 'linkedin' && remaining <= 300) {
        elements.charProgress.style.stroke = '#ff9f1c'; // Orange
    } else {
        elements.charProgress.style.stroke = state.activePlatform === 'x' ? '#1d9bf0' : '#0077b5'; // Brand color
    }
    
    // Toggle submit button state
    elements.composerSend.disabled = text.length === 0 || remaining < 0;
}

/**
 * Adjust styling and icons of submit action button based on platform
 */
function updateSubmitButton() {
    const btn = elements.composerSend;
    btn.className = 'btn'; // Reset
    
    if (state.activePlatform === 'x') {
        btn.classList.add('btn-twitter');
        btn.innerHTML = `<i class="fa-brands fa-x-twitter"></i> <span>Post Tweet</span>`;
    } else {
        btn.classList.add('btn-linkedin');
        btn.innerHTML = `<i class="fa-brands fa-linkedin"></i> <span>Share / Copy</span>`;
    }
}

/**
 * Handle sending or posting the composer contents
 */
function sendPost() {
    const text = elements.composerTextarea.value;
    const limit = state.activePlatform === 'x' ? 280 : 3000;
    
    if (!text || text.length > limit) {
        showToast('Submission Error', `Text must be between 1 and ${limit} characters.`, 'error');
        return;
    }
    
    if (state.activePlatform === 'x') {
        // Open Twitter intent window
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'width=550,height=420,toolbar=no,menubar=no,scrollbars=yes');
        
        closeComposer();
        showToast('Drafting Tweet', 'Opening X tweet composer in a new tab.', 'success');
    } else if (state.activePlatform === 'linkedin') {
        // Copies text to clipboard and redirects to LinkedIn feed for posting
        navigator.clipboard.writeText(text).then(() => {
            showToast('Text Copied', 'LinkedIn post draft copied! Opening LinkedIn...', 'success');
            
            // Wait slightly for toast then redirect
            setTimeout(() => {
                window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank');
                closeComposer();
            }, 600);
        }).catch(err => {
            console.error('LinkedIn copy text failed:', err);
            showToast('Copy Failed', 'Please manually copy the draft text.', 'error');
        });
    }
}


// ==========================================================================
// UTILITY FUNCTIONS (CSV EXPORT & THEME SWITCH)
// ==========================================================================

/**
 * Export currently filtered release note items as a CSV file download
 */
function exportToCSV() {
    if (state.filteredItems.length === 0) {
        showToast('Export Stalled', 'No visible updates to export.', 'error');
        return;
    }
    
    const headers = ['Date', 'Type', 'Description', 'Link'];
    const rows = state.filteredItems.map(item => [
        item.date,
        item.type,
        item.text,
        item.link
    ]);
    
    // Properly format fields for CSV (escape double quotes, wrap in quotes)
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        
        // Dynamic filename based on active feed
        const filename = `${state.activeFeed.replace('-', '_')}_release_notes.csv`;
        link.setAttribute('download', filename);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('CSV Exported', `Successfully exported ${rows.length} updates.`, 'success');
    } catch (err) {
        console.error('CSV export failed:', err);
        showToast('Export Failed', 'An error occurred during file generation.', 'error');
    }
}

/**
 * Initialize theme based on localStorage preference
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (elements.themeToggle) elements.themeToggle.checked = true;
    } else {
        document.body.classList.remove('light-theme');
        if (elements.themeToggle) elements.themeToggle.checked = false;
    }
}

/**
 * Toggle color scheme theme
 */
function toggleTheme() {
    const isLight = elements.themeToggle.checked;
    if (isLight) {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        showToast('Light Theme Active', 'Swapped page theme to Light Mode.', 'info');
    } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
        showToast('Dark Theme Active', 'Swapped page theme to Dark Mode.', 'info');
    }
}

// ==========================================================================
// EVENT LISTENERS & INITIALIZATION
// ==========================================================================

function initEvents() {
    // Refresh button click
    elements.refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });
    
    // Export CSV button click
    if (elements.exportCsvBtn) {
        elements.exportCsvBtn.addEventListener('click', exportToCSV);
    }
    
    // Theme toggle switch change
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('change', toggleTheme);
    }
    
    // Feed select dropdown change
    if (elements.feedSelect) {
        elements.feedSelect.addEventListener('change', () => {
            state.activeFeed = elements.feedSelect.value;
            
            // Clear current search & filter UI
            elements.searchInput.value = '';
            elements.filterSelect.value = 'all';
            
            // Dynamically update header titles, subtitles, placeholders, and icons
            if (state.activeFeed === 'vertex-ai') {
                if (elements.headerTitle) elements.headerTitle.textContent = 'Vertex AI Release Hub';
                const subtitle = document.querySelector('.app-header .subtitle');
                if (subtitle) subtitle.textContent = 'Track Machine Learning & Computer Vision updates and draft posts instantly.';
                if (elements.searchInput) elements.searchInput.placeholder = 'Search Vertex AI (e.g. AutoML, pipeline, vision, custom)...';
                if (elements.headerLogoIcon) {
                    const iconEl = elements.headerLogoIcon.querySelector('i');
                    if (iconEl) iconEl.className = 'fa-solid fa-brain';
                    elements.headerLogoIcon.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)';
                    elements.headerLogoIcon.style.boxShadow = '0 8px 16px -4px rgba(139, 92, 246, 0.4)';
                }
            } else { // bigquery
                if (elements.headerTitle) elements.headerTitle.textContent = 'BigQuery Release Hub';
                const subtitle = document.querySelector('.app-header .subtitle');
                if (subtitle) subtitle.textContent = 'Track Data Warehouse & Analytics updates and draft posts instantly.';
                if (elements.searchInput) elements.searchInput.placeholder = 'Search BigQuery (e.g. SQL, partitioning, metadata, load)...';
                if (elements.headerLogoIcon) {
                    const iconEl = elements.headerLogoIcon.querySelector('i');
                    if (iconEl) iconEl.className = 'fa-solid fa-database';
                    elements.headerLogoIcon.style.background = 'linear-gradient(135deg, var(--color-accent) 0%, #ff5e3a 100%)';
                    elements.headerLogoIcon.style.boxShadow = '0 8px 16px -4px rgba(255, 159, 28, 0.4)';
                }
            }
            
            // Reload feed
            fetchReleaseNotes(false);
        });
    }
    
    // Search input typing
    elements.searchInput.addEventListener('input', applyFilters);
    
    // Clear search button
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        applyFilters();
        elements.searchInput.focus();
    });
    
    // Filter select change
    elements.filterSelect.addEventListener('change', applyFilters);
    
    // Modal close events
    elements.modalCloseBtn.addEventListener('click', closeComposer);
    
    // Tab Button clicks
    elements.tabXBtn.addEventListener('click', () => switchPlatform('x'));
    elements.tabLinkedinBtn.addEventListener('click', () => switchPlatform('linkedin'));
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.composerModal.classList.contains('active')) {
            closeComposer();
        }
    });
    
    // Close modal on clicking outside the card
    elements.composerModal.addEventListener('click', (e) => {
        if (e.target === elements.composerModal) {
            closeComposer();
        }
    });
    
    // Composer text area typing
    elements.composerTextarea.addEventListener('input', updatePostProgress);
    
    // Copy Text button in composer
    elements.composerCopy.addEventListener('click', () => {
        copyTextToClipboard(elements.composerTextarea.value);
    });
    
    // Submit Post button in composer
    elements.composerSend.addEventListener('click', sendPost);
}

// Initialize circular progress ring path dimensions
function initProgressRing() {
    elements.charProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
    elements.charProgress.style.strokeDashoffset = RING_CIRCUMFERENCE;
}

// Page Load Entrypoint
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initProgressRing();
    initEvents();
    
    // Set initial placeholder & logo style to match Vertex AI default
    if (elements.searchInput) {
        elements.searchInput.placeholder = 'Search Vertex AI (e.g. AutoML, pipeline, vision, custom)...';
    }
    if (elements.headerLogoIcon) {
        elements.headerLogoIcon.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)';
        elements.headerLogoIcon.style.boxShadow = '0 8px 16px -4px rgba(139, 92, 246, 0.4)';
    }
    
    fetchReleaseNotes(false); // Initial cache load
    initResearchLab(); // Initialize AI Research Lab features
});

// ==========================================================================
// AI RESEARCH LAB CONTROLLER
// ==========================================================================

function initResearchLab() {
    // 1. Navigation View Switcher (GCP Release Notes vs AI Research Lab)
    const navReleaseBtn = document.getElementById('nav-release-notes-btn');
    const navLabBtn = document.getElementById('nav-research-lab-btn');
    const releaseView = document.getElementById('release-notes-view');
    const labView = document.getElementById('research-lab-view');
    
    const feedSelectGroup = document.getElementById('feed-select')?.closest('.filter-group');
    const filterSelectGroup = document.getElementById('filter-select')?.closest('.filter-group');
    const searchBox = document.querySelector('.search-box');
    const statsCounter = document.getElementById('stats-counter');
    
    if (navReleaseBtn && navLabBtn) {
        navReleaseBtn.addEventListener('click', () => {
            navReleaseBtn.classList.add('active');
            navLabBtn.classList.remove('active');
            releaseView.classList.add('active');
            labView.classList.remove('active');
            
            // Show release note specific header controls
            if (elements.exportCsvBtn) elements.exportCsvBtn.style.display = 'inline-flex';
            if (elements.refreshBtn) elements.refreshBtn.style.display = 'inline-flex';
            if (feedSelectGroup) feedSelectGroup.style.display = 'block';
            if (filterSelectGroup) filterSelectGroup.style.display = 'block';
            if (searchBox) searchBox.style.display = 'flex';
            if (statsCounter) statsCounter.style.display = 'block';
        });
        
        navLabBtn.addEventListener('click', () => {
            navLabBtn.classList.add('active');
            navReleaseBtn.classList.remove('active');
            labView.classList.add('active');
            releaseView.classList.remove('active');
            
            // Hide release note specific header controls
            if (elements.exportCsvBtn) elements.exportCsvBtn.style.display = 'none';
            if (elements.refreshBtn) elements.refreshBtn.style.display = 'none';
            if (feedSelectGroup) feedSelectGroup.style.display = 'none';
            if (filterSelectGroup) filterSelectGroup.style.display = 'none';
            if (searchBox) searchBox.style.display = 'none';
            if (statsCounter) statsCounter.style.display = 'none';
        });
    }
    
    // 2. Sub-tab switcher inside Research Lab
    const labTabs = document.querySelectorAll('.lab-tab-btn');
    labTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            labTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetSubtab = tab.dataset.subtab;
            
            document.querySelectorAll('.lab-form-section').forEach(form => {
                form.style.display = 'none';
                form.classList.remove('active');
            });
            
            const activeForm = document.getElementById(`form-${targetSubtab}`);
            if (activeForm) {
                activeForm.style.display = 'block';
                activeForm.classList.add('active');
            }
        });
    });
    
    // 3. API Key Auth Management
    const keyInput = document.getElementById('gemini-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const clearKeyBtn = document.getElementById('clear-key-btn');
    
    if (keyInput && saveKeyBtn && clearKeyBtn) {
        // Load saved key from localStorage
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            keyInput.value = savedKey;
            keyInput.type = 'password';
            saveKeyBtn.style.display = 'none';
            clearKeyBtn.style.display = 'inline-flex';
        }
        
        saveKeyBtn.addEventListener('click', () => {
            const keyVal = keyInput.value.trim();
            if (keyVal) {
                localStorage.setItem('gemini_api_key', keyVal);
                keyInput.type = 'password';
                saveKeyBtn.style.display = 'none';
                clearKeyBtn.style.display = 'inline-flex';
                showToast('Authentication Saved', 'Gemini API key stored locally.', 'success');
            } else {
                showToast('Validation Error', 'Please enter a valid API key.', 'error');
            }
        });
        
        clearKeyBtn.addEventListener('click', () => {
            localStorage.removeItem('gemini_api_key');
            keyInput.value = '';
            keyInput.type = 'text';
            saveKeyBtn.style.display = 'inline-flex';
            clearKeyBtn.style.display = 'none';
            showToast('Authentication Cleared', 'Gemini API key removed.', 'info');
        });
    }
    
    // 4. Setup file drag & drop zones
    setupDragDropZone('doc-drag-area', 'doc-file-input', 'doc-file-name-display', 'doc-remove-file');
    setupDragDropZone('compare-drag-area-a', 'compare-file-a', 'compare-display-a', 'compare-remove-a');
    setupDragDropZone('compare-drag-area-b', 'compare-file-b', 'compare-display-b', 'compare-remove-b');
    
    // 5. Input keyup validations
    const inputsToValidate = [
        'doc-question-input',
        'web-url-input',
        'web-question-input',
        'compare-question-input'
    ];
    inputsToValidate.forEach(id => {
        document.getElementById(id)?.addEventListener('input', validateForms);
    });
    
    // 6. Submit Button Event Handlers
    document.getElementById('doc-submit-btn')?.addEventListener('click', submitDocQA);
    document.getElementById('web-submit-btn')?.addEventListener('click', submitWebQA);
    document.getElementById('compare-submit-btn')?.addEventListener('click', submitCompare);
    
    // 7. Results Actions Bindings
    document.getElementById('btn-copy-response')?.addEventListener('click', () => {
        if (state.lastSynthesis) {
            copyTextToClipboard(state.lastSynthesis);
        }
    });
    
    document.getElementById('btn-linkedin-share-response')?.addEventListener('click', shareSynthesisToLinkedIn);
    
    // Run initial form validation
    validateForms();
}

/**
 * Common drag-and-drop Setup helper
 */
function setupDragDropZone(zoneId, fileInputId, displayId, removeBtnId) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(fileInputId);
    const display = document.getElementById(displayId);
    const removeBtn = document.getElementById(removeBtnId);
    
    if (!zone || !input) return;
    
    zone.addEventListener('click', () => {
        input.click();
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('dragover');
        }, false);
    });
    
    zone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            input.files = files;
            input.dispatchEvent(new Event('change'));
        }
    }, false);
    
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (file) {
            zone.style.display = 'none';
            display.style.display = 'flex';
            display.querySelector('.file-name').textContent = file.name;
            showToast('File Attached', `Selected file: ${file.name}`, 'success');
        } else {
            zone.style.display = 'flex';
            display.style.display = 'none';
        }
        validateForms();
    });
    
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            input.value = '';
            zone.style.display = 'flex';
            display.style.display = 'none';
            validateForms();
            showToast('File Removed', 'Attachment removed.', 'info');
        });
    }
}

/**
 * Form Submit Button Enable/Disable Validators
 */
function validateForms() {
    // 1. Doc QA validation
    const docFile = document.getElementById('doc-file-input')?.files[0];
    const docQuestion = document.getElementById('doc-question-input')?.value.trim();
    const docSubmit = document.getElementById('doc-submit-btn');
    if (docSubmit) {
        docSubmit.disabled = !docFile || !docQuestion;
    }
    
    // 2. Web QA validation
    const webUrl = document.getElementById('web-url-input')?.value.trim();
    const webQuestion = document.getElementById('web-question-input')?.value.trim();
    const webSubmit = document.getElementById('web-submit-btn');
    if (webSubmit) {
        const isValidUrl = webUrl && (webUrl.startsWith('http://') || webUrl.startsWith('https://'));
        webSubmit.disabled = !isValidUrl || !webQuestion;
    }
    
    // 3. Compare validation
    const compareA = document.getElementById('compare-file-a')?.files[0];
    const compareB = document.getElementById('compare-file-b')?.files[0];
    const compareSubmit = document.getElementById('compare-submit-btn');
    if (compareSubmit) {
        compareSubmit.disabled = !compareA || !compareB;
    }
}

/**
 * Terminal UI Helpers
 */
function clearTerminal() {
    const termLog = document.getElementById('lab-terminal-log');
    const resultsPanel = document.getElementById('lab-results-panel');
    const resultsCard = document.getElementById('lab-results-card');
    
    if (termLog) termLog.innerHTML = '';
    if (resultsPanel) resultsPanel.style.display = 'block';
    if (resultsCard) resultsCard.style.display = 'none';
}

function appendTerminalLine(text, type = 'info') {
    const termLog = document.getElementById('lab-terminal-log');
    if (!termLog) return;
    
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    
    let icon = 'fa-terminal';
    if (type === 'success') icon = 'fa-circle-check';
    else if (type === 'error') icon = 'fa-circle-exclamation';
    
    const time = new Date().toLocaleTimeString([], { hour12: false });
    
    line.innerHTML = `
        <span style="color: #64748b; margin-right: 0.5rem;">[${time}]</span>
        <i class="fa-solid ${icon}"></i>
        <span>$ ${text}</span>
    `;
    termLog.appendChild(line);
    termLog.scrollTop = termLog.scrollHeight;
}

function setFormLoading(isLoading) {
    const buttons = [
        document.getElementById('doc-submit-btn'),
        document.getElementById('web-submit-btn'),
        document.getElementById('compare-submit-btn')
    ];
    
    buttons.forEach(btn => {
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Request...`;
        } else {
            btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
            validateForms();
        }
    });
}

/**
 * Render synthesis result and passages onto page card
 */
function renderAnalysisResults(synthesis, passages, mode) {
    const synthesisTextDiv = document.getElementById('ai-synthesis-text');
    const passagesListDiv = document.getElementById('lab-passages-list');
    const passagesContainer = document.getElementById('passages-container');
    const resultsCard = document.getElementById('lab-results-card');
    
    if (synthesisTextDiv) {
        synthesisTextDiv.innerHTML = parseMarkdown(synthesis);
    }
    
    if (passagesListDiv && passagesContainer) {
        passagesListDiv.innerHTML = '';
        if (passages && passages.length > 0) {
            passagesContainer.style.display = 'block';
            passages.forEach((p, idx) => {
                const chunk = document.createElement('div');
                chunk.className = 'passage-chunk';
                chunk.innerHTML = `<p>${p}</p>`;
                passagesListDiv.appendChild(chunk);
            });
        } else {
            passagesContainer.style.display = 'none';
        }
    }
    
    if (resultsCard) {
        resultsCard.style.display = 'block';
    }
    
    state.lastSynthesis = synthesis;
    
    // Smooth scroll down to terminal/results
    const resultsPanel = document.getElementById('lab-results-panel');
    if (resultsPanel) {
        resultsPanel.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Form Submission Requests
 */
async function submitDocQA() {
    const fileInput = document.getElementById('doc-file-input');
    const questionInput = document.getElementById('doc-question-input');
    const file = fileInput?.files[0];
    const question = questionInput?.value.trim();
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    
    if (!file || !question) return;
    
    clearTerminal();
    appendTerminalLine(`Initializing Document Q&A pipeline...`, 'info');
    appendTerminalLine(`File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
    appendTerminalLine(`Query: "${question}"`, 'info');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('question', question);
    formData.append('apiKey', apiKey);
    
    setFormLoading(true);
    
    try {
        appendTerminalLine(`Uploading document to secure local server context...`, 'info');
        appendTerminalLine(`Parsing pages and extracting text contents...`, 'info');
        
        if (apiKey) {
            appendTerminalLine(`Configured Gemini LLM API Key detected. Synthesizing full response...`, 'info');
        } else {
            appendTerminalLine(`No Gemini API Key. Using local keyword semantic relevance extraction...`, 'info');
        }
        
        const response = await fetch('/api/document-qa', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `HTTP error ${response.status}`);
        }
        
        const result = await response.json();
        appendTerminalLine(`Received analysis response successfully. Rendering output...`, 'success');
        
        renderAnalysisResults(result.synthesis, result.passages, result.mode);
    } catch (err) {
        console.error(err);
        appendTerminalLine(`Failed document analysis: ${err.message}`, 'error');
        showToast('Analysis Failed', err.message, 'error');
    } finally {
        setFormLoading(false);
    }
}

async function submitWebQA() {
    const urlInput = document.getElementById('web-url-input');
    const questionInput = document.getElementById('web-question-input');
    const url = urlInput?.value.trim();
    const question = questionInput?.value.trim();
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    
    if (!url || !question) return;
    
    clearTerminal();
    appendTerminalLine(`Initializing Webpage Analysis pipeline...`, 'info');
    appendTerminalLine(`URL: ${url}`, 'info');
    appendTerminalLine(`Query: "${question}"`, 'info');
    
    setFormLoading(true);
    
    try {
        appendTerminalLine(`Connecting to target server and scraping webpage content...`, 'info');
        
        if (apiKey) {
            appendTerminalLine(`Configured Gemini LLM API Key detected. Synthesizing full web report...`, 'info');
        } else {
            appendTerminalLine(`No Gemini API key. Running local text extraction and paragraph ranking...`, 'info');
        }
        
        const response = await fetch('/api/web-qa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url, question, apiKey })
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `HTTP error ${response.status}`);
        }
        
        const result = await response.json();
        appendTerminalLine(`Scraped and analyzed webpage successfully. Formatting output...`, 'success');
        
        renderAnalysisResults(result.synthesis, result.passages, result.mode);
    } catch (err) {
        console.error(err);
        appendTerminalLine(`Failed webpage analysis: ${err.message}`, 'error');
        showToast('Webpage Analysis Failed', err.message, 'error');
    } finally {
        setFormLoading(false);
    }
}

async function submitCompare() {
    const fileInputA = document.getElementById('compare-file-a');
    const fileInputB = document.getElementById('compare-file-b');
    const questionInput = document.getElementById('compare-question-input');
    const fileA = fileInputA?.files[0];
    const fileB = fileInputB?.files[0];
    const question = questionInput?.value.trim();
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    
    if (!fileA || !fileB) return;
    
    clearTerminal();
    appendTerminalLine(`Initializing Multi-Source Comparison pipeline...`, 'info');
    appendTerminalLine(`Document A: ${fileA.name}`, 'info');
    appendTerminalLine(`Document B: ${fileB.name}`, 'info');
    appendTerminalLine(`Comparison Query: "${question || 'Compare and contrast views'}"`, 'info');
    
    const formData = new FormData();
    formData.append('file1', fileA);
    formData.append('file2', fileB);
    formData.append('question', question);
    formData.append('apiKey', apiKey);
    
    setFormLoading(true);
    
    try {
        appendTerminalLine(`Uploading both source files to server context...`, 'info');
        appendTerminalLine(`Parsing document structures and extracting key statements...`, 'info');
        
        if (apiKey) {
            appendTerminalLine(`Configured Gemini LLM API Key detected. Synthesizing full contrast matrix...`, 'info');
        } else {
            appendTerminalLine(`No Gemini API Key. Extracting relevant paragraphs from each document...`, 'info');
        }
        
        const response = await fetch('/api/compare-sources', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `HTTP error ${response.status}`);
        }
        
        const result = await response.json();
        appendTerminalLine(`Source comparison complete. Building comparative layout...`, 'success');
        
        renderAnalysisResults(result.synthesis, result.passages, result.mode);
    } catch (err) {
        console.error(err);
        appendTerminalLine(`Failed comparative analysis: ${err.message}`, 'error');
        showToast('Comparison Failed', err.message, 'error');
    } finally {
        setFormLoading(false);
    }
}

/**
 * Synthesis Share on LinkedIn Redirect Composer Modal Integration
 */
function shareSynthesisToLinkedIn() {
    if (!state.lastSynthesis) return;
    
    const mockItem = {
        id: 'synthesis',
        type: 'AI Synthesis Report',
        date: new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }),
        text: state.lastSynthesis,
        link: 'https://cloud.google.com/vertex-ai'
    };
    
    openComposer(mockItem);
    switchPlatform('linkedin');
}

/**
 * A regex-based Markdown syntax to HTML converter
 */
function parseMarkdown(text) {
    if (!text) return '';
    let html = text;
    
    // Escape standard tags for safety
    html = html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Headers
    html = html.replace(/^\s*###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^\s*####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^\s*##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^\s*#\s+(.+)$/gm, '<h1>$1</h1>');
    
    // List elements
    html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    
    // Groups elements
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    
    // Wrap paragraph paragraphs
    const blocks = html.split(/\n\s*\n/);
    const parsedBlocks = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<ul') || trimmed.startsWith('<li')) {
            return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, ' ')}</p>`;
    });
    
    return parsedBlocks.join('\n');
}
