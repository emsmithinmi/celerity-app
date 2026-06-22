import { createContext, useContext, useState, useEffect } from 'react'

const THEMES = [
  { id: 'catppuccin', label: 'Catppuccin' },
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'cobalt2', label: 'Cobalt2' },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'catppuccin')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'catppuccin') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
