import { createContext, useContext, useState, ReactNode } from 'react'

export type Language = 'en' | 'es'

export interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>('en')

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Translation dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    // App Header
    'app.title': 'FirstAId',
    'app.subtitle': 'Emergency Guidance',
    
    // Landing Page
    'landing.title': 'FirstAId',
    'landing.description': 'Describe your medical situation and get clear, grounded first-aid guidance in seconds. {free} No account required.',
    'landing.free': 'Free.',
    'landing.input.label': 'Describe your medical situation',
    'landing.input.placeholder': "Describe your situation — e.g., 'my son burned his hand on the stove' or 'I have a small cut'",
    'landing.button': 'Get Help',
    'landing.button.analyzing': 'Analyzing…',
    
    // Trust Signals
    'trust.title': 'Trusted Sources',
    'trust.protocols': 'Grounded in NHS, MEDLINE, and Mayo Clinic protocols',
    'trust.privacy': 'No account, no tracking, no data stored',
    'trust.device': 'Works on any device, anywhere',
    
    // Character Count
    'input.chars.remaining': '{count} characters remaining',
    'input.chars.over': '{count} characters over limit',
    
    // Severity Levels
    'severity.self_care': 'Self-Care',
    'severity.urgent_care': 'Urgent Care',
    'severity.emergency': 'Emergency',
    'severity.level': 'Severity Level',
    
    // Steps
    'steps.title': 'First Aid Steps',
    
    // Care Actions
    'care.recommended': 'Recommended Action',
    'care.self_care': 'Self-care at home',
    'care.urgent_care': 'Seek urgent care within 1 hour',
    'care.emergency': 'Call emergency services now',
    
    // Emergency
    'emergency.call': 'Call 911',
    'emergency.call_now': 'Call Now',
    'emergency.tap_to_call': 'Tap to call 911',
    
    // Map
    'map.title': 'Nearby Facilities',
    'map.your_location': 'Your location',
    'map.open_now': 'Open now',
    'map.hours_unknown': 'Hours unknown',
    'map.get_directions': 'Get Directions',
    'map.away': 'away',
    'map.enable_location': 'Enable location to find nearby care facilities.',
    
    // Actions
    'action.start_over': 'Start over',
    'action.retry': 'Try Again',
    
    // Loading States
    'loading.analyzing': 'Analyzing your situation…',
    'loading.retrieving': 'Retrieving first-aid guidance. This takes a few seconds.',
    
    // Error States
    'error.title': 'Service temporarily unavailable',
    'error.unavailable': 'Service temporarily unavailable, please try again or call your local emergency number directly.',
    
    // Triage
    'triage.result': 'Triage Result',
    
    // Clarification
    'clarification.need_info': 'We need a bit more information',
    'clarification.original_description': 'Your original description',
    'clarification.your_answer': 'Your answer',
    'clarification.placeholder': 'Type your answer here…',
    'clarification.remaining': '{count} remaining',
    'clarification.over_limit': '{count} over limit',
    'clarification.submit': 'Submit Answer',
    'clarification.analyzing': 'Analyzing…',
    'clarification.submit_label': 'Submit your clarifying answer',
    
    // Out of Scope
    'out_of_scope.title': 'Unable to Provide Medical Guidance',
    'out_of_scope.message': 'I can only provide guidance for medical situations. For other questions, please try a different service.',
    'out_of_scope.emergency': 'If this is a medical emergency, call your local emergency number immediately.',
    
    // Disclaimer
    'disclaimer': 'Not medical advice. In an emergency, call your local emergency number directly.',
    
    // Language Selector
    'language.select': 'Language',
    'language.en': 'English',
    'language.es': 'Español',
    
    // Language Hint (shown in opposite language)
    'language.hint': '¿Hablas español? Puedes escribir en español o cambiar el idioma arriba.',
  },
  
  es: {
    // App Header
    'app.title': 'FirstAId',
    'app.subtitle': 'Guía de Emergencias',
    
    // Landing Page
    'landing.title': 'FirstAId',
    'landing.description': 'Describe su situación médica y obtenga orientación clara y fundamentada de primeros auxilios en segundos. {free} No se requiere cuenta.',
    'landing.free': 'Gratis.',
    'landing.input.label': 'Describe tu situación médica',
    'landing.input.placeholder': "Describe tu situación — ej., 'mi hijo se quemó la mano en la estufa' o 'tengo un corte pequeño'",
    'landing.button': 'Obtener Ayuda',
    'landing.button.analyzing': 'Analizando…',
    
    // Trust Signals
    'trust.title': 'Fuentes Confiables',
    'trust.protocols': 'Basado en protocolos de NHS, MEDLINE y Mayo Clinic',
    'trust.privacy': 'Sin cuenta, sin seguimiento, sin datos almacenados',
    'trust.device': 'Funciona en cualquier dispositivo, en cualquier lugar',
    
    // Character Count
    'input.chars.remaining': '{count} caracteres restantes',
    'input.chars.over': '{count} caracteres sobre el límite',
    
    // Severity Levels
    'severity.self_care': 'Autocuidado',
    'severity.urgent_care': 'Atención Urgente',
    'severity.emergency': 'Emergencia',
    'severity.level': 'Nivel de Gravedad',
    
    // Steps
    'steps.title': 'Pasos de Primeros Auxilios',
    
    // Care Actions
    'care.recommended': 'Acción Recomendada',
    'care.self_care': 'Autocuidado en casa',
    'care.urgent_care': 'Busque atención urgente dentro de 1 hora',
    'care.emergency': 'Llame a servicios de emergencia ahora',
    
    // Emergency
    'emergency.call': 'Llamar 911',
    'emergency.call_now': 'Llamar Ahora',
    'emergency.tap_to_call': 'Toca para llamar al 911',
    
    // Map
    'map.title': 'Instalaciones Cercanas',
    'map.your_location': 'Tu ubicación',
    'map.open_now': 'Abierto ahora',
    'map.hours_unknown': 'Horarios desconocidos',
    'map.get_directions': 'Obtener Direcciones',
    'map.away': 'de distancia',
    'map.enable_location': 'Habilite la ubicación para encontrar instalaciones de atención cercanas.',
    
    // Actions
    'action.start_over': 'Empezar de nuevo',
    'action.retry': 'Intentar de Nuevo',
    
    // Loading States
    'loading.analyzing': 'Analizando tu situación…',
    'loading.retrieving': 'Obteniendo orientación de primeros auxilios. Esto toma unos segundos.',
    
    // Error States
    'error.title': 'Servicio temporalmente no disponible',
    'error.unavailable': 'Servicio temporalmente no disponible, intente nuevamente o llame directamente a su número de emergencia local.',
    
    // Triage
    'triage.result': 'Resultado del Triaje',
    
    // Clarification
    'clarification.need_info': 'Necesitamos un poco más de información',
    'clarification.original_description': 'Tu descripción original',
    'clarification.your_answer': 'Tu respuesta',
    'clarification.placeholder': 'Escribe tu respuesta aquí…',
    'clarification.remaining': '{count} restantes',
    'clarification.over_limit': '{count} sobre el límite',
    'clarification.submit': 'Enviar Respuesta',
    'clarification.analyzing': 'Analizando…',
    'clarification.submit_label': 'Enviar tu respuesta aclaratoria',
    
    // Out of Scope
    'out_of_scope.title': 'No se Puede Proporcionar Orientación Médica',
    'out_of_scope.message': 'Solo puedo proporcionar orientación para situaciones médicas. Para otras preguntas, pruebe un servicio diferente.',
    'out_of_scope.emergency': 'Si esta es una emergencia médica, llame inmediatamente a su número de emergencia local.',
    
    // Disclaimer
    'disclaimer': 'No es consejo médico. En una emergencia, llame directamente a su número de emergencia local.',
    
    // Language Selector
    'language.select': 'Idioma',
    'language.en': 'English',
    'language.es': 'Español',
    
    // Language Hint (shown in opposite language)
    'language.hint': 'Do you speak English? You can type in English or change the language above.',
  },
}