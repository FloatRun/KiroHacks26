import { useState } from 'react'
import { useLanguage, type Language } from '../contexts/LanguageContext'

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  const currentLanguage = languages.find(lang => lang.code === language)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('language.select')}
        className={[
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
          'bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm',
          'hover:bg-white hover:shadow-md transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1',
        ].join(' ')}
      >
        <span aria-hidden="true">{currentLanguage?.flag}</span>
        <span className="hidden sm:inline">{currentLanguage?.name}</span>
        <svg 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-white shadow-lg ring-1 ring-gray-200 overflow-hidden">
            <div className="py-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code)
                    setIsOpen(false)
                  }}
                  className={[
                    'flex w-full items-center gap-3 px-4 py-3 text-left text-sm',
                    'hover:bg-gray-50 transition-colors duration-150',
                    language === lang.code 
                      ? 'bg-red-50 text-red-700 font-semibold' 
                      : 'text-gray-700',
                  ].join(' ')}
                >
                  <span aria-hidden="true" className="text-lg">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {language === lang.code && (
                    <svg className="ml-auto h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}