chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: 'addToGoogleCalendar',
    title: 'EventSnap',
    contexts: ['selection', 'page', 'link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'addToGoogleCalendar') return;

  const selectedText = info.selectionText || '';
  const pageUrl = tab?.url || '';
  const pageTitle = tab?.title || '';

  const params = new URLSearchParams({
    text: selectedText,
    url: pageUrl,
    title: pageTitle
  });

  const popupWidth = 520;
  /* 仮の高さ。popup.js で実際のコンテンツに合わせて再設定する */
  const popupHeight = 480;

  chrome.windows.create({
    url: `popup/popup.html?${params.toString()}`,
    type: 'popup',
    width: popupWidth,
    height: popupHeight,
    focused: true
  });
});
