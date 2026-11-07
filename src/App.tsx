import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import {
  ApiError,
  getProfile,
  getSpecializations,
  login,
  logout,
  register,
  updateProfile,
  useLoading,
  type Specialization,
  type User,
} from './api'

type Page = 'home' | 'login' | 'register' | 'profile'

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'Неизвестная ошибка'
}

function fieldErrors(err: unknown): Record<string, string> {
  return err instanceof ApiError ? err.fieldErrors : {}
}

/* ---------------- ВХОД ---------------- */

function LoginForm({ onSuccess, onSwitch }: { onSuccess: (user: User) => void; onSwitch: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      onSuccess(await login(username.trim(), password))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="subtitle">WELCOME BACK</p>
        <h2>
          LOGIN<span>.</span>
        </h2>

        <form onSubmit={submit}>
          <label>Логин</label>
          <input
            type="text"
            placeholder="Введите логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label>Пароль</label>
          <input
            type="password"
            placeholder="Введите пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="form-error">{error}</p>}

          <button className="submit-btn" disabled={busy}>
            ВОЙТИ →
          </button>
        </form>

        <p className="switch">
          Нет аккаунта?
          <button onClick={onSwitch}>Регистрация</button>
        </p>
      </div>
    </section>
  )
}

/* ---------------- РЕГИСТРАЦИЯ ---------------- */

function RegisterForm({ onSuccess, onSwitch }: { onSuccess: (user: User) => void; onSwitch: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setErrors({})

    if (password !== password2) {
      setErrors({ password2: 'Пароли не совпадают' })
      return
    }

    setBusy(true)
    try {
      onSuccess(await register(username.trim(), password))
    } catch (err) {
      setErrors(fieldErrors(err))
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="subtitle">JOIN OUR COMMUNITY</p>
        <h2>
          CREATE
          <br />
          ACCOUNT<span>.</span>
        </h2>

        <form onSubmit={submit}>
          <label>Логин</label>
          <input
            type="text"
            placeholder="Придумайте логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {errors.username && <p className="field-error">{errors.username}</p>}

          <label>Пароль</label>
          <input
            type="password"
            placeholder="Придумайте пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {errors.password && <p className="field-error">{errors.password}</p>}

          <label>Повторите пароль</label>
          <input
            type="password"
            placeholder="Повторите пароль"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />
          {errors.password2 && <p className="field-error">{errors.password2}</p>}

          {error && <p className="form-error">{error}</p>}

          <button className="submit-btn" disabled={busy}>
            СОЗДАТЬ АККАУНТ →
          </button>
        </form>

        <p className="switch">
          Уже есть аккаунт?
          <button onClick={onSwitch}>Войти</button>
        </p>
      </div>
    </section>
  )
}

/* ---------------- ПРОФИЛЬ ---------------- */

function ProfilePage({ user, onUpdated, onToast }: { user: User; onUpdated: (u: User) => void; onToast: (m: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [specializations, setSpecializations] = useState<Specialization[]>([])

  const [firstName, setFirstName] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [bio, setBio] = useState('')
  const [fee, setFee] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // Список специализаций для выпадающего списка
  useEffect(() => {
    getSpecializations()
      .then(setSpecializations)
      .catch(() => setSpecializations([]))
  }, [])

  function startEdit() {
    setFirstName(user.profile.first_name ?? '')
    setSpecialization(user.profile.specialization ?? '')
    setBio(user.profile.bio ?? '')
    setFee(user.profile.fee ?? '')
    setError('')
    setErrors({})
    setEditing(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    setErrors({})

    if (fee !== '' && (Number.isNaN(Number(fee)) || Number(fee) < 0)) {
      setErrors({ fee: 'Введите число не меньше 0' })
      return
    }

    const payload: { first_name: string; specialization: string; bio: string; fee?: string } = {
      first_name: firstName.trim(),
      specialization,
      bio: bio.trim(),
    }
    if (fee !== '') payload.fee = fee

    setBusy(true)
    try {
      const updated = await updateProfile(payload)
      onUpdated(updated)
      onToast('Профиль сохранён')
      setEditing(false)
    } catch (err) {
      setErrors(fieldErrors(err))
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const p = user.profile
  const displayName = p.first_name || user.username

  // Если текущей специализации нет в списке — всё равно показываем её в селекте
  const options =
    specialization && !specializations.some((s) => s.value === specialization)
      ? [...specializations, { value: specialization, label: p.specialization_display || specialization }]
      : specializations

  return (
    <section className="auth-section">
      <div className="auth-card profile-card">
        <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
        <p className="subtitle">MY PROFILE</p>
        <h2>
          {displayName}
          <span>.</span>
        </h2>

        {!editing ? (
          <>
            <dl className="props">
              <dt>Логин</dt>
              <dd>@{user.username}</dd>
              <dt>Имя</dt>
              <dd>{p.first_name || <span className="muted">не указано</span>}</dd>
              <dt>Специализация</dt>
              <dd>{p.specialization_display || <span className="muted">не выбрана</span>}</dd>
              <dt>О себе</dt>
              <dd>{p.bio || <span className="muted">пока пусто</span>}</dd>
              <dt>Гонорар</dt>
              <dd>{p.fee ? p.fee : <span className="muted">не указан</span>}</dd>
            </dl>
            <button className="submit-btn" onClick={startEdit}>
              РЕДАКТИРОВАТЬ →
            </button>
          </>
        ) : (
          <form onSubmit={save}>
            <label>Имя</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            {errors.first_name && <p className="field-error">{errors.first_name}</p>}

            <label>Специализация</label>
            <select value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
              {options.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.specialization && <p className="field-error">{errors.specialization}</p>}

            <label>О себе</label>
            <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            {errors.bio && <p className="field-error">{errors.bio}</p>}

            <label>Гонорар</label>
            <input type="number" min="0" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
            {errors.fee && <p className="field-error">{errors.fee}</p>}

            {error && <p className="form-error">{error}</p>}

            <button className="submit-btn" disabled={busy}>
              СОХРАНИТЬ →
            </button>
            <button type="button" className="cancel-btn" onClick={() => setEditing(false)} disabled={busy}>
              Отмена
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

/* ---------------- ПРИЛОЖЕНИЕ ---------------- */

function App() {
  const [page, setPage] = useState<Page>('home')
  const [user, setUser] = useState<User | null>(null)
  const [toast, setToast] = useState('')
  const loading = useLoading()

  // При открытии сайта проверяем, есть ли уже сессия (cookie)
  useEffect(() => {
    getProfile()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  function handleAuth(u: User, message: string) {
    setUser(u)
    setPage('profile')
    showToast(message)
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // Даже если сервер не ответил — выходим на сайте
    }
    setUser(null)
    setPage('home')
    showToast('Вы вышли из системы')
  }

  function goToSection(id: string) {
    setPage('home')
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  // Защита страниц
  let current: Page = page
  if (current === 'profile' && !user) current = 'login'
  if ((current === 'login' || current === 'register') && user) current = 'profile'

  return (
    <div className="app">
      {/* ПЛАШКА ЗАГРУЗКИ */}
      <div className={`loader ${loading ? 'visible' : ''}`} role="status" aria-live="polite">
        <div className="loader-bar" />
        <div className="loader-badge">
          <span className="spinner" />
          Загрузка…
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {/* NAVBAR */}
      <header className="navbar">
        <div className="logo">
          VIBE<span>.</span>
        </div>

        <nav>
          <button onClick={() => setPage('home')}>Главная</button>
          <button onClick={() => goToSection('about')}>О группе</button>
          <button onClick={() => goToSection('music')}>Музыка</button>
        </nav>

        <div className="nav-buttons">
          {user ? (
            <>
              <button className="login-btn" onClick={() => setPage('profile')}>
                Профиль
              </button>
              <button className="register-btn" onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <button className="login-btn" onClick={() => setPage('login')}>
                Войти
              </button>
              <button className="register-btn" onClick={() => setPage('register')}>
                Регистрация
              </button>
            </>
          )}
        </div>
      </header>

      {/* HOME */}
      {current === 'home' && (
        <>
          <section className="hero">
            <div className="hero-content">
              <p className="subtitle">INDEPENDENT MUSIC BAND</p>

              <h1>
                FEEL THE
                <br />
                <span>VIBE.</span>
              </h1>

              <p className="description">
                Музыка — это больше, чем просто звук. Это эмоции, воспоминания и моменты, которые остаются с нами
                навсегда.
              </p>

              <button className="listen-btn" onClick={() => goToSection('music')}>
                Слушать музыку →
              </button>
            </div>

            <div className="hero-image">
              <div className="circle">
                <span>VIBE</span>
              </div>

              <div className="sticker">TURN IT UP!</div>
            </div>
          </section>

          <section className="about" id="about">
            <p className="subtitle">01 / ABOUT US</p>

            <h2>
              WE CREATE
              <br />
              <span>EMOTIONS.</span>
            </h2>

            <p>
              VIBE — музыкальная группа, которая объединяет разные музыкальные направления. Мы экспериментируем со
              звучанием и создаём музыку для каждого настроения.
            </p>
          </section>

          <section className="music" id="music">
            <p className="subtitle">02 / OUR MUSIC</p>

            <h2>
              OUR LATEST
              <br />
              <span>TRACKS.</span>
            </h2>

            <div className="tracks">
              <div className="track">
                <span>01</span>
                <h3>Midnight City</h3>
                <span>03:42</span>
                <span>▶</span>
              </div>

              <div className="track">
                <span>02</span>
                <h3>Lost in Sound</h3>
                <span>04:18</span>
                <span>▶</span>
              </div>

              <div className="track">
                <span>03</span>
                <h3>Feel Alive</h3>
                <span>03:56</span>
                <span>▶</span>
              </div>
            </div>
          </section>
        </>
      )}

      {current === 'login' && (
        <LoginForm onSuccess={(u) => handleAuth(u, 'Вы вошли в систему')} onSwitch={() => setPage('register')} />
      )}

      {current === 'register' && (
        <RegisterForm onSuccess={(u) => handleAuth(u, 'Аккаунт создан. Добро пожаловать!')} onSwitch={() => setPage('login')} />
      )}

      {current === 'profile' && user && <ProfilePage user={user} onUpdated={setUser} onToast={showToast} />}

      {/* FOOTER */}
      <footer>
        <div className="logo">
          VIBE<span>.</span>
        </div>
        <p>© 2026 VIBE MUSIC BAND</p>
        <p>MADE WITH MUSIC ♫</p>
      </footer>
    </div>
  )
}

export default App