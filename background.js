// Background service worker para gerenciar atalhos e badge

// Atalhos de teclado
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      if (command === "toggle-reveal") {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleReveal" });
      } else if (command === "toggle-drawer") {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleDrawer" });
      }
    }
  });
});

// Atualizar badge quando receber mensagem
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateBadge") {
    const count = request.count || 0;
    
    if (count > 0) {
      chrome.action.setBadgeText({ 
        text: count.toString(),
        tabId: sender.tab.id 
      });
      chrome.action.setBadgeBackgroundColor({ 
        color: "#FF5722",
        tabId: sender.tab.id
      });
    } else {
      chrome.action.setBadgeText({ 
        text: "",
        tabId: sender.tab.id 
      });
    }
    
    sendResponse({ success: true });
  }
  return true;
});
