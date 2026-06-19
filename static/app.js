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
        if (state.selectedItem && state.selectedItem.id === item.id) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <div class="card-header">
                <div class="badge-and-date">
                    <span class="type-badge">${item.type}</span>
                    <time class="date-text" datetime="${item.timestamp}">${item.date}</time>
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
        link.setAttribute('download', 'bigquery_release_notes.csv');
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
            
            // Dynamically update header titles, subtitles, and icons
            if (state.activeFeed === 'vertex-ai') {
                if (elements.headerTitle) elements.headerTitle.textContent = 'Vertex AI Release Hub';
                const subtitle = document.querySelector('.app-header .subtitle');
                if (subtitle) subtitle.textContent = 'Track Machine Learning & Computer Vision updates and draft posts instantly.';
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
    
    // Set initial logo style to match Vertex AI default
    if (elements.headerLogoIcon) {
        elements.headerLogoIcon.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)';
        elements.headerLogoIcon.style.boxShadow = '0 8px 16px -4px rgba(139, 92, 246, 0.4)';
    }
    
    fetchReleaseNotes(false); // Initial cache load
});
