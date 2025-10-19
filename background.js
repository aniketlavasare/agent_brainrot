chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  chrome.tabs
    .sendMessage(tab.id, { type: "AB_TOGGLE_AGENT" })
    .catch(async () => {
      // inject content.js if it's not there yet, then try again
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      chrome.tabs.sendMessage(tab.id, { type: "AB_TOGGLE_AGENT" }).catch(() => {});
    });
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "toggle-agent" || !tab?.id) return;
  chrome.tabs
    .sendMessage(tab.id, { type: "AB_TOGGLE_AGENT" })
    .catch(async () => {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      chrome.tabs.sendMessage(tab.id, { type: "AB_TOGGLE_AGENT" }).catch(() => {});
    });
});

