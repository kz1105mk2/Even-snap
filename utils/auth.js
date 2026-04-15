function buildOAuthSetupErrorMessage(rawMessage) {
  if (!rawMessage) return '';

  const lower = rawMessage.toLowerCase();
  const isOAuthFailure =
    lower.includes('oauth2 request failed') ||
    lower.includes('invalid_client') ||
    lower.includes('invalid_request') ||
    lower.includes('redirect_uri_mismatch') ||
    lower.includes('bad client id');

  if (!isOAuthFailure) return '';

  const extensionId = chrome.runtime?.id || '(unknown)';
  const redirectUrl = chrome.identity?.getRedirectURL?.() || '(unknown)';

  return [
    'Google 認証の設定に不整合があります。',
    'Google Cloud Console で次の4点を確認してください。',
    `1) OAuth クライアント種別が「Chrome 拡張機能」`,
    `2) GCP の OAuth クライアント「アイテム ID」が拡張 ID（${extensionId}）と一致`,
    `3) OAuth クライアントが有効で削除されていない`,
    `4) manifest.json の oauth2.client_id が最新のクライアント ID`,
    '',
    `想定リダイレクトURL: ${redirectUrl}`,
    `詳細: ${rawMessage}`
  ].join('\n');
}

function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        const rawMessage = chrome.runtime.lastError.message || '認証エラー';
        const setupMessage = buildOAuthSetupErrorMessage(rawMessage);
        const error = new Error(setupMessage || rawMessage);
        if (setupMessage) {
          error.name = 'OAuthConfigError';
        }
        reject(error);
        return;
      }

      if (!token) {
        reject(new Error('トークンが取得できませんでした'));
        return;
      }

      resolve(token);
    });
  });
}

function removeCachedToken(token) {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

async function logout() {
  try {
    const token = await getAuthToken(false);
    if (token) {
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
      await removeCachedToken(token);
    }
  } catch (e) {
    // ignore
  }
}

export { getAuthToken, removeCachedToken, logout };
