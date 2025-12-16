// Popup script with i18n and minimap support
let currentLang = 'en';
let hiddenItems = [];
let activeFilters = {
  'tiny-font': true,
  'color-match': true,
  'transparent': true,
  'visibility-hidden': true,
  'display-none': true,
  'text-indent': true
};

// I18n translations
const translations = {
  en: {
    tinyFont: 'Tiny font',
    colorMatch: 'Color matches background',
    transparent: 'Transparent',
    visibilityHidden: 'Visibility hidden',
    displayNone: 'Display none',
    textIndent: 'Text-indent',
    revealButton: 'Reveal Hidden Text',
    hideButton: 'Hide Revealed Text',
    revealing: 'Revealing hidden text',
    ready: 'Ready',
    clickToReveal: 'Click "Reveal Hidden Text" to start',
    noItems: 'No items match the selected filters',
    hiddenTexts: 'List',
    filters: 'Filters',
    minimap: 'Minimap'
  },
  pt: {
    tinyFont: 'Fonte minúscula',
    colorMatch: 'Cor igual ao fundo',
    transparent: 'Transparente',
    visibilityHidden: 'Visibility hidden',
    displayNone: 'Display none',
    textIndent: 'Text-indent',
    revealButton: 'Revelar Textos Ocultos',
    hideButton: 'Ocultar Textos Revelados',
    revealing: 'Revelando textos ocultos',
    ready: 'Pronto',
    clickToReveal: 'Clique em "Revelar Textos Ocultos" para começar',
    noItems: 'Nenhum item corresponde aos filtros selecionados',
    hiddenTexts: 'Lista',
    filters: 'Filtros',
    minimap: 'Minimapa'
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load language preference
  chrome.storage.local.get(['language'], (result) => {
    currentLang = result.language || 'en';
    updateLanguage();
  });
  
  // Setup event listeners
  setupEventListeners();
  
  // Update status
  updateButtonState();
});

function setupEventListeners() {
  // Main toggle button
  document.getElementById('toggleButton').addEventListener('click', toggleReveal);
  
  // Language toggle
  document.getElementById('languageToggle').addEventListener('click', toggleLanguage);
  
  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // Filters
  document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      activeFilters[e.target.dataset.filter] = e.target.checked;
      applyFilters();
    });
  });
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function toggleReveal() {
  const tab = await getCurrentTab();
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { 
      action: "toggleReveal",
      language: currentLang 
    });
    
    if (response) {
      updateButtonState();
    }
  } catch (error) {
    document.getElementById('header-status').textContent = '⚠ Please refresh the page';
  }
}

async function updateButtonState() {
  const tab = await getCurrentTab();
  const toggleButton = document.getElementById('toggleButton');
  const headerStatus = document.getElementById('header-status');
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "getStatus" });
    
    if (response && response.revealing) {
      toggleButton.textContent = translations[currentLang].hideButton;
      toggleButton.classList.add('active');
      headerStatus.textContent = translations[currentLang].revealing;
      
      // Load hidden items
      hiddenItems = response.items || [];
      updateUI();
    } else {
      toggleButton.textContent = translations[currentLang].revealButton;
      toggleButton.classList.remove('active');
      headerStatus.textContent = translations[currentLang].ready;
      hiddenItems = [];
      updateUI();
    }
  } catch (error) {
    toggleButton.textContent = translations[currentLang].revealButton;
    toggleButton.classList.remove('active');
    headerStatus.textContent = translations[currentLang].ready;
  }
}

function updateUI() {
  updateList();
  updateFilterCounts();
  updateMinimap();
}

function updateList() {
  const container = document.getElementById('list-container');
  const visibleItems = hiddenItems.filter(item => 
    item.reasons.some(reason => activeFilters[reason])
  );
  
  document.getElementById('list-count').textContent = visibleItems.length;
  
  if (visibleItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">
          ${hiddenItems.length === 0 ? translations[currentLang].clickToReveal : translations[currentLang].noItems}
        </div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  visibleItems.forEach((item, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'list-item';
    itemDiv.innerHTML = `
      <div class="list-item-header">
        <span class="list-item-number">#${index + 1}</span>
        <span class="reason-badge">${translations[currentLang][reasonToKey(item.reasons[0])]}</span>
      </div>
      <div class="list-item-text">${item.text}</div>
    `;
    
    itemDiv.addEventListener('click', () => scrollToItem(item.index));
    container.appendChild(itemDiv);
  });
}

function updateFilterCounts() {
  const counts = {
    'tiny-font': 0,
    'color-match': 0,
    'transparent': 0,
    'visibility-hidden': 0,
    'display-none': 0,
    'text-indent': 0
  };
  
  hiddenItems.forEach(item => {
    item.reasons.forEach(reason => {
      counts[reason]++;
    });
  });
  
  Object.keys(counts).forEach(filter => {
    const element = document.querySelector(`[data-count="${filter}"]`);
    if (element) {
      element.textContent = counts[filter];
    }
  });
}

function updateMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  const viewport = document.getElementById('minimap-viewport');
  const stats = document.getElementById('minimap-stats');
  
  // Clear existing dots
  canvas.querySelectorAll('.minimap-dot').forEach(dot => dot.remove());
  
  if (hiddenItems.length === 0) {
    viewport.style.display = 'none';
    stats.textContent = translations[currentLang].clickToReveal;
    return;
  }
  
  viewport.style.display = 'block';
  
  const visibleItems = hiddenItems.filter(item => 
    item.reasons.some(reason => activeFilters[reason])
  );
  
  // Create dots for each visible item
  visibleItems.forEach(item => {
    if (item.position) {
      const dot = document.createElement('div');
      dot.className = 'minimap-dot';
      
      // Calculate position (item.position is percentage from content script)
      const top = (item.position.y * 100) + '%';
      const left = (item.position.x * 100) + '%';
      
      dot.style.top = top;
      dot.style.left = left;
      
      dot.addEventListener('click', () => scrollToItem(item.index));
      canvas.appendChild(dot);
    }
  });
  
  // Update viewport position (representing current scroll)
  if (hiddenItems[0] && hiddenItems[0].viewportHeight) {
    const viewportHeight = hiddenItems[0].viewportHeight;
    viewport.style.height = (viewportHeight * 100) + '%';
    viewport.style.top = '0%'; // Would need current scroll position from content script
  }
  
  stats.innerHTML = `
    <strong>${visibleItems.length}</strong> hidden text${visibleItems.length !== 1 ? 's' : ''} found<br>
    Click on dots to navigate
  `;
}

async function scrollToItem(index) {
  const tab = await getCurrentTab();
  
  try {
    await chrome.tabs.sendMessage(tab.id, { 
      action: "scrollToElement",
      index: index 
    });
  } catch (error) {
    console.error('Error scrolling to element:', error);
  }
}

async function applyFilters() {
  const tab = await getCurrentTab();
  
  try {
    await chrome.tabs.sendMessage(tab.id, { 
      action: "updateFilters",
      filters: activeFilters 
    });
    
    updateUI();
  } catch (error) {
    console.error('Error applying filters:', error);
  }
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'pt' : 'en';
  chrome.storage.local.set({ language: currentLang });
  updateLanguage();
  updateButtonState();
}

function updateLanguage() {
  // Update all i18n elements
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[currentLang][key]) {
      element.textContent = translations[currentLang][key];
    }
  });
  
  // Update button text
  updateButtonState();
}

function reasonToKey(reason) {
  const mapping = {
    'tiny-font': 'tinyFont',
    'color-match': 'colorMatch',
    'transparent': 'transparent',
    'visibility-hidden': 'visibilityHidden',
    'display-none': 'displayNone',
    'text-indent': 'textIndent'
  };
  return mapping[reason] || reason;
}
