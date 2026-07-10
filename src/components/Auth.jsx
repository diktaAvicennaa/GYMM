// src/components/Auth.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    
    // Validasi sederhana
    if (!email || !password) {
      alert('Email dan Password tidak boleh kosong!')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) alert(error.message)
    else alert('Login sukses! Selamat datang.')
    
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    
    // Validasi sederhana
    if (!email || !password) {
      alert('Email dan Password tidak boleh kosong!')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) alert(error.message)
    else alert('Akun berhasil dibuat! Silakan login.')
    
    setLoading(false)
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold justify-center mb-4">Gym Tracker Auth</h2>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input 
              type="email" 
              placeholder="email@contoh.com" 
              className="input input-bordered" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="input input-bordered" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-control mt-6 gap-2">
            <button 
              className="btn btn-primary" 
              onClick={handleLogin} 
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : 'Login'}
            </button>
            <button 
              className="btn btn-outline" 
              onClick={handleSignUp} 
              disabled={loading}
            >
              Daftar Akun
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}