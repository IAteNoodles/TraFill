// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// State Management
let currentUser = {
    name: '',
    club: ''
};

let formDraft = null;
let statsCache = null;
let statsCacheTime = null;
const CACHE_DURATION = 60000; // 1 minute cache

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupKeyboardShortcuts();
    startAutoSave();
});

function initializeApp() {
    // Check if user is already logged in (localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showAppSection();
    }

    // Event Listeners
    setupEventListeners();
    
    // Set default date to today
    const entryDateField = document.getElementById('entry-date');
    if (entryDateField) {
        entryDateField.valueAsDate = new Date();
    }
    
    // Restore form draft if exists
    restoreFormDraft();
    
    // Check for page visibility changes (refresh data when user returns)
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

function setupEventListeners() {
    // User form
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
    
    // Entry form
    const entryForm = document.getElementById('entry-form');
    entryForm.addEventListener('submit', handleEntrySubmit);
    entryForm.addEventListener('reset', handleFormReset);
    document.getElementById('status').addEventListener('change', handleStatusChange);
    
    // Auto-complete setup
    document.getElementById('company').addEventListener('input', debounce(handleCompanyInput, 300));
    document.getElementById('contact-person').addEventListener('input', debounce(handleContactPersonInput, 300));
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab, e.currentTarget));
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Entry Filters
    document.getElementById('apply-filters').addEventListener('click', loadEntries);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
    // Status modal controls
    const statusModal = document.getElementById('status-modal');
    if (statusModal) {
        document.getElementById('status-modal-close').addEventListener('click', closeStatusModal);
        document.getElementById('status-modal-cancel').addEventListener('click', closeStatusModal);
        document.getElementById('status-update-select').addEventListener('change', handleStatusModalChange);
        document.getElementById('status-update-form').addEventListener('submit', handleStatusUpdateSubmit);
        statusModal.addEventListener('click', (e) => {
            if (e.target === statusModal) {
                closeStatusModal();
            }
        });
    }
    
    // Stats Filters
    document.getElementById('apply-stats-filters').addEventListener('click', () => {
        statsCache = null; // Clear cache when filters change
        loadStats();
    });
    document.getElementById('clear-stats-filters').addEventListener('click', clearStatsFilters);
    
    // Export buttons
    const exportEntriesBtn = document.getElementById('export-entries-btn');
    const exportStatsBtn = document.getElementById('export-stats-btn');
    if (exportEntriesBtn) exportEntriesBtn.addEventListener('click', exportEntries);
    if (exportStatsBtn) exportStatsBtn.addEventListener('click', exportStats);
}

// User Management
function handleUserSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('member-name').value.trim();
    const club = document.getElementById('club').value;
    
    if (!name || !club) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    currentUser = { name, club };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showAppSection();
}

function showAppSection() {
    document.getElementById('user-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    document.getElementById('logged-user').textContent = currentUser.name;
    document.getElementById('logged-club').textContent = currentUser.club;
    
    // Load initial data
    loadEntries();
    loadStats();
    loadMiniStats();
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    currentUser = { name: '', club: '' };
    document.getElementById('user-section').style.display = 'block';
    document.getElementById('app-section').style.display = 'none';
    document.getElementById('user-form').reset();
}

// Tab Management
function switchTab(tabName, triggerBtn = null) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (triggerBtn) {
        triggerBtn.classList.add('active');
    } else {
        const fallbackBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (fallbackBtn) fallbackBtn.classList.add('active');
    }

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) targetTab.classList.add('active');

    if (tabName === 'list') {
        loadEntries();
    } else if (tabName === 'stats') {
        loadStats();
    }
}

// Entry Form Management
async function loadMiniStats() {
    try {
        // Get user's stats
        const params = new URLSearchParams();
        params.append('member_name', currentUser.name);
        
        const response = await fetch(`${API_BASE_URL}/entries?${params}`);
        const result = await response.json();
        
        if (result.success) {
            const userEntries = result.data;
            const totalEntries = userEntries.length;
            
            // Calculate this week's entries
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const thisWeek = userEntries.filter(entry => 
                new Date(entry.entry_date) >= oneWeekAgo
            ).length;
            
            // Get ranking (need all members stats)
            const statsResponse = await fetch(`${API_BASE_URL}/stats?club=${encodeURIComponent(currentUser.club)}`);
            const statsResult = await statsResponse.json();
            
            let rank = '-';
            if (statsResult.success && statsResult.data.member_contributions) {
                const members = statsResult.data.member_contributions;
                const userIndex = members.findIndex(m => m.member_name === currentUser.name);
                if (userIndex !== -1) {
                    rank = `#${userIndex + 1} of ${members.length}`;
                }
            }
            
            // Update mini stats
            document.getElementById('mini-stat-total').textContent = totalEntries;
            document.getElementById('mini-stat-week').textContent = thisWeek;
            document.getElementById('mini-stat-rank').textContent = rank;
        }
    } catch (error) {
        console.error('Error loading mini stats:', error);
        // Silently fail - mini stats are optional
    }
}

function handleStatusChange(e) {
    const statusNotesGroup = document.getElementById('status-notes-group');
    const statusNotes = document.getElementById('status-notes');
    
    if (e.target.value === 'Others') {
        statusNotesGroup.style.display = 'block';
        statusNotes.required = true;
    } else {
        statusNotesGroup.style.display = 'none';
        statusNotes.required = false;
        statusNotes.value = '';
    }
}

async function handleEntrySubmit(e) {
    e.preventDefault();
    
    const editingEntryId = localStorage.getItem('editingEntryId');

    // Validate at least one contact method
    const email = document.getElementById('email').value.trim();
    const linkedin = document.getElementById('linkedin').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const company = document.getElementById('company').value.trim();
    const opportunityType = document.getElementById('opportunity-type').value.trim();
    
    if (!email && !linkedin && !phone) {
        showToast('Please provide at least one contact method (Email, LinkedIn, or Phone)', 'error');
        return;
    }
    
    // Check if opportunity type contains financial keywords
    const financialTerms = [
        'finance', 'financial', 'banking', 'bank', 'fintech', 'insurance',
        'investment', 'trading', 'loan', 'credit', 'wealth', 'stock',
        'forex', 'crypto', 'payment', 'wallet'
    ];
    
    if (opportunityType) {
        const oppTypeLower = opportunityType.toLowerCase();
        const matchedTerm = financialTerms.find(term => oppTypeLower.includes(term));
        if (matchedTerm) {
            showToast(
                `❌ FINANCIAL OPPORTUNITY BLOCKED!\n\n` +
                `Opportunity type "${opportunityType}" contains the financial term "${matchedTerm}".\n\n` +
                `We DO NOT accept entries related to financial services.\n\n` +
                `Please change the opportunity type or company.`,
                'error',
                8000
            );
            document.getElementById('opportunity-type').focus();
            return;
        }
    }
    
    // Check for duplicates and financial companies
    try {
    const checkParams = new URLSearchParams();
        if (email) checkParams.append('email', email);
        if (phone) checkParams.append('phone', phone);
        if (linkedin) checkParams.append('linkedin', linkedin);
        if (company) checkParams.append('company', company);
    if (editingEntryId) checkParams.append('exclude_id', editingEntryId);
        
        const checkResponse = await fetch(`${API_BASE_URL}/check-duplicate?${checkParams}`);
        const checkResult = await checkResponse.json();
        
        if (!checkResult.success) {
            showToast('Error checking for duplicates. Please try again.', 'error');
            return;
        }
        
    const { duplicate_contact, company_exists, is_financial, blocked_keywords } = checkResult.data;
        
        // BLOCK if it's a financial company - NO OVERRIDE ALLOWED
        if (is_financial) {
            showToast(
                `❌ FINANCIAL COMPANY BLOCKED!\n\n` +
                `"${company}" appears to be a financial/banking/fintech/insurance company.\n` +
                (blocked_keywords && blocked_keywords.length ? `Matched terms: ${blocked_keywords.join(', ')}\n\n` : '\n') +
                `We DO NOT accept entries from financial services companies.\n\n` +
                `Please change the company name to a non-financial company.`,
                'error',
                8000
            );
            document.getElementById('company').focus();
            return;
        }
        
        // Check for duplicate contact information
        if (duplicate_contact.exists) {
            const details = duplicate_contact.details;
            const matchedBy = [];
            if (email && details.company) matchedBy.push('email');
            if (phone && details.company) matchedBy.push('phone');
            if (linkedin && details.company) matchedBy.push('LinkedIn');
            
            showToast(
                `❌ DUPLICATE ENTRY BLOCKED!\n\n` +
                `This contact information (${matchedBy.join(', ')}) already exists in the database:\n\n` +
                `Company: ${details.company}\n` +
                `Added by: ${details.member_name}\n` +
                `Status: ${details.status}\n` +
                `Date: ${details.entry_date}\n\n` +
                `Please do not create duplicate entries!`,
                'error',
                8000
            );
            return;
        }
        
        // Warn if company already exists
        if (company_exists.exists) {
            const details = company_exists.details;
            const proceed = confirm(
                `⚠️ COMPANY ALREADY IN DATABASE\n\n` +
                `"${company}" has already been contacted ${company_exists.count} time(s).\n\n` +
                `Previous entry:\n` +
                `• Added by: ${details.member_name}\n` +
                `• Status: ${details.status}\n` +
                `• Date: ${details.entry_date}\n` +
                `• Contact: ${details.contact_person || 'N/A'}\n\n` +
                `Are you contacting a DIFFERENT person at this company?\n\n` +
                `Click "OK" only if this is a different contact person.\n` +
                `Click "Cancel" to avoid duplicate work.`
            );
            
            if (!proceed) {
                return;
            }
        }
        
    } catch (error) {
        console.error('Error checking duplicates:', error);
        showToast('Error validating entry. Please try again.', 'error');
        return;
    }
    
    // Prepare entry data
    const entryData = {
        member_name: currentUser.name,
        club: currentUser.club,
        company: company,
        opportunity_type: document.getElementById('opportunity-type').value.trim() || null,
        contact_person: document.getElementById('contact-person').value.trim() || null,
        email: email || null,
        linkedin: linkedin || null,
        phone: phone || null,
        status: document.getElementById('status').value,
        status_notes: document.getElementById('status-notes').value.trim() || null,
        entry_date: document.getElementById('entry-date').value
    };
    
    try {
    let response;

    if (editingEntryId) {
            response = await fetch(`${API_BASE_URL}/entries/${editingEntryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(entryData)
            });
        } else {
            response = await fetch(`${API_BASE_URL}/entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(entryData)
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(editingEntryId ? '✓ Entry updated successfully!' : '✓ Entry submitted successfully!', 'success');
            document.getElementById('entry-form').reset();
            document.getElementById('entry-date').valueAsDate = new Date();
            document.getElementById('status').value = 'Yet to contact';
            handleStatusChange({ target: { value: 'Yet to contact' } });
            
            // Clear form draft
            localStorage.removeItem('formDraft');
            localStorage.removeItem('editingEntryId');
            
            // Reload entries if on list tab
            const listTab = document.getElementById('list-tab');
            if (listTab.classList.contains('active')) {
                loadEntries();
            }
            
            // Invalidate stats cache
            statsCache = null;
            statsCacheTime = null;
            
            // Load mini stats on entry tab
            loadMiniStats();
        } else {
            showToast(result.error || 'Failed to submit entry', 'error');
        }
    } catch (error) {
        console.error('Error submitting entry:', error);
        showToast('Failed to connect to server', 'error');
    }
}

// Load Entries
async function loadEntries() {
    const params = new URLSearchParams();
    
    const filterName = document.getElementById('filter-name').value.trim();
    const filterCompany = document.getElementById('filter-company').value.trim();
    const filterClub = document.getElementById('filter-club').value;
    const filterType = document.getElementById('filter-type').value.trim();
    const filterStatus = document.getElementById('filter-status').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    
    if (filterName) params.append('member_name', filterName);
    if (filterCompany) params.append('company', filterCompany);
    if (filterClub) params.append('club', filterClub);
    if (filterType) params.append('opportunity_type', filterType);
    if (filterStatus) params.append('status', filterStatus);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    try {
        const response = await fetch(`${API_BASE_URL}/entries?${params}`);
        const result = await response.json();
        
        if (result.success) {
            displayEntries(result.data);
        } else {
            showToast('Failed to load entries', 'error');
        }
    } catch (error) {
        console.error('Error loading entries:', error);
        showToast('Failed to connect to server', 'error');
    }
}

function displayEntries(entries) {
    const tbody = document.getElementById('entries-tbody');
    
    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No entries found</td></tr>';
        return;
    }
    
    tbody.innerHTML = entries.map(entry => `
        <tr>
            <td>${formatDate(entry.entry_date)}</td>
            <td>${entry.member_name}</td>
            <td>${entry.club}</td>
            <td>${entry.company}</td>
            <td>${entry.opportunity_type || '-'}</td>
            <td>${entry.contact_person || '-'}</td>
            <td>${formatContactInfo(entry)}</td>
            <td><span class="status-badge status-${entry.status.toLowerCase().replace(/ /g, '-')}">${entry.status}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${entry.id}">Edit</button>
                    <button class="btn btn-primary btn-sm" data-action="status" data-id="${entry.id}" data-status="${entry.status}" data-notes="${entry.status_notes || ''}">Update Status</button>
                </div>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('#entries-tbody button').forEach(btn => {
        btn.addEventListener('click', handleEntryAction);
    });
}

function formatContactInfo(entry) {
    const contacts = [];
    if (entry.email) contacts.push(`📧 ${entry.email}`);
    if (entry.linkedin) contacts.push(`🔗 LinkedIn`);
    if (entry.phone) contacts.push(`📞 ${entry.phone}`);
    return contacts.join('<br>') || '-';
}

function handleEntryAction(e) {
    const action = e.target.dataset.action;
    const entryId = e.target.dataset.id;
    if (!action || !entryId) return;
    if (action === 'status') {
        openStatusModal(entryId, e.target.dataset.status, e.target.dataset.notes);
    } else if (action === 'edit') {
        loadEntryForEdit(entryId);
    }
}

async function loadEntryForEdit(entryId) {
    try {
        const response = await fetch(`${API_BASE_URL}/entries/${entryId}`);
        const result = await response.json();
        if (!result.success) {
            showToast('Failed to load entry details', 'error');
            return;
        }

        const entry = result.data;
        document.getElementById('company').value = entry.company || '';
        document.getElementById('opportunity-type').value = entry.opportunity_type || '';
        document.getElementById('contact-person').value = entry.contact_person || '';
        document.getElementById('email').value = entry.email || '';
        document.getElementById('linkedin').value = entry.linkedin || '';
        document.getElementById('phone').value = entry.phone || '';
        document.getElementById('status').value = entry.status || 'Yet to contact';
        document.getElementById('status-notes').value = entry.status_notes || '';
        document.getElementById('entry-date').value = entry.entry_date || new Date().toISOString().split('T')[0];
        handleStatusChange({ target: { value: entry.status || 'Yet to contact' } });

        localStorage.setItem('editingEntryId', entryId);
        showToast('Loaded entry for editing. Submit to save changes.', 'info');
        switchTab('entry');
    } catch (error) {
        console.error('Error loading entry:', error);
        showToast('Failed to load entry details', 'error');
    }
}

function openStatusModal(entryId, status, notes) {
    document.getElementById('status-entry-id').value = entryId;
    document.getElementById('status-update-select').value = status;
    document.getElementById('status-update-notes').value = notes || '';
    handleStatusModalChange({ target: { value: status } });
    document.getElementById('status-modal').style.display = 'flex';
}

function closeStatusModal() {
    document.getElementById('status-modal').style.display = 'none';
    document.getElementById('status-update-form').reset();
    handleStatusModalChange({ target: { value: 'Yet to contact' } });
}

function handleStatusModalChange(e) {
    const notesGroup = document.getElementById('status-update-notes-group');
    const notesField = document.getElementById('status-update-notes');
    if (e.target.value === 'Others') {
        notesGroup.style.display = 'block';
        notesField.required = true;
    } else {
        notesGroup.style.display = 'none';
        notesField.required = false;
        notesField.value = '';
    }
}

async function handleStatusUpdateSubmit(e) {
    e.preventDefault();
    const entryId = document.getElementById('status-entry-id').value;
    const status = document.getElementById('status-update-select').value;
    const notes = document.getElementById('status-update-notes').value.trim();

    const params = new URLSearchParams();
    params.append('status', status);
    if (notes) params.append('status_notes', notes);

    try {
        const response = await fetch(`${API_BASE_URL}/entries/${entryId}/status?${params}`, {
            method: 'PATCH'
        });
        const result = await response.json();
        if (result.success) {
            showToast('Status updated successfully', 'success');
            closeStatusModal();
            loadEntries();
            statsCache = null;
            loadStats();
        } else {
            showToast(result.error || result.detail || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status', 'error');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function clearFilters() {
    document.getElementById('filter-name').value = '';
    document.getElementById('filter-company').value = '';
    document.getElementById('filter-club').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    loadEntries();
}

// Load Statistics
async function loadStats() {
    const params = new URLSearchParams();
    
    const filterClub = document.getElementById('stats-filter-club').value;
    const filterMember = document.getElementById('stats-filter-member').value.trim();
    const startDate = document.getElementById('stats-filter-start').value;
    const endDate = document.getElementById('stats-filter-end').value;
    
    if (filterClub) params.append('club', filterClub);
    if (filterMember) params.append('member_name', filterMember);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    try {
        const response = await fetch(`${API_BASE_URL}/stats?${params}`);
        const result = await response.json();
        
        if (result.success) {
            displayStats(result.data);
        } else {
            showToast('Failed to load statistics', 'error');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Failed to connect to server', 'error');
    }
}

function clearStatsFilters() {
    document.getElementById('stats-filter-club').value = '';
    document.getElementById('stats-filter-member').value = '';
    document.getElementById('stats-filter-start').value = '';
    document.getElementById('stats-filter-end').value = '';
    loadStats();
}

function displayStats(stats) {
    // Display summary stats
    document.getElementById('total-entries').textContent = stats.summary.total_entries;
    document.getElementById('recent-entries').textContent = stats.summary.recent_entries_7days;
    document.getElementById('month-entries').textContent = stats.summary.recent_entries_30days;
    document.getElementById('avg-per-member').textContent = stats.summary.average_per_member;
    
    // Display status distribution
    displayChart('status-chart', stats.status_distribution);
    
    // Display club distribution
    displayChart('club-chart', stats.club_distribution);
    
    // Display top companies
    displayChart('company-chart', stats.top_companies);
    
    // Display contact methods
    displayContactMethods(stats.contact_methods);
    
    // Display opportunity types
    displayChart('type-chart', stats.opportunity_types);
    
    // Display daily timeline
    displayTimeline(stats.daily_timeline);
    
    // Display club performance
    displayClubPerformance(stats.club_performance);
    
    // Display member contributions
    displayMemberContributions(stats.member_contributions);
}

function displayContactMethods(methods) {
    const container = document.getElementById('contact-chart');
    
    const data = [
        { _id: 'Email', count: methods.email },
        { _id: 'LinkedIn', count: methods.linkedin },
        { _id: 'Phone', count: methods.phone }
    ];
    
    displayChart('contact-chart', data);
}

function displayTimeline(timeline) {
    const container = document.getElementById('timeline-chart');
    
    if (!timeline || timeline.length === 0) {
        container.innerHTML = '<p class="no-data">No timeline data available</p>';
        return;
    }
    
    const maxCount = Math.max(...timeline.map(item => item.count));
    
    container.innerHTML = `
        <div class="timeline-chart">
            ${timeline.map(item => {
                const height = (item.count / maxCount) * 100;
                const date = new Date(item._id);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return `
                    <div class="timeline-bar" style="height: ${height}%">
                        <div class="tooltip">${dateStr}: ${item.count}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function displayClubPerformance(clubs) {
    const container = document.getElementById('club-performance-table');
    
    if (!clubs || clubs.length === 0) {
        container.innerHTML = '<p class="no-data">No club performance data available</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="performance-table">
            <thead>
                <tr>
                    <th>Club</th>
                    <th class="metric">Total Entries</th>
                    <th class="metric">Members</th>
                    <th class="metric">Companies</th>
                    <th class="metric">Active</th>
                    <th>Success Rate</th>
                </tr>
            </thead>
            <tbody>
                ${clubs.map(club => `
                    <tr>
                        <td><strong>${club.club || club._id}</strong></td>
                        <td class="metric">${club.total_entries}</td>
                        <td class="metric">${club.unique_members_count}</td>
                        <td class="metric">${club.unique_companies_count}</td>
                        <td class="metric">${club.active_count}</td>
                        <td>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${club.success_rate.toFixed(1)}%"></div>
                            </div>
                            <small>${club.success_rate.toFixed(1)}%</small>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayMemberContributions(members) {
    const container = document.getElementById('member-contributions-table');
    
    if (!members || members.length === 0) {
        container.innerHTML = '<p class="no-data">No member contribution data available</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="performance-table">
            <thead>
                <tr>
                    <th>Member</th>
                    <th>Club</th>
                    <th class="metric">Total</th>
                    <th>Status Breakdown</th>
                </tr>
            </thead>
            <tbody>
                ${members.map(member => {
                    const statusBreakdown = [];
                    if (member.in_progress > 0) statusBreakdown.push(`<span class="status-badge active">In Progress: ${member.in_progress}</span>`);
                    if (member.requested_linkedin > 0) statusBreakdown.push(`<span class="status-badge active">LinkedIn: ${member.requested_linkedin}</span>`);
                    if (member.requested_mail > 0) statusBreakdown.push(`<span class="status-badge active">Mail: ${member.requested_mail}</span>`);
                    if (member.yet_to_contact > 0) statusBreakdown.push(`<span class="status-badge pending">Yet to Contact: ${member.yet_to_contact}</span>`);
                    if (member.rejected > 0) statusBreakdown.push(`<span class="status-badge rejected">Rejected: ${member.rejected}</span>`);
                    
                    return `
                        <tr>
                            <td><strong>${member.member_name}</strong></td>
                            <td>${member.club}</td>
                            <td class="metric"><strong>${member.count}</strong></td>
                            <td>
                                <div class="status-breakdown">
                                    ${statusBreakdown.join('')}
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function displayChart(elementId, data) {
    const container = document.getElementById(elementId);
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="no-data">No data available</p>';
        return;
    }
    
    const maxValue = Math.max(...data.map(item => item.count));
    
    container.innerHTML = data.map(item => {
        const percentage = (item.count / maxValue) * 100;
        return `
            <div class="chart-bar">
                <div class="chart-label">${item._id || 'Unknown'}</div>
                <div class="chart-bar-wrapper">
                    <div class="chart-bar-fill" style="width: ${percentage}%">
                        ${item.count}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Toast Notifications
function showToast(message, type = 'success', duration = 4000) {
    const toast = document.getElementById('toast');
    if (!toast) {
        const newToast = document.createElement('div');
        newToast.id = 'toast';
        newToast.className = 'toast';
        document.body.appendChild(newToast);
        setTimeout(() => showToast(message, type, duration), 10);
        return;
    }
    
    // Support for multi-line messages
    toast.innerHTML = message.replace(/\n/g, '<br>');
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Quality of Life Features

// 1. Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S or Cmd+S: Submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const entryTab = document.getElementById('entry-tab');
            if (entryTab && entryTab.classList.contains('active')) {
                document.getElementById('entry-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }
        
        // Esc: Clear form or close dialogs
        if (e.key === 'Escape') {
            const entryTab = document.getElementById('entry-tab');
            if (entryTab && entryTab.classList.contains('active')) {
                if (confirm('Clear the form?')) {
                    document.getElementById('entry-form').reset();
                    document.getElementById('entry-date').valueAsDate = new Date();
                    handleStatusChange({ target: { value: 'Yet to contact' } });
                }
            }
        }
        
        // Ctrl+1,2,3: Switch tabs
        if ((e.ctrlKey || e.metaKey) && ['1', '2', '3'].includes(e.key)) {
            e.preventDefault();
            const tabs = ['entry', 'list', 'stats'];
            const tabButtons = document.querySelectorAll('.tab-btn');
            tabButtons[parseInt(e.key) - 1].click();
        }
    });
}

// 2. Auto-save form draft
function startAutoSave() {
    setInterval(() => {
        const entryForm = document.getElementById('entry-form');
        if (entryForm && document.getElementById('entry-tab').classList.contains('active')) {
            saveFormDraft();
        }
    }, 15000); // Auto-save every 15 seconds
}

function saveFormDraft() {
    const company = document.getElementById('company').value;
    const opportunity_type = document.getElementById('opportunity-type').value;
    const email = document.getElementById('email').value;
    const linkedin = document.getElementById('linkedin').value;
    const phone = document.getElementById('phone').value;
    
    // Only save if there's actual content
    if (company || email || linkedin || phone) {
        const formData = {
            company,
            opportunity_type,
            contact_person: document.getElementById('contact-person').value,
            email,
            linkedin,
            phone,
            status: document.getElementById('status').value,
            status_notes: document.getElementById('status-notes').value,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('formDraft', JSON.stringify(formData));
    }
}

function restoreFormDraft() {
    const draft = localStorage.getItem('formDraft');
    if (!draft) return;
    
    try {
        const formData = JSON.parse(draft);
        
        // Only restore if draft is less than 24 hours old
        const age = new Date().getTime() - formData.timestamp;
        if (age > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('formDraft');
            return;
        }
        
        // Ask user if they want to restore
        if (confirm('You have an unsaved draft. Would you like to restore it?')) {
            document.getElementById('company').value = formData.company || '';
            document.getElementById('opportunity-type').value = formData.opportunity_type || '';
            document.getElementById('contact-person').value = formData.contact_person || '';
            document.getElementById('email').value = formData.email || '';
            document.getElementById('linkedin').value = formData.linkedin || '';
            document.getElementById('phone').value = formData.phone || '';
            document.getElementById('status').value = formData.status || 'Yet to contact';
            document.getElementById('status-notes').value = formData.status_notes || '';
            handleStatusChange({ target: { value: formData.status } });
        } else {
            localStorage.removeItem('formDraft');
        }
    } catch (error) {
        console.error('Error restoring draft:', error);
        localStorage.removeItem('formDraft');
    }
}

function handleFormReset(e) {
    if (!confirm('Are you sure you want to clear the form? Any unsaved data will be lost.')) {
        e.preventDefault();
        return false;
    }
    localStorage.removeItem('formDraft');
    localStorage.removeItem('editingEntryId');
    document.getElementById('entry-date').valueAsDate = new Date();
}

// 3. Autocomplete functionality
async function handleCompanyInput(e) {
    const query = e.target.value.trim();
    if (query.length < 2) {
        hideAutocomplete('company');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/suggestions/companies?q=${encodeURIComponent(query)}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            showAutocomplete('company', result.data);
        } else {
            hideAutocomplete('company');
        }
    } catch (error) {
        // Silently fail - autocomplete is optional
        hideAutocomplete('company');
    }
}

async function handleContactPersonInput(e) {
    const query = e.target.value.trim();
    if (query.length < 2) {
        hideAutocomplete('contact-person');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/suggestions/contacts?q=${encodeURIComponent(query)}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            showAutocomplete('contact-person', result.data);
        } else {
            hideAutocomplete('contact-person');
        }
    } catch (error) {
        // Silently fail - autocomplete is optional
        hideAutocomplete('contact-person');
    }
}

function showAutocomplete(fieldId, suggestions) {
    const input = document.getElementById(fieldId);
    let autocompleteDiv = document.getElementById(`${fieldId}-autocomplete`);
    
    if (!autocompleteDiv) {
        autocompleteDiv = document.createElement('div');
        autocompleteDiv.id = `${fieldId}-autocomplete`;
        autocompleteDiv.className = 'autocomplete-suggestions';
        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(autocompleteDiv);
    }
    
    autocompleteDiv.innerHTML = suggestions.slice(0, 5).map(item => 
        `<div class="autocomplete-item" data-value="${item}">${item}</div>`
    ).join('');
    
    autocompleteDiv.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            input.value = item.dataset.value;
            hideAutocomplete(fieldId);
        });
    });
    
    autocompleteDiv.style.display = 'block';
}

function hideAutocomplete(fieldId) {
    const autocompleteDiv = document.getElementById(`${fieldId}-autocomplete`);
    if (autocompleteDiv) {
        autocompleteDiv.style.display = 'none';
    }
}

// 4. Export functionality
async function exportEntries() {
    const params = new URLSearchParams();
    const filterName = document.getElementById('filter-name').value.trim();
    const filterCompany = document.getElementById('filter-company').value.trim();
    const filterClub = document.getElementById('filter-club').value;
    const filterType = document.getElementById('filter-type').value.trim();
    const filterStatus = document.getElementById('filter-status').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    
    if (filterName) params.append('member_name', filterName);
    if (filterCompany) params.append('company', filterCompany);
    if (filterClub) params.append('club', filterClub);
    if (filterType) params.append('opportunity_type', filterType);
    if (filterStatus) params.append('status', filterStatus);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    try {
        const response = await fetch(`${API_BASE_URL}/entries?${params}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            downloadCSV(result.data, 'entries');
            showToast('✓ Entries exported successfully!', 'success');
        } else {
            showToast('No entries to export', 'warning');
        }
    } catch (error) {
        showToast('Failed to export entries', 'error');
    }
}

async function exportStats() {
    const params = new URLSearchParams();
    const filterClub = document.getElementById('stats-filter-club').value;
    const filterMember = document.getElementById('stats-filter-member').value.trim();
    const startDate = document.getElementById('stats-filter-start').value;
    const endDate = document.getElementById('stats-filter-end').value;
    
    if (filterClub) params.append('club', filterClub);
    if (filterMember) params.append('member_name', filterMember);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    try {
        const response = await fetch(`${API_BASE_URL}/stats?${params}`);
        const result = await response.json();
        
        if (result.success) {
            downloadJSON(result.data, 'statistics');
            showToast('✓ Statistics exported successfully!', 'success');
        }
    } catch (error) {
        showToast('Failed to export statistics', 'error');
    }
}

function downloadCSV(data, filename) {
    if (data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    const headers = Object.keys(data[0]).filter(key => key !== '_id' && key !== 'id');
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(','))
    ].join('\n');
    
    downloadFile(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

function downloadJSON(data, filename) {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `${filename}_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// 5. Visibility change handler (refresh data when user returns)
function handleVisibilityChange() {
    if (!document.hidden) {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'list-tab') {
            loadEntries();
        } else if (activeTab && activeTab.id === 'stats-tab') {
            const now = new Date().getTime();
            if (!statsCacheTime || (now - statsCacheTime) > CACHE_DURATION) {
                loadStats();
            }
        }
    }
}

// 6. Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


