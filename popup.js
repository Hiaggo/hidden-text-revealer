// Popup script with i18n and minimap support
let currentLang = 'en';
let hiddenItems = [];
let analysisData = null;
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
  // Always start with English
  currentLang = 'en';
  updateLanguage();
  
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
      
      // Load hidden items and analysis
      hiddenItems = response.items || [];
      analysisData = response.analysis || null;
      updateUI();
    } else {
      toggleButton.textContent = translations[currentLang].revealButton;
      toggleButton.classList.remove('active');
      headerStatus.textContent = translations[currentLang].ready;
      hiddenItems = [];
      analysisData = null;
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
  updateAnalysis();
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

function updateAnalysis() {
  const container = document.getElementById('analysis-container');
  
  if (!analysisData || !analysisData.riskScore) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">
          ${currentLang === 'en' ? 
            'Click "Reveal Hidden Text" to start professional analysis' :
            'Clique em "Revelar Textos Ocultos" para iniciar análise profissional'}
        </div>
      </div>
    `;
    return;
  }
  
  const { riskScore, keywordStuffing, hiddenLinks, textDensity, maliciousKeywords } = analysisData;
  
  let html = `
    <!-- Risk Score Card -->
    <div class="risk-score-card" style="background: linear-gradient(135deg, ${riskScore.riskColor}, ${adjustColor(riskScore.riskColor, -20)});">
      <div style="font-size: 14px; opacity: 0.9;">${currentLang === 'en' ? 'SEO Risk Score' : 'Score de Risco SEO'}</div>
      <div class="risk-score-number">${riskScore.score}/100</div>
      <div class="risk-level">
        <span style="font-size: 24px;">${riskScore.riskEmoji}</span>
        <span>${riskScore.riskLevel}</span>
      </div>
    </div>
  `;
  
  // Alerts based on risk level
  if (riskScore.score >= 76) {
    html += `
      <div class="alert-box critical">
        <strong>⚠️ ${currentLang === 'en' ? 'CRITICAL RISK' : 'RISCO CRÍTICO'}</strong><br>
        ${currentLang === 'en' ? 
          'This site shows signs of Black Hat SEO. High risk of Google penalty.' :
          'Este site mostra sinais de Black Hat SEO. Alto risco de penalização do Google.'}
      </div>
    `;
  } else if (riskScore.score >= 51) {
    html += `
      <div class="alert-box warning">
        <strong>⚠️ ${currentLang === 'en' ? 'HIGH RISK' : 'RISCO ALTO'}</strong><br>
        ${currentLang === 'en' ? 
          'Suspicious patterns detected. Review and correct immediately.' :
          'Padrões suspeitos detectados. Revise e corrija imediatamente.'}
      </div>
    `;
  }
  
  // Keyword Stuffing Section
  if (keywordStuffing && keywordStuffing.suspicious.length > 0) {
    html += `
      <div class="analysis-section">
        <h4>🔑 ${currentLang === 'en' ? 'Keyword Stuffing' : 'Keyword Stuffing'}</h4>
        <div class="analysis-stat">
          <span class="stat-label">${currentLang === 'en' ? 'Total Words' : 'Total de Palavras'}</span>
          <span class="stat-value">${keywordStuffing.totalWords}</span>
        </div>
        <div class="analysis-stat">
          <span class="stat-label">${currentLang === 'en' ? 'Suspicious Keywords' : 'Palavras Suspeitas'}</span>
          <span class="stat-value ${keywordStuffing.suspicious.length > 5 ? 'high' : 'medium'}">
            ${keywordStuffing.suspicious.length}
          </span>
        </div>
        <div class="keyword-list">
          ${keywordStuffing.suspicious.slice(0, 5).map(kw => `
            <div class="keyword-item">
              <span class="keyword-word">${kw.word}</span>
              <div>
                <span class="keyword-count">${kw.count}x</span>
                <span style="margin-left: 8px; color: #666; font-size: 11px;">${kw.density}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Hidden Links Section
  if (hiddenLinks && hiddenLinks.totalLinks > 0) {
    html += `
      <div class="analysis-section">
        <h4>🔗 ${currentLang === 'en' ? 'Hidden Links' : 'Links Ocultos'}</h4>
        <div class="analysis-stat">
          <span class="stat-label">${currentLang === 'en' ? 'Total Links' : 'Total de Links'}</span>
          <span class="stat-value ${hiddenLinks.totalLinks > 20 ? 'high' : hiddenLinks.totalLinks > 10 ? 'medium' : 'low'}">
            ${hiddenLinks.totalLinks}
          </span>
        </div>
        <div class="analysis-stat">
          <span class="stat-label">${currentLang === 'en' ? 'Unique Domains' : 'Domínios Únicos'}</span>
          <span class="stat-value">${hiddenLinks.uniqueDomains}</span>
        </div>
        ${hiddenLinks.suspicious.length > 0 ? `
          <div class="analysis-stat">
            <span class="stat-label">${currentLang === 'en' ? 'Suspicious Domains' : 'Domínios Suspeitos'}</span>
            <span class="stat-value high">${hiddenLinks.suspicious.length}</span>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Text Density Section
  if (textDensity) {
    html += `
      <div class="analysis-section">
        <h4>📝 ${currentLang === 'en' ? 'Text Density' : 'Densidade de Texto'}</h4>
        <div class="analysis-stat">
          <span class="stat-label">${currentLang === 'en' ? 'Visible Words' : 'Palavras Visíveis'}</span>
          <span class="stat-value">${textDensity.visible.words}</span>
        </div>
        <div class="analysis-stat">
          <span class="stat-label">${currentLang === 'en' ? 'Hidden Words' : 'Palavras Ocultas'}</span>
          <span class="stat-value ${textDensity.risk === 'critical' ? 'high' : textDensity.risk === 'high' ? 'medium' : 'low'}">
            ${textDensity.hidden.words}
          </span>
        </div>
        <div class="analysis-stat">
          <span class="stat-label">${currentLang === 'en' ? 'Ratio' : 'Proporção'}</span>
          <span class="stat-value ${textDensity.risk === 'critical' ? 'high' : textDensity.risk === 'high' ? 'medium' : 'low'}">
            ${textDensity.ratios.words}%
          </span>
        </div>
      </div>
    `;
  }
  
  // Malicious Keywords Section
  if (maliciousKeywords && maliciousKeywords.totalMatches > 0) {
    html += `
      <div class="analysis-section">
        <h4>🛡️ ${currentLang === 'en' ? 'Security Analysis' : 'Análise de Segurança'}</h4>
        <div class="analysis-stat">
          <span class="stat-label">${currentLang === 'en' ? 'Malicious Patterns' : 'Padrões Maliciosos'}</span>
          <span class="stat-value high">${maliciousKeywords.totalMatches}</span>
        </div>
        <div class="analysis-stat">
          <span class="stat-label">${currentLang === 'en' ? 'Categories Detected' : 'Categorias Detectadas'}</span>
          <span class="stat-value high">${maliciousKeywords.totalCategories}</span>
        </div>
        ${Object.keys(maliciousKeywords.detected).map(category => `
          <div class="keyword-item">
            <span class="keyword-word">${category.toUpperCase()}</span>
            <span class="keyword-count">${maliciousKeywords.detected[category].totalCount}x</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Prompt Injection Detection Section
  if (analysisData.promptInjection && analysisData.promptInjection.hasFindings) {
    const pi = analysisData.promptInjection;
    html += `
      <div class="analysis-section" style="border-left: 4px solid #9C27B0;">
        <h4>🤖 ${currentLang === 'en' ? 'Possible Prompt Injection' : 'Possível Prompt Injection'}</h4>
        <div class="alert-box info" style="background: #f3e5f5; border-left-color: #9C27B0; color: #4a148c; margin-bottom: 12px;">
          ${currentLang === 'en' ? 
            '<strong>Note:</strong> These patterns <u>may indicate</u> attempts to manipulate AI systems. Review context carefully.' :
            '<strong>Nota:</strong> Estes padrões <u>podem indicar</u> tentativas de manipular sistemas de IA. Revise o contexto cuidadosamente.'}
        </div>
        
        <div class="analysis-stat">
          <span class="stat-label">${currentLang === 'en' ? 'Suspicious Texts' : 'Textos Suspeitos'}</span>
          <span class="stat-value ${pi.stats.bySeverity.critical > 0 ? 'high' : 'medium'}">
            ${pi.stats.totalSuspicious}
          </span>
        </div>
        
        ${pi.stats.bySeverity.critical > 0 ? `
          <div class="analysis-stat">
            <span class="stat-label">⚠️ Critical</span>
            <span class="stat-value high">${pi.stats.bySeverity.critical}</span>
          </div>
        ` : ''}
        
        ${pi.stats.bySeverity.high > 0 ? `
          <div class="analysis-stat">
            <span class="stat-label">⚠️ High</span>
            <span class="stat-value medium">${pi.stats.bySeverity.high}</span>
          </div>
        ` : ''}
        
        ${pi.stats.bySeverity.medium > 0 ? `
          <div class="analysis-stat">
            <span class="stat-label">⚠️ Medium</span>
            <span class="stat-value">${pi.stats.bySeverity.medium}</span>
          </div>
        ` : ''}
        
        <div style="margin-top: 12px; font-size: 12px; color: #666;">
          <strong>${currentLang === 'en' ? 'Categories found:' : 'Categorias encontradas:'}</strong><br>
          ${Object.keys(pi.stats.byCategory).map(cat => `
            <span style="display: inline-block; margin: 4px 6px 4px 0; padding: 2px 8px; background: #f0f0f0; border-radius: 10px; font-size: 11px;">
              ${cat.replace(/([A-Z])/g, ' $1').trim()} (${pi.stats.byCategory[cat]})
            </span>
          `).join('')}
        </div>
        
        <details style="margin-top: 12px;">
          <summary style="cursor: pointer; font-weight: 600; font-size: 12px; color: #9C27B0;">
            ${currentLang === 'en' ? 'Show suspicious texts' : 'Mostrar textos suspeitos'} ▼
          </summary>
          <div style="margin-top: 8px; max-height: 200px; overflow-y: auto;">
            ${pi.detected.slice(0, 5).map((item, idx) => `
              <div style="background: #fafafa; padding: 8px; margin: 6px 0; border-radius: 4px; border-left: 3px solid ${
                item.highestSeverity === 'critical' ? '#D32F2F' :
                item.highestSeverity === 'high' ? '#F57C00' : '#FBC02D'
              };">
                <div style="font-size: 11px; color: #666; margin-bottom: 4px;">
                  <strong>Text #${item.index + 1}</strong> - 
                  <span style="color: ${
                    item.highestSeverity === 'critical' ? '#D32F2F' :
                    item.highestSeverity === 'high' ? '#F57C00' : '#F57C00'
                  }; text-transform: uppercase;">${item.highestSeverity}</span>
                </div>
                <div style="font-size: 11px; font-family: monospace; color: #333; word-break: break-all;">
                  "${item.text}"
                </div>
                <div style="margin-top: 6px; font-size: 10px; color: #888;">
                  ${item.findings.length} pattern(s) detected
                </div>
              </div>
            `).join('')}
            ${pi.detected.length > 5 ? `
              <div style="text-align: center; font-size: 11px; color: #999; margin-top: 8px;">
                ... and ${pi.detected.length - 5} more
              </div>
            ` : ''}
          </div>
        </details>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function adjustColor(color, percent) {
  const num = parseInt(color.replace('#',''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
    (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255))
    .toString(16).slice(1);
}
