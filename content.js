let isRevealing = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleReveal") {
    isRevealing = !isRevealing;
    if (isRevealing) {
      revealHiddenText();
    } else {
      hideRevealedText();
    }
    sendResponse({ revealing: isRevealing });
  } else if (request.action === "getStatus") {
    sendResponse({ revealing: isRevealing });
  }
  return true;
});

function revealHiddenText() {
  const allElements = document.querySelectorAll('*:not(script):not(style):not(noscript)');
  let count = 0;
  let hiddenTexts = [];
  
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
    
    // Encontrar o background color real (pode estar em elementos pais)
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
      element.classList.add('hidden-text-revealed');
      element.setAttribute('data-hidden-reason', reasons.join(', '));
      
      // Coletar informações do texto oculto
      let textContent = element.textContent.trim();
      // Limitar tamanho do texto para a lista
      if (textContent.length > 60) {
        textContent = textContent.substring(0, 60) + '...';
      }
      
      hiddenTexts.push({
        text: textContent,
        reasons: reasons
      });
      
      count++;
    }
  });
  
  showNotification(count, hiddenTexts);
}

function getEffectiveBackgroundColor(element) {
  let current = element;
  let maxDepth = 10; // Limitar busca para não ir longe demais
  
  while (current && maxDepth > 0) {
    const bg = window.getComputedStyle(current).backgroundColor;
    const rgba = parseColor(bg);
    
    // Se encontrou um background opaco, retornar
    if (rgba && rgba.a > 0.5) {
      return bg;
    }
    
    current = current.parentElement;
    maxDepth--;
  }
  
  // Se não encontrou nada, retornar branco (padrão)
  return 'rgb(255, 255, 255)';
}

function hideRevealedText() {
  const revealed = document.querySelectorAll('.hidden-text-revealed');
  revealed.forEach(element => {
    element.classList.remove('hidden-text-revealed');
    element.removeAttribute('data-hidden-reason');
  });
  removeNotification();
}

function colorsAreSimilar(color1, color2) {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);
  
  if (!rgb1 || !rgb2) return false;
  
  // Se o texto tem alpha muito baixo, é transparente
  if (rgb1.a < 0.1) return true;
  
  const rDiff = Math.abs(rgb1.r - rgb2.r);
  const gDiff = Math.abs(rgb1.g - rgb2.g);
  const bDiff = Math.abs(rgb1.b - rgb2.b);
  
  // Threshold mais rigoroso: 15 em vez de 30
  // Cores precisam ser MUITO próximas para serem consideradas similares
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

function getReasonLabel(reason) {
  const labels = {
    'tiny-font': 'Fonte minúscula',
    'color-match': 'Cor igual ao fundo',
    'transparent': 'Transparente',
    'visibility-hidden': 'Visibility hidden',
    'display-none': 'Display none',
    'text-indent': 'Text-indent'
  };
  return labels[reason] || reason;
}

function showNotification(count, hiddenTexts) {
  removeNotification();
  
  const notification = document.createElement('div');
  notification.id = 'hidden-text-notification';
  
  // Cabeçalho
  const header = document.createElement('div');
  header.className = 'notification-header';
  header.innerHTML = `<strong>🔍 Found ${count} hidden text element${count !== 1 ? 's' : ''}</strong>`;
  notification.appendChild(header);
  
  // Lista de textos (limitar a 10 itens para não ficar muito grande)
  if (hiddenTexts.length > 0) {
    const list = document.createElement('div');
    list.className = 'notification-list';
    
    const maxItems = Math.min(hiddenTexts.length, 10);
    for (let i = 0; i < maxItems; i++) {
      const item = document.createElement('div');
      item.className = 'notification-item';
      
      const reasonBadge = document.createElement('span');
      reasonBadge.className = 'reason-badge';
      reasonBadge.textContent = getReasonLabel(hiddenTexts[i].reasons[0]); // Mostrar primeira razão traduzida
      
      const textSpan = document.createElement('span');
      textSpan.className = 'hidden-text-content';
      textSpan.textContent = hiddenTexts[i].text;
      
      item.appendChild(reasonBadge);
      item.appendChild(textSpan);
      list.appendChild(item);
    }
    
    if (hiddenTexts.length > 10) {
      const more = document.createElement('div');
      more.className = 'notification-more';
      more.textContent = `... e mais ${hiddenTexts.length - 10}`;
      list.appendChild(more);
    }
    
    notification.appendChild(list);
  }
  
  // Botão fechar
  const closeBtn = document.createElement('button');
  closeBtn.className = 'notification-close';
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => removeNotification();
  notification.appendChild(closeBtn);
  
  document.body.appendChild(notification);
  
  // Auto-fechar após 10 segundos
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.opacity = '0';
      setTimeout(() => removeNotification(), 300);
    }
  }, 10000);
}

function removeNotification() {
  const existing = document.getElementById('hidden-text-notification');
  if (existing) existing.remove();
}
