// Chrome storage helpers — JWT persistence
// Implementation: Story 5.1

export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('jwt_token')
  return result.jwt_token ?? null
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ jwt_token: token })
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove('jwt_token')
}
