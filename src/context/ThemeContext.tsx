import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'

export type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = 'loyolas_theme'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      // ignore
    }
    return 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
      root.setAttribute('data-theme', 'dark')
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rec = await pb
          .collection('settings')
          .getFirstListItem('key="theme"')
          .catch(() => null)
        if (rec && active && (rec.value === 'light' || rec.value === 'dark')) {
          setThemeState(rec.value as Theme)
        }
      } catch {
        // silent fallback to localStorage
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    ;(async () => {
      try {
        const rec = await pb
          .collection('settings')
          .getFirstListItem('key="theme"')
          .catch(() => null)
        if (rec) {
          await pb.collection('settings').update(rec.id, { value: newTheme })
        } else {
          await pb.collection('settings').create({ key: 'theme', value: newTheme })
        }
      } catch (err) {
        console.warn('Não foi possível persistir o tema no servidor:', err)
      }
    })()
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
