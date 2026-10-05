import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { TelegramWebApp, TelegramUser, TelegramThemeParams } from '../types/telegram';

interface TelegramContextType {
  webApp: TelegramWebApp | null;
  user: TelegramUser | null;
  initData: string | null;
  themeParams: TelegramThemeParams | null;
  isExpanded: boolean;
  expand: () => void;
  close: () => void;
  ready: () => void;
  hapticFeedback: TelegramWebApp['HapticFeedback'] | null;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  shareMessage: (text: string, url: string) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  isClosingConfirmationEnabled: boolean;
}

const TelegramContext = createContext<TelegramContextType | null>(null);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [themeParams, setThemeParams] = useState<TelegramThemeParams | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg) {
        console.warn('Telegram WebApp not available');
        return;
      }

      setWebApp(tg);
      setUser(tg.initDataUnsafe?.user || null);
      setInitData(tg.initData || null);
      setThemeParams(tg.themeParams || null);
      setIsExpanded(tg.isExpanded);

      tg.ready();

      if (!tg.isExpanded) {
        tg.expand();
        setIsExpanded(true);
      }

      document.body.className = `${tg.colorScheme || 'dark'}-theme`;

      if (tg.themeParams) {
        const root = document.documentElement;
        Object.entries(tg.themeParams).forEach(([key, value]) => {
          if (typeof value === 'string') {
            root.style.setProperty(`--tg-${key}`, value);
          }
        });
      }
    } catch (error) {
      console.warn('Telegram WebApp init failed:', error);
    }
  }, []);

  return (
    <TelegramContext.Provider value={{
      webApp,
      user,
      initData,
      themeParams,
      isExpanded,
      expand: () => webApp?.expand(),
      close: () => webApp?.close(),
      ready: () => webApp?.ready(),
      hapticFeedback: webApp?.HapticFeedback ?? null,
      openLink: (url: string) => webApp?.openLink?.(url),
      openTelegramLink: (url: string) => webApp?.openTelegramLink?.(url),
      shareMessage: (text: string, url: string) => webApp?.shareUrl?.(url, text),
      setHeaderColor: (color: string) => {
        if (webApp) {
          webApp.headerColor = color;
          webApp.postEvent?.('setHeaderColor', { color });
        }
      },
      setBackgroundColor: (color: string) => {
        if (webApp) {
          webApp.backgroundColor = color;
          webApp.postEvent?.('setBackgroundColor', { color });
        }
      },
      isClosingConfirmationEnabled: webApp?.isClosingConfirmationEnabled ?? false,
    }}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used inside TelegramProvider');
  }
  return context;
}
