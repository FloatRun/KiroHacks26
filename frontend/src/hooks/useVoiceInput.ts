import { useCallback, useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
  interface SpeechRecognitionInstance extends EventTarget {
    lang: string
    interimResults: boolean
    continuous: boolean
    maxAlternatives: number
    start(): void
    stop(): void
    abort(): void
    onresult: ((e: SpeechRecognitionResultEvent) => void) | null
    onend: (() => void) | null
    onerror: (() => void) | null
  }
  interface SpeechRecognitionResultEvent {
    results: SpeechRecognitionResultList
  }
}

const SpeechRecognitionCtor: (new () => SpeechRecognitionInstance) | null =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null)
    : null

// How long to wait after last speech before auto-stopping (ms)
const SILENCE_TIMEOUT_MS = 2500

interface UseVoiceInputResult {
  isSupported: boolean
  isListening: boolean
  startListening: () => void
  stopListening: () => void
}

export function useVoiceInput(
  onTranscript: (text: string) => void,
  onEnd?: () => void,
): UseVoiceInputResult {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isListening, setIsListening] = useState(false)
  const onEndRef = useRef(onEnd)
  useEffect(() => { onEndRef.current = onEnd }, [onEnd])

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
  }

  const scheduleSilenceStop = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop()
    }, SILENCE_TIMEOUT_MS)
  }, [])

  useEffect(() => {
    return () => {
      clearSilenceTimer()
      recognitionRef.current?.abort()
    }
  }, [])

  const startListening = useCallback(() => {
    if (!SpeechRecognitionCtor) return
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = true   // don't auto-stop on silence
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      const transcript = e.results[e.results.length - 1]?.[0]?.transcript ?? ''
      if (transcript) onTranscript(transcript)
      // Reset silence timer on each new result
      scheduleSilenceStop()
    }

    recognition.onend = () => {
      clearSilenceTimer()
      setIsListening(false)
      setTimeout(() => onEndRef.current?.(), 150)
    }

    recognition.onerror = () => {
      clearSilenceTimer()
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    // Timer starts only after first speech result — not immediately
  }, [onTranscript, scheduleSilenceStop])

  const stopListening = useCallback(() => {
    clearSilenceTimer()
    recognitionRef.current?.stop()
  }, [])

  return { isSupported: SpeechRecognitionCtor !== null, isListening, startListening, stopListening }
}
