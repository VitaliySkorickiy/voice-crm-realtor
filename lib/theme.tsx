import React, { createContext, useContext, useState } from 'react';

export const COLORS_LIGHT = { background: '#FAFAFA', card: '#FFFFFF', surfaceMuted: '#F2F2F7', textPrimary: '#1A1A1A', textSecondary: '#8E8E93', textTertiary: '#B4B4BC', accent: '#0066FF', accentSoft: '#E8F0FF', border: '#E5E5EA', success: '#34C759', successSoft: '#E6F6EA', warning: '#FF9500', warningSoft: '#FFF4E5', error: '#FF3B30', errorSoft: '#FDEBEC', separator: '#F2F2F7', tabBar: '#FFFFFF' };
export const COLORS_DARK = { background: '#000000', card: '#1C1C1E', surfaceMuted: '#2C2C2E', textPrimary: '#FFFFFF', textSecondary: '#98989F', textTertiary: '#636366', accent: '#0A84FF', accentSoft: '#0A2E5C', border: '#38383A', success: '#32D74B', successSoft: '#0F2E18', warning: '#FF9F0A', warningSoft: '#3D2A08', error: '#FF453A', errorSoft: '#3D1412', separator: '#2C2C2E', tabBar: '#1C1C1E' };

export type AppColors = typeof COLORS_LIGHT;

const ThemeContext = createContext<any>({ isDark: false, toggleTheme: () => {}, colors: COLORS_LIGHT });
export function useTheme() { return useContext(ThemeContext); }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;
  return <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(p => !p), colors }}>{children}</ThemeContext.Provider>;
}
