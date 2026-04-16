import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useStore } from '../store/useStore'
import type { User } from '../types'

export function useAuth() {
  const user = useStore((s) => s.user)
  const accessToken = useStore((s) => s.accessToken)
  const setAuth = useStore((s) => s.setAuth)
  const logout = useStore((s) => s.logout)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        const currentToken = useStore.getState().accessToken
        setAuth(res.data as User, currentToken ?? '')
        setIsLoading(false)
      })
      .catch(() => {
        logout()
        navigate('/login', { replace: true })
        setIsLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    user,
    accessToken,
    isLoading,
    isAdmin: user?.role === 'ADMIN',
  }
}
