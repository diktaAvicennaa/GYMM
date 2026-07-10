// src/components/Auth.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Email dan Password tidak boleh kosong!' })
      return
    }

    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) setMessage({ type: 'error', text: error.message })
    else setMessage({ type: 'success', text: 'Login sukses! Selamat datang.' })

    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Email dan Password tidak boleh kosong!' })
      return
    }

    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) setMessage({ type: 'error', text: error.message })
    else setMessage({ type: 'success', text: 'Akun berhasil dibuat! Silakan login.' })

    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    if (isLogin) handleLogin(e)
    else handleSignUp(e)
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setMessage(null)
    setEmail('')
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-300 to-base-200 flex items-center justify-center p-4">
      <style>{`
        @keyframes lift {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(-3deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-4px) rotate(3deg); }
        }
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-lift { animation: lift 2s ease-in-out infinite; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>

      <div className="card w-full max-w-md bg-base-100 shadow-2xl animate-float">
        <div className="card-body p-8">
         {/* Header dengan Video Logo */}
<div className="text-center mb-6">
  <div className="relative w-24 h-24 mx-auto mb-4">
    <div className="absolute inset-0 rounded-full bg-primary animate-pulse-ring"></div>
    <div className="relative w-full h-full bg-primary/10 rounded-2xl flex items-center justify-center overflow-hidden animate-lift">
      <img
        src="https://muktvuvyrzhluxudxmog.supabase.co/storage/v1/object/public/ek/output-onlinegiftools.gif"
        autoPlay
        loop
        muted
        playsInline
        className="w-20 h-20 object-contain"
      />
    </div>
  </div>
            <h1 className="text-2xl font-bold text-base-content">Gym Tracker</h1>
            <p className="text-sm text-base-content/60 mt-1">
              {isLogin ? 'Masuk ke akun Anda' : 'Buat akun baru'}
            </p>
          </div>

          {/* Tabs */}
          <div className="tabs tabs-boxed bg-base-200 p-1 rounded-xl mb-6">
            <button 
              className={`tab flex-1 rounded-lg transition-all duration-200 ${isLogin ? 'tab-active bg-base-100 shadow-sm font-semibold' : 'text-base-content/60 hover:text-base-content'}`}
              onClick={() => !isLogin && toggleMode()}
            >
              Masuk
            </button>
            <button 
              className={`tab flex-1 rounded-lg transition-all duration-200 ${!isLogin ? 'tab-active bg-base-100 shadow-sm font-semibold' : 'text-base-content/60 hover:text-base-content'}`}
              onClick={() => isLogin && toggleMode()}
            >
              Daftar
            </button>
          </div>

          {/* Google Auth Button */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="btn btn-outline w-full gap-3 mb-4 hover:bg-base-200 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="font-medium">{isLogin ? 'Masuk' : 'Daftar'} dengan Google</span>
          </button>

          {/* Divider */}
          <div className="divider text-xs text-base-content/40 my-2">atau pakai email</div>

          {/* Message Alert */}
          {message && (
            <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} mb-4 py-3 animate-bounce`} style={{ animationDuration: '0.5s', animationIterationCount: '1' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {message.type === 'error' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-medium">Email</span>
              </label>
              <input 
                type="email" 
                placeholder="nama@email.com" 
                className="input input-bordered w-full focus:input-primary transition-all duration-200 hover:border-primary/50" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="input input-bordered w-full pr-12 focus:input-primary transition-all duration-200 hover:border-primary/50" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle hover:bg-primary/10 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className={`btn btn-primary w-full mt-6 transition-all duration-200 ${loading ? 'btn-disabled opacity-70' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Memproses...</span>
                </>
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? 'Masuk' : 'Daftar Akun'}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Footer Toggle */}
          <div className="text-center mt-6">
            <p className="text-sm text-base-content/60">
              {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
              <button 
                type="button"
                onClick={toggleMode}
                className="link link-primary font-semibold hover:link-hover transition-colors"
              >
                {isLogin ? 'Daftar sekarang' : 'Masuk'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}