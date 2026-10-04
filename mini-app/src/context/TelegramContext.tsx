import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initTelegramWebApp, TelegramWebApp } from '@telegram-apps/sdk';

interface TelegramContextType {
  webApp: TelegramWebApp | null;
  user: TelegramWebApp['initDataUnsafe']['user'] | null;
  themeParams: TelegramWebApp['themeParams'] | null;
  isExpanded: boolean;
  expand: () => void;
  close: () => void;
  ready: () => void;
  hapticFeedback: TelegramWebApp['hapticFeedback'];
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  shareMessage: (text: string, url: string) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  isClosingConfirmationEnabled: boolean;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
}

const TelegramContext = createContext<TelegramContextType | null>(null);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramWebApp['initDataUnsafe']['user'] | null>(null);
  const [themeParams, setThemeParams] = useState<TelegramWebApp['themeParams'] | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initTelegramWebApp();
        const tg = window.Telegram?.WebApp;
        
        if (tg) {
          setWebApp(tg);
          setUser(tg.initDataUnsafe?.user || null);
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
        }
      } catch (error) {
        console.warn('Telegram WebApp not available:', error);
      }
    };

    init();
  }, []);

  return (
    <TelegramContext.Provider value={{
      webApp,
      user,
      themeParams,
      isExpanded,
      expand: () => webApp?.expand(),
      close: () => webApp?.close(),
      ready: () => webApp?.ready(),
      hapticFeedback: webApp?.hapticFeedback,
      openLink: (url: string) => webApp?.openLink(url),
      openTelegramLink: (url: string) => webApp?.openTelegramLink(url),
      shareMessage: (text: string, url: string) => webApp?.shareMessage?.(text, url),
      setHeaderColor: (color: string) => webApp?.setHeaderColor(color),
      setBackgroundColor: (color: string) => webApp?.setBackgroundColor(color),
      isClosingConfirmationEnabled: webApp?.isClosingConfirmationEnabled || false,
      enableClosingConfirmation: () => webApp?.enableClosingConfirmation?.(),
      disableClosingConfirmation: () => webApp?.disableClosingConfirmation?.(),
    }}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
}