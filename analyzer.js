// Professional Analysis Module - Hidden Text Revealer PRO v3.0

// ===== 1. KEYWORD STUFFING DETECTION =====

function analyzeKeywordStuffing(hiddenElements) {
  const allText = hiddenElements
    .map(el => el.text)
    .join(' ')
    .toLowerCase();
  
  // Tokenizar
  const words = allText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3); // Ignorar palavras pequenas
  
  if (words.length === 0) {
    return { suspicious: [], totalWords: 0, score: 0 };
  }
  
  // Contar frequência
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  // Calcular densidade e encontrar palavras suspeitas
  const totalWords = words.length;
  const suspicious = [];
  
  Object.keys(frequency).forEach(word => {
    const count = frequency[word];
    const density = (count / totalWords) * 100;
    
    // Suspeito se: densidade > 2% OU mais de 5 repetições
    if (density > 2 || count > 5) {
      suspicious.push({
        word: word,
        count: count,
        density: density.toFixed(2),
        severity: density > 5 ? 'high' : density > 3 ? 'medium' : 'low'
      });
    }
  });
  
  // Ordenar por densidade
  suspicious.sort((a, b) => b.density - a.density);
  
  // Score de keyword stuffing (0-30)
  let score = 0;
  if (suspicious.length > 0) {
    score = Math.min(suspicious.length * 3, 30);
  }
  
  return {
    suspicious: suspicious.slice(0, 10), // Top 10
    totalWords,
    uniqueWords: Object.keys(frequency).length,
    score
  };
}

// ===== 2. HIDDEN LINKS ANALYSIS =====

function analyzeHiddenLinks(hiddenElements) {
  const links = [];
  
  hiddenElements.forEach(item => {
    if (!item.element) return;
    
    // Procurar links no elemento e seus filhos
    const linkElements = item.element.querySelectorAll('a[href]');
    
    linkElements.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return; // Ignorar âncoras
      
      try {
        const url = new URL(href, window.location.href);
        links.push({
          url: url.href,
          domain: url.hostname,
          text: link.textContent.trim() || '[no text]',
          reason: item.reasons[0]
        });
      } catch (e) {
        // URL inválida
      }
    });
  });
  
  // Agrupar por domínio
  const domains = {};
  links.forEach(link => {
    if (!domains[link.domain]) {
      domains[link.domain] = [];
    }
    domains[link.domain].push(link);
  });
  
  // Detectar link farms (muitos links para mesmo domínio)
  const suspicious = [];
  Object.keys(domains).forEach(domain => {
    const count = domains[domain].length;
    if (count >= 5) {
      suspicious.push({
        domain,
        count,
        severity: count > 20 ? 'high' : count > 10 ? 'medium' : 'low'
      });
    }
  });
  
  // Score de links ocultos (0-25)
  let score = 0;
  if (links.length > 0) {
    score = Math.min(links.length * 0.5, 15);
    score += Math.min(suspicious.length * 5, 10);
  }
  
  return {
    totalLinks: links.length,
    uniqueDomains: Object.keys(domains).length,
    suspicious,
    domainDetails: domains,
    score
  };
}

// ===== 3. TEXT DENSITY ANALYSIS =====

function analyzeTextDensity(hiddenElements) {
  // Texto visível na página
  const bodyText = document.body.innerText || '';
  const visibleWords = bodyText.split(/\s+/).filter(w => w.length > 0).length;
  
  // Texto oculto
  const hiddenText = hiddenElements.map(el => el.text).join(' ');
  const hiddenWords = hiddenText.split(/\s+/).filter(w => w.length > 0).length;
  
  // Caracteres
  const visibleChars = bodyText.length;
  const hiddenChars = hiddenText.length;
  
  // Ratios
  const wordRatio = visibleWords > 0 ? (hiddenWords / visibleWords) * 100 : 0;
  const charRatio = visibleChars > 0 ? (hiddenChars / visibleChars) * 100 : 0;
  
  // Determinar risco
  let risk = 'low';
  let riskScore = 0;
  
  if (wordRatio > 50 || hiddenWords > 500) {
    risk = 'critical';
    riskScore = 25;
  } else if (wordRatio > 25 || hiddenWords > 250) {
    risk = 'high';
    riskScore = 20;
  } else if (wordRatio > 10 || hiddenWords > 100) {
    risk = 'medium';
    riskScore = 12;
  } else if (hiddenWords > 20) {
    risk = 'low';
    riskScore = 5;
  }
  
  return {
    visible: {
      words: visibleWords,
      chars: visibleChars
    },
    hidden: {
      words: hiddenWords,
      chars: hiddenChars
    },
    ratios: {
      words: wordRatio.toFixed(2),
      chars: charRatio.toFixed(2)
    },
    risk,
    score: riskScore
  };
}

// ===== 4. MALICIOUS KEYWORDS DETECTION =====

const MALICIOUS_PATTERNS = {
  phishing: {
    patterns: [
      /verify\s+(your\s+)?account/i,
      /suspended\s+account/i,
      /confirm\s+(your\s+)?identity/i,
      /unusual\s+activity/i,
      /security\s+alert/i,
      /act\s+now/i,
      /limited\s+time\s+(offer)?/i,
      /urgent\s+action/i,
      /click\s+here\s+(now|immediately)/i,
      /update\s+(your\s+)?payment/i
    ],
    severity: 'critical'
  },
  
  pharma: {
    patterns: [
      /viagra/i,
      /cialis/i,
      /\bpills?\b/i,
      /prescription/i,
      /no\s+doctor/i,
      /canadian\s+pharmacy/i,
      /generic\s+medication/i
    ],
    severity: 'high'
  },
  
  scam: {
    patterns: [
      /bitcoin\s+giveaway/i,
      /double\s+your\s+money/i,
      /guaranteed\s+returns?/i,
      /get\s+rich\s+quick/i,
      /work\s+(from\s+)?home.*\$/i,
      /earn\s+\$\d+/i,
      /free\s+money/i,
      /congratulations.*winner/i
    ],
    severity: 'high'
  },
  
  gambling: {
    patterns: [
      /online\s+casino/i,
      /sports\s+betting/i,
      /poker\s+online/i,
      /slots?\s+games?/i,
      /jackpot/i
    ],
    severity: 'medium'
  },
  
  adult: {
    patterns: [
      /xxx/i,
      /adult\s+content/i,
      /18\+/i,
      /porn/i
    ],
    severity: 'medium'
  }
};

function detectMaliciousKeywords(hiddenElements) {
  const allText = hiddenElements.map(el => el.text).join(' ');
  const detected = {};
  let totalMatches = 0;
  
  Object.keys(MALICIOUS_PATTERNS).forEach(category => {
    const categoryData = MALICIOUS_PATTERNS[category];
    const matches = [];
    
    categoryData.patterns.forEach(pattern => {
      const found = allText.match(new RegExp(pattern, 'gi'));
      if (found) {
        matches.push({
          pattern: pattern.source,
          matches: found,
          count: found.length
        });
        totalMatches += found.length;
      }
    });
    
    if (matches.length > 0) {
      detected[category] = {
        matches,
        totalCount: matches.reduce((sum, m) => sum + m.count, 0),
        severity: categoryData.severity
      };
    }
  });
  
  // Score de palavras maliciosas (0-20)
  let score = 0;
  Object.keys(detected).forEach(category => {
    const data = detected[category];
    if (data.severity === 'critical') {
      score += data.totalCount * 2;
    } else if (data.severity === 'high') {
      score += data.totalCount * 1.5;
    } else {
      score += data.totalCount * 1;
    }
  });
  score = Math.min(Math.round(score), 20);
  
  return {
    detected,
    totalCategories: Object.keys(detected).length,
    totalMatches,
    score
  };
}

// ===== 5. SEO RISK SCORE CALCULATOR =====

function calculateSEORiskScore(analyses) {
  let totalScore = 0;
  const breakdown = {};
  
  // 1. Quantidade de textos ocultos (0-20 pontos)
  const quantityScore = Math.min(analyses.hiddenCount / 5, 20);
  totalScore += quantityScore;
  breakdown.quantity = Math.round(quantityScore);
  
  // 2. Keyword stuffing (0-30 pontos)
  if (analyses.keywordStuffing) {
    totalScore += analyses.keywordStuffing.score;
    breakdown.keywordStuffing = analyses.keywordStuffing.score;
  }
  
  // 3. Hidden links (0-25 pontos)
  if (analyses.hiddenLinks) {
    totalScore += analyses.hiddenLinks.score;
    breakdown.hiddenLinks = analyses.hiddenLinks.score;
  }
  
  // 4. Text density (0-25 pontos)
  if (analyses.textDensity) {
    totalScore += analyses.textDensity.score;
    breakdown.textDensity = analyses.textDensity.score;
  }
  
  // 5. Malicious keywords (0-20 pontos)
  if (analyses.maliciousKeywords) {
    totalScore += analyses.maliciousKeywords.score;
    breakdown.maliciousKeywords = analyses.maliciousKeywords.score;
  }
  
  // Limitar a 100
  totalScore = Math.min(Math.round(totalScore), 100);
  
  // Determinar nível de risco
  let riskLevel, riskColor, riskEmoji;
  if (totalScore >= 76) {
    riskLevel = 'CRITICAL';
    riskColor = '#D32F2F';
    riskEmoji = '🔴';
  } else if (totalScore >= 51) {
    riskLevel = 'HIGH';
    riskColor = '#F57C00';
    riskEmoji = '🟠';
  } else if (totalScore >= 26) {
    riskLevel = 'MEDIUM';
    riskColor = '#FBC02D';
    riskEmoji = '🟡';
  } else {
    riskLevel = 'LOW';
    riskColor = '#388E3C';
    riskEmoji = '🟢';
  }
  
  return {
    score: totalScore,
    breakdown,
    riskLevel,
    riskColor,
    riskEmoji
  };
}

// ===== 6. PROMPT INJECTION DETECTION =====

const PROMPT_INJECTION_PATTERNS = {
  // Comandos diretos comuns em LLMs
  directCommands: {
    patterns: [
      /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?|commands?)/i,
      /disregard\s+(all\s+)?(previous|prior|above)/i,
      /forget\s+(everything|all|previous|instructions?)/i,
      /new\s+(instructions?|task|role|prompt)/i,
      /you\s+are\s+now/i,
      /act\s+as\s+(a\s+)?(?!normal|regular)/i,
      /pretend\s+(you\s+are|to\s+be)/i,
      /from\s+now\s+on/i,
      /override\s+(instructions?|settings?|rules?)/i,
    ],
    severity: 'high'
  },
  
  // Tentativas de quebrar o contexto
  contextBreaking: {
    patterns: [
      /\[SYSTEM\]/i,
      /\[ADMIN\]/i,
      /\[OVERRIDE\]/i,
      /<\|system\|>/i,
      /<\|endoftext\|>/i,
      /###\s*SYSTEM/i,
      /###\s*INSTRUCTION/i,
      /===\s*END\s+OF/i,
    ],
    severity: 'critical'
  },
  
  // Repetição excessiva para confundir
  repetitionAttack: {
    patterns: [
      /(.{3,})\1{10,}/i, // Mesma string repetida 10+ vezes
      /(ignore|repeat|say|tell)\s+\1\s+\1/i, // Palavra repetida 3x
    ],
    severity: 'medium'
  },
  
  // Tentativas de extrair informações do sistema
  systemProbing: {
    patterns: [
      /what\s+(are\s+)?your\s+(system\s+)?(instructions?|prompts?|rules?)/i,
      /show\s+me\s+your\s+(system\s+)?(prompt|instructions?)/i,
      /reveal\s+(your\s+)?(system\s+)?(prompt|instructions?)/i,
      /print\s+(your\s+)?(system\s+)?(prompt|instructions?)/i,
      /display\s+(your\s+)?(system\s+)?(prompt|instructions?)/i,
    ],
    severity: 'medium'
  },
  
  // Injeção de código/comandos
  codeInjection: {
    patterns: [
      /```\s*(system|python|javascript|sql|bash)/i,
      /<script>/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
      /system\s*\(/i,
      /__import__/i,
    ],
    severity: 'high'
  },
  
  // Role-playing malicioso
  rolePlay: {
    patterns: [
      /DAN\s+(mode|prompt)/i, // "Do Anything Now"
      /jailbreak/i,
      /STAN\s+mode/i, // "Strive To Avoid Norms"
      /developer\s+mode/i,
      /unrestricted/i,
      /without\s+(any\s+)?(limitations?|restrictions?|filters?|safeguards?)/i,
    ],
    severity: 'high'
  },
  
  // Separadores e delimitadores suspeitos
  delimiters: {
    patterns: [
      /---+\s*END/i,
      /===+\s*NEW/i,
      /\*\*\*\s*SYSTEM/i,
      /<<<\s*USER/i,
      />>>\s*ASSISTANT/i,
    ],
    severity: 'medium'
  },
  
  // Encodings e ofuscação
  obfuscation: {
    patterns: [
      /base64\s*:/i,
      /rot13/i,
      /\\x[0-9a-f]{2}/i, // Hex encoding
      /\\u[0-9a-f]{4}/i, // Unicode escaping
      /%[0-9a-f]{2}/i, // URL encoding repetido
    ],
    severity: 'medium'
  }
};

function detectPromptInjection(hiddenElements) {
  const detected = [];
  
  hiddenElements.forEach((item, index) => {
    const text = item.text;
    const findings = [];
    
    Object.keys(PROMPT_INJECTION_PATTERNS).forEach(category => {
      const categoryData = PROMPT_INJECTION_PATTERNS[category];
      
      categoryData.patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          findings.push({
            category,
            pattern: pattern.source.substring(0, 50) + '...',
            match: matches[0].substring(0, 100),
            severity: categoryData.severity,
            position: matches.index
          });
        }
      });
    });
    
    if (findings.length > 0) {
      detected.push({
        index,
        text: text.substring(0, 150) + (text.length > 150 ? '...' : ''),
        findings,
        totalFindings: findings.length,
        highestSeverity: findings.some(f => f.severity === 'critical') ? 'critical' :
                         findings.some(f => f.severity === 'high') ? 'high' : 'medium'
      });
    }
  });
  
  // Estatísticas gerais
  const stats = {
    totalSuspicious: detected.length,
    bySeverity: {
      critical: detected.filter(d => d.highestSeverity === 'critical').length,
      high: detected.filter(d => d.highestSeverity === 'high').length,
      medium: detected.filter(d => d.highestSeverity === 'medium').length
    },
    byCategory: {}
  };
  
  detected.forEach(item => {
    item.findings.forEach(finding => {
      if (!stats.byCategory[finding.category]) {
        stats.byCategory[finding.category] = 0;
      }
      stats.byCategory[finding.category]++;
    });
  });
  
  return {
    detected,
    stats,
    hasFindings: detected.length > 0
  };
}

// ===== MAIN ANALYSIS FUNCTION =====

function performProfessionalAnalysis(hiddenElements) {
  const analyses = {
    hiddenCount: hiddenElements.length,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    domain: window.location.hostname
  };
  
  // Run all analyses
  analyses.keywordStuffing = analyzeKeywordStuffing(hiddenElements);
  analyses.hiddenLinks = analyzeHiddenLinks(hiddenElements);
  analyses.textDensity = analyzeTextDensity(hiddenElements);
  analyses.maliciousKeywords = detectMaliciousKeywords(hiddenElements);
  analyses.promptInjection = detectPromptInjection(hiddenElements);
  analyses.riskScore = calculateSEORiskScore(analyses);
  
  return analyses;
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    performProfessionalAnalysis,
    analyzeKeywordStuffing,
    analyzeHiddenLinks,
    analyzeTextDensity,
    detectMaliciousKeywords,
    detectPromptInjection,
    calculateSEORiskScore
  };
}
