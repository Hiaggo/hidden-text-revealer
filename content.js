// Content script - Hidden Text Revealer PRO v3.0
let isRevealing = false;
let hiddenElements = [];
let professionalAnalysis = null;
let activeFilters = {
  'tiny-font': true,
  'color-match': true,
  'transparent': true,
  'visibility-hidden': true,
  'display-none': true,
  'text-indent': true
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleReveal") {
    isRevealing = !isRevealing;
    if (isRevealing) {
      revealHiddenText();
    } else {
      hideRevealedText();
    }
    sendResponse({ 
      revealing: isRevealing,
      items: getSerializableItems(),
      analysis: professionalAnalysis
    });
  } else if (request.action === "getStatus") {
    sendResponse({ 
      revealing: isRevealing,
      items: getSerializableItems(),
      analysis: professionalAnalysis
    });
  } else if (request.action === "updateFilters") {
    activeFilters = request.filters;
    applyFilters();
    sendResponse({ success: true });
  } else if (request.action === "scrollToElement") {
    scrollToElement(request.index);
    sendResponse({ success: true });
  }
  return true;
});

function getSerializableItems() {
  // Convert items to plain objects for messaging
  return hiddenElements.map((item, index) => ({
    text: item.text,
    reasons: item.reasons,
    visible: item.visible,
    index: index,
    position: item.position,
    viewportHeight: getViewportHeightRatio()
  }));
}

function getViewportHeightRatio() {
  const docHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  return window.innerHeight / docHeight;
}

function revealHiddenText() {
  const allElements = document.querySelectorAll('*:not(script):not(style):not(noscript)');
  hiddenElements = [];
  
  const docHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  const docWidth = Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth
  );
  
  allElements.forEach(element => {
    if (!element.textContent.trim()) return;
    
    let hasDirectText = false;
    for (let node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        hasDirectText = true;
        break;
      }
    }
    if (!hasDirectText) return;
    
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const fontSize = parseFloat(styles.fontSize);
    const opacity = parseFloat(styles.opacity);
    const visibility = styles.visibility;
    const display = styles.display;
    
    const bgColor = getEffectiveBackgroundColor(element);
    
    let isHidden = false;
    let reasons = [];
    
    if (fontSize < 2) {
      isHidden = true;
      reasons.push('tiny-font');
    }
    
    if (colorsAreSimilar(color, bgColor)) {
      isHidden = true;
      reasons.push('color-match');
    }
    
    if (opacity < 0.1) {
      isHidden = true;
      reasons.push('transparent');
    }
    
    if (visibility === 'hidden') {
      isHidden = true;
      reasons.push('visibility-hidden');
    }
    
    if (display === 'none') {
      isHidden = true;
      reasons.push('display-none');
    }
    
    const textIndent = parseFloat(styles.textIndent);
    if (textIndent < -9000) {
      isHidden = true;
      reasons.push('text-indent');
    }
    
    if (isHidden) {
      let textContent = element.textContent.trim();
      if (textContent.length > 100) {
        textContent = textContent.substring(0, 100) + '...';
      }
      
      // Get position for minimap
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      const absoluteTop = rect.top + scrollTop;
      const absoluteLeft = rect.left + scrollLeft;
      
      hiddenElements.push({
        element: element,
        text: textContent,
        reasons: reasons,
        visible: true,
        position: {
          y: absoluteTop / docHeight,
          x: absoluteLeft / docWidth
        }
      });
      
      element.classList.add('hidden-text-revealed');
      element.setAttribute('data-hidden-reason', reasons.join(', '));
      element.setAttribute('data-hidden-index', hiddenElements.length - 1);
    }
  });
  
  applyFilters();
  updateBadge(hiddenElements.length);
  showNotification(hiddenElements.length);
  
  // Perform professional analysis
  if (typeof performProfessionalAnalysis === 'function') {
    professionalAnalysis = performProfessionalAnalysis(hiddenElements);
    console.log('Professional Analysis Complete:', professionalAnalysis);
  }
}

function hideRevealedText() {
  const revealed = document.querySelectorAll('.hidden-text-revealed');
  revealed.forEach(element => {
    element.classList.remove('hidden-text-revealed');
    element.classList.remove('hidden-text-filtered');
    element.removeAttribute('data-hidden-reason');
    element.removeAttribute('data-hidden-index');
  });
  
  hiddenElements = [];
  professionalAnalysis = null;
  updateBadge(0);
  removeNotification();
}

function applyFilters() {
  hiddenElements.forEach((item) => {
    const shouldShow = item.reasons.some(reason => activeFilters[reason]);
    item.visible = shouldShow;
    
    if (item.element) {
      if (shouldShow) {
        item.element.classList.remove('hidden-text-filtered');
        item.element.classList.add('hidden-text-revealed');
      } else {
        item.element.classList.add('hidden-text-filtered');
        item.element.classList.remove('hidden-text-revealed');
      }
    }
  });
}

function scrollToElement(index) {
  const item = hiddenElements[index];
  if (item && item.element) {
    item.element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    item.element.classList.add('hidden-text-flash');
    setTimeout(() => {
      item.element.classList.remove('hidden-text-flash');
    }, 2000);
  }
}

function getEffectiveBackgroundColor(element) {
  let current = element;
  let maxDepth = 10;
  
  while (current && maxDepth > 0) {
    const bg = window.getComputedStyle(current).backgroundColor;
    const rgba = parseColor(bg);
    
    if (rgba && rgba.a > 0.5) {
      return bg;
    }
    
    current = current.parentElement;
    maxDepth--;
  }
  
  return 'rgb(255, 255, 255)';
}

function colorsAreSimilar(color1, color2) {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);
  
  if (!rgb1 || !rgb2) return false;
  if (rgb1.a < 0.1) return true;
  
  const rDiff = Math.abs(rgb1.r - rgb2.r);
  const gDiff = Math.abs(rgb1.g - rgb2.g);
  const bDiff = Math.abs(rgb1.b - rgb2.b);
  
  return rDiff < 15 && gDiff < 15 && bDiff < 15;
}

function parseColor(color) {
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
    };
  }
  return null;
}

function showNotification(count) {
  removeNotification();
  
  const notification = document.createElement('div');
  notification.id = 'hidden-text-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <strong>🔍 ${count} hidden text${count !== 1 ? 's' : ''} found</strong>
      <p style="margin: 5px 0 0 0; font-size: 11px; opacity: 0.8;">
        Open the extension popup to see the list
      </p>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.opacity = '0';
      setTimeout(() => removeNotification(), 300);
    }
  }, 4000);
}

function removeNotification() {
  const existing = document.getElementById('hidden-text-notification');
  if (existing) existing.remove();
}

function updateBadge(count) {
  chrome.runtime.sendMessage({ 
    action: "updateBadge", 
    count: count 
  });
}
