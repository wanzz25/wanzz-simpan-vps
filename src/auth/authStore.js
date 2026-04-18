// ─── AUTH STORE ───────────────────────────────────────────────────────────────
// Each user has isolated localStorage keys → completely separate databases
// Admin (wanzz) can create/manage user accounts

const AUTH_KEY   = 'vpm_auth_v1'      // stores accounts list
const SESSION_KEY = 'vpm_session_v1'  // stores current session

// ─── DEFAULT ACCOUNTS ─────────────────────────────────────────────────────────
// Admin account pre-seeded. Never delete.
const DEFAULT_ACCOUNTS = [
  {
    id:       'user_admin_wanzz',
    username: 'wanzz',
    password: 'wanzz3369',
    role:     'admin',
    displayName: 'Wanz Admin',
    email:    'admin@vpsmaster.pro',
    avatar:   'W',
    color:    'linear-gradient(135deg,#ef4444,#dc2626)',
    createdAt: Date.now(),
    createdBy: 'system',
    active:   true,
  },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const hashPw = (pw) => btoa(encodeURIComponent(pw + '_vpm_salt_2024'))

export const getAccounts = () => {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (_) {}
  // First boot: seed default accounts
  saveAccounts(DEFAULT_ACCOUNTS)
  return DEFAULT_ACCOUNTS
}

export const saveAccounts = (accounts) => {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(accounts)) } catch (_) {}
}

// ─── SESSION ──────────────────────────────────────────────────────────────────
export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const sess = JSON.parse(raw)
      // Expire after 8 hours
      if (sess && Date.now() - sess.loginAt < 8 * 3600 * 1000) return sess
    }
  } catch (_) {}
  return null
}

export const setSession = (user) => {
  const sess = { ...user, loginAt: Date.now() }
  localStorage.setItem(SESSION_KEY, JSON.stringify(sess))
  return sess
}

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY)
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const login = (username, password) => {
  const accounts = getAccounts()
  const user = accounts.find(
    a => a.username.toLowerCase() === username.toLowerCase().trim() &&
         a.password === password &&
         a.active !== false
  )
  if (!user) return { ok: false, error: 'Username atau password salah.' }
  const sess = setSession(user)
  return { ok: true, user: sess }
}

// ─── USER MANAGEMENT (admin only) ─────────────────────────────────────────────
export const createUser = (adminUser, form) => {
  if (adminUser.role !== 'admin') return { ok: false, error: 'Akses ditolak.' }
  const accounts = getAccounts()
  const exists = accounts.find(a => a.username.toLowerCase() === form.username.toLowerCase().trim())
  if (exists) return { ok: false, error: 'Username sudah digunakan.' }
  if (!form.username || !form.password) return { ok: false, error: 'Username dan password wajib diisi.' }

  const initials = form.displayName
    ? form.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : form.username.slice(0, 2).toUpperCase()

  const colors = [
    'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#06b6d4,#0891b2)',
    'linear-gradient(135deg,#ec4899,#db2777)',
  ]
  const color = colors[accounts.length % colors.length]

  const newUser = {
    id:          `user_${form.username.toLowerCase()}_${Date.now()}`,
    username:    form.username.trim(),
    password:    form.password,
    role:        form.role || 'user',
    displayName: form.displayName || form.username,
    email:       form.email || `${form.username}@vpsmaster.pro`,
    avatar:      initials,
    color,
    createdAt:   Date.now(),
    createdBy:   adminUser.username,
    active:      true,
  }

  const updated = [...accounts, newUser]
  saveAccounts(updated)
  return { ok: true, user: newUser }
}

export const deleteUser = (adminUser, userId) => {
  if (adminUser.role !== 'admin') return { ok: false, error: 'Akses ditolak.' }
  if (userId === adminUser.id)    return { ok: false, error: 'Tidak dapat menghapus akun sendiri.' }
  const accounts = getAccounts().filter(a => a.id !== userId)
  saveAccounts(accounts)
  // Also clear their server data
  localStorage.removeItem(userStorageKey(userId))
  return { ok: true }
}

export const toggleUserActive = (adminUser, userId) => {
  if (adminUser.role !== 'admin') return { ok: false, error: 'Akses ditolak.' }
  const accounts = getAccounts().map(a =>
    a.id === userId ? { ...a, active: !a.active } : a
  )
  saveAccounts(accounts)
  return { ok: true }
}

export const updateUserPassword = (adminUser, userId, newPw) => {
  if (adminUser.role !== 'admin') return { ok: false, error: 'Akses ditolak.' }
  const accounts = getAccounts().map(a =>
    a.id === userId ? { ...a, password: newPw } : a
  )
  saveAccounts(accounts)
  return { ok: true }
}

// ─── PER-USER STORAGE KEY ─────────────────────────────────────────────────────
export const userStorageKey = (userId) => `vpm_servers_${userId}`
