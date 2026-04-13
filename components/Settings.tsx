
import React, { useState, useEffect } from 'react';
import { CloseIcon, SettingsIcon } from './Icons';
import { Theme } from '../types';

type CustomTheme = {
    '--color-primary': string;
    '--color-secondary': string;
    '--color-accent': string;
    '--color-text-primary': string;
    '--color-text-secondary': string;
}

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  customTheme: CustomTheme;
  setCustomTheme: React.Dispatch<React.SetStateAction<CustomTheme>>;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, theme, setTheme, fontSize, setFontSize, customTheme, setCustomTheme }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
      if (isOpen) {
          setApiKey(localStorage.getItem('ajinkya_gemini_api_key') || '');
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const themes: { id: Theme; name: string; colors: string[] }[] = [
    { id: 'ajinkya-dark', name: 'Ajinkya Dark', colors: ['#1e293b', '#334155', '#38bdf8'] },
    { id: 'light', name: 'Light', colors: ['#f8fafc', '#e2e8f0', '#3b82f6'] },
    { id: 'instagram', name: 'Instagram', colors: ['#fafafa', '#ffffff', '#e1306c'] },
  ];
  
  const handleCustomColorChange = (variable: keyof CustomTheme, value: string) => {
    setCustomTheme(prev => ({ ...prev, [variable]: value }));
  };
  
  const handleThemeSelect = (themeId: Theme) => {
    setTheme(themeId);
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setApiKey(val);
      if (val) localStorage.setItem('ajinkya_gemini_api_key', val);
      else localStorage.removeItem('ajinkya_gemini_api_key');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-primary rounded-lg shadow-xl w-full max-w-md flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-secondary">
          <h2 className="text-xl font-bold flex items-center gap-2"><SettingsIcon /> Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary" aria-label="Close settings"><CloseIcon /></button>
        </header>
        
        <main className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* API Key Section - Critical for Deploy */}
          <div className="bg-secondary/20 p-4 rounded-lg border border-accent/20">
              <label htmlFor="api-key" className="block text-sm font-bold text-accent mb-2">Google Gemini API Key</label>
              <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="Enter your Gemini API Key..."
                  className="w-full bg-primary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-text-primary"
              />
              <p className="text-[10px] text-text-secondary mt-2">
                  Required for AI features to work. Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-accent hover:underline">Google AI Studio</a>.
              </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 text-text-primary">Theme</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleThemeSelect(t.id)}
                  className={`p-4 rounded-md border-2 ${theme === t.id ? 'border-accent' : 'border-secondary'} hover:border-accent transition-colors`}
                >
                  <div className="flex justify-center space-x-2 mb-2">
                    {t.colors.map(c => <div key={c} className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: c }}></div>)}
                  </div>
                  <span className="text-sm text-text-secondary">{t.name}</span>
                </button>
              ))}
               <button
                  onClick={() => handleThemeSelect('custom')}
                  className={`p-4 rounded-md border-2 ${theme === 'custom' ? 'border-accent' : 'border-secondary'} hover:border-accent transition-colors`}
                >
                  <div className="flex justify-center items-center space-x-2 mb-2 h-6">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 shadow-sm"></div>
                  </div>
                  <span className="text-sm text-text-secondary">Custom</span>
                </button>
            </div>
          </div>
          
          {theme === 'custom' && (
            <div className="animate-fade-in">
                <h3 className="text-lg font-semibold mb-2 text-text-primary">Custom Colors</h3>
                <div className="p-4 bg-secondary rounded-md space-y-2 border border-white/5">
                    {Object.entries(customTheme).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                            <label htmlFor={key} className="text-sm capitalize text-text-secondary">{key.replace('--color-', '').replace('-', ' ')}</label>
                            <input
                                id={key}
                                type="color"
                                value={value}
                                onChange={(e) => handleCustomColorChange(key as keyof CustomTheme, e.target.value)}
                                className="w-10 h-8 p-0 bg-transparent border-none rounded-md cursor-pointer"
                                style={{'--color': value} as any}
                            />
                        </div>
                    ))}
                </div>
            </div>
          )}

          <div>
            <label htmlFor="font-size" className="block text-lg font-semibold mb-2 text-text-primary">
              Editor Font Size: <span className="text-accent">{fontSize}px</span>
            </label>
            <div className="flex items-center gap-4">
                <span className="text-xs">A</span>
                <input
                id="font-size"
                type="range"
                min="12"
                max="28"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <span className="text-xl">A</span>
            </div>
          </div>
        </main>

        <footer className="p-4 text-center border-t border-secondary bg-secondary/30 rounded-b-lg">
          <p className="text-xs text-text-secondary">Ajinkya Novel Helper v1.0.4</p>
        </footer>
      </div>
    </div>
  );
};

export default Settings;
