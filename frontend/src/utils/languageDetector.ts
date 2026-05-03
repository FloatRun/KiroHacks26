/**
 * Simple language detection for Spanish vs English medical queries
 * Based on common Spanish medical terms and patterns
 */

// Common Spanish medical words and phrases
const spanishMedicalTerms = new Set([
  // Body parts
  'cabeza', 'brazo', 'pierna', 'mano', 'pie', 'pecho', 'espalda', 'estómago', 'corazón',
  // Symptoms  
  'duele', 'dolor', 'sangre', 'fiebre', 'mareo', 'náusea', 'vómito', 'tos',
  // Actions
  'quemé', 'quemó', 'corté', 'cortó', 'caí', 'cayó', 'golpeé', 'golpeó',
  // People
  'hijo', 'hija', 'niño', 'niña', 'bebé', 'esposo', 'esposa', 'madre', 'padre',
  // Common words
  'tengo', 'tiene', 'está', 'estoy', 'siento', 'siente', 'muy', 'mucho', 'poco',
  // Medical emergencies
  'emergencia', 'urgente', 'hospital', 'médico', 'ayuda'
])

// Spanish pronouns and articles that are strong indicators
const spanishIndicators = new Set([
  'mi', 'mis', 'su', 'sus', 'el', 'la', 'los', 'las', 'un', 'una', 'me', 'se', 'le'
])

// Spanish verb patterns (common endings)
const spanishVerbPatterns = [
  /\w+ó$/, // past tense: quemó, cortó, cayó
  /\w+é$/, // past tense: quemé, corté, caí  
  /\w+ando$/, // gerund: sangrando, doliendo
  /\w+iendo$/, // gerund: sintiendo
]

export type DetectedLanguage = 'en' | 'es' | 'unknown'

export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.trim().length < 3) {
    return 'unknown'
  }

  const words = text.toLowerCase()
    .replace(/[¿¡.,!?]/g, ' ') // Remove Spanish punctuation
    .split(/\s+/)
    .filter((word: string) => word.length > 1)

  let spanishScore = 0
  let totalWords = words.length

  // Check for Spanish medical terms
  words.forEach((word: string) => {
    if (spanishMedicalTerms.has(word)) {
      spanishScore += 3 // High weight for medical terms
    }
    if (spanishIndicators.has(word)) {
      spanishScore += 2 // Medium weight for indicators
    }
    // Check verb patterns
    if (spanishVerbPatterns.some(pattern => pattern.test(word))) {
      spanishScore += 1 // Lower weight for patterns
    }
  })

  // Check for Spanish-specific characters
  if (/[ñáéíóúü¿¡]/.test(text)) {
    spanishScore += 2
  }

  // Calculate confidence
  const confidence = spanishScore / Math.max(totalWords, 1)

  // Threshold for Spanish detection
  if (confidence >= 0.3 || spanishScore >= 2) {
    return 'es'
  }

  return 'en' // Default to English
}

// Test cases for validation
export const testCases = [
  // Spanish examples
  { text: "me duele la cabeza", expected: 'es' },
  { text: "mi hijo se quemó la mano", expected: 'es' },
  { text: "tengo dolor de estómago", expected: 'es' },
  { text: "se cortó el brazo", expected: 'es' },
  { text: "está sangrando mucho", expected: 'es' },
  
  // English examples  
  { text: "my head hurts", expected: 'en' },
  { text: "child burned hand on stove", expected: 'en' },
  { text: "I have stomach pain", expected: 'en' },
  { text: "cut my arm", expected: 'en' },
  { text: "bleeding a lot", expected: 'en' },
  
  // Edge cases
  { text: "help", expected: 'en' },
  { text: "ayuda", expected: 'es' },
  { text: "911", expected: 'en' },
]