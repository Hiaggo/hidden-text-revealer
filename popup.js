const toggleButton = document.getElementById('toggleButton');
const statusDiv = document.getElementById('status');

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function updateButtonState() {
  const tab = await getCurrentTab();
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "getStatus" });
    if (response && response.revealing) {
      toggleButton.textContent = 'Hide Revealed Text';
      toggleButton.classList.add('active');
      statusDiv.textContent = '✓ Revealing hidden text';
    } else {
      toggleButton.textContent = 'Reveal Hidden Text';
      toggleButton.classList.remove('active');
      statusDiv.textContent = 'Click to reveal';
    }
  } catch (error) {
    toggleButton.textContent = 'Reveal Hidden Text';
    toggleButton.classList.remove('active');
    statusDiv.textContent = 'Ready';
  }
}

toggleButton.addEventListener('click', async () => {
  const tab = await getCurrentTab();
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "toggleReveal" });
    if (response) {
      updateButtonState();
    }
  } catch (error) {
    statusDiv.textContent = '⚠ Please refresh the page';
  }
});

updateButtonState();
