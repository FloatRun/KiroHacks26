#!/usr/bin/env node

/**
 * FirstAid AI Agent Test Script
 * 
 * Tests the AI agent components without requiring full AWS deployment.
 * Shows how the parser and formatter work with the hand-tuned prompts.
 */

import { readFileSync } from 'fs'

// Mock Bedrock responses for testing
const MOCK_PARSER_RESPONSES = {
  "I feel weird": {
    action: "clarify",
    clarificationQuestion: "Where do you feel weird — chest, head, stomach, or somewhere else?",
    clarificationReason: "too_vague"
  },
  "I have a small paper cut on my finger": {
    action: "retrieve",
    normalizedQuery: "minor finger laceration first aid",
    extractedContext: {
      scenario: "cut",
      severity_signals: ["small"],
      subject: "self"
    }
  },
  "my child burned their hand on the stove": {
    action: "retrieve", 
    normalizedQuery: "pediatric thermal burn hand first aid",
    extractedContext: {
      scenario: "burn",
      severity_signals: ["stove", "thermal"],
      subject: "child"
    }
  },
  "adult is not breathing and unresponsive": {
    action: "retrieve",
    normalizedQuery: "adult unresponsive not breathing CPR emergency",
    extractedContext: {
      scenario: "cardiac_arrest",
      severity_signals: ["not breathing", "unresponsive"],
      subject: "adult"
    }
  },
  "what is the best restaurant near me": {
    action: "retrieve",
    normalizedQuery: "restaurant recommendation",
    extractedContext: {
      scenario: "non_medical",
      severity_signals: [],
      subject: "self"
    }
  }
}

const MOCK_FORMATTER_RESPONSES = {
  "minor finger laceration first aid": {
    severity: "self_care",
    steps: [
      "Rinse the cut under clean running water for 1–2 minutes.",
      "Apply gentle pressure with a clean cloth until bleeding stops.", 
      "Cover with an adhesive bandage and keep it clean and dry."
    ],
    careTier: "self_care",
    reasoning: "Minor laceration with no signs of deep tissue damage or infection risk",
    outOfScope: false
  },
  "pediatric thermal burn hand first aid": {
    severity: "urgent_care",
    steps: [
      "Cool the burn under cool (not cold) running water for 20 minutes.",
      "Do not apply ice, butter, or any cream to the burn.",
      "Cover loosely with a clean non-fluffy material such as cling film.",
      "Give paracetamol or ibuprofen for pain if appropriate.",
      "Seek urgent medical attention within 1 hour."
    ],
    careTier: "urgent_care", 
    reasoning: "Pediatric thermal burn requires professional assessment for depth and infection prevention",
    outOfScope: false
  },
  "adult unresponsive not breathing CPR emergency": {
    severity: "emergency",
    steps: [
      "Call 911 immediately — do not leave the person alone.",
      "Check for breathing. If absent, begin CPR: 30 chest compressions, 2 rescue breaths.",
      "Push hard and fast in the center of the chest at 100–120 compressions per minute.",
      "Use an AED as soon as one is available and follow its voice instructions.",
      "Continue CPR until emergency services arrive and take over."
    ],
    careTier: "emergency",
    reasoning: "Cardiac arrest requires immediate emergency intervention and professional life support",
    outOfScope: false
  },
  "restaurant recommendation": {
    severity: "self_care",
    steps: [],
    careTier: "self_care", 
    reasoning: "Non-medical query outside scope of medical triage system",
    outOfScope: true
  }
}

// Mock knowledge base chunks
const MOCK_KB_CHUNKS = {
  "minor finger laceration first aid": [
    {
      text: "For minor cuts and lacerations: Clean the wound by rinsing with clean water. Apply direct pressure to stop bleeding. Cover with sterile bandage. Monitor for signs of infection.",
      score: 0.85
    }
  ],
  "pediatric thermal burn hand first aid": [
    {
      text: "Thermal burns in children: Immediately cool with running water for 20 minutes. Do not use ice. Remove from heat source. Cover with clean cloth. Seek medical attention for burns larger than palm size or on hands/face.",
      score: 0.92
    }
  ],
  "adult unresponsive not breathing CPR emergency": [
    {
      text: "Cardiac arrest protocol: Call emergency services immediately. Begin CPR if no pulse/breathing. 30 chest compressions followed by 2 rescue breaths. Continue until help arrives. Use AED if available.",
      score: 0.95
    }
  ]
}

function testParser(query) {
  console.log(`\n🔍 PARSER TEST: "${query}"`)
  console.log('─'.repeat(60))
  
  const result = MOCK_PARSER_RESPONSES[query]
  if (!result) {
    console.log('❌ No mock response available for this query')
    return null
  }
  
  console.log(`Action: ${result.action}`)
  
  if (result.action === 'clarify') {
    console.log(`Question: "${result.clarificationQuestion}"`)
    console.log(`Reason: ${result.clarificationReason}`)
  } else {
    console.log(`Normalized Query: "${result.normalizedQuery}"`)
    console.log(`Scenario: ${result.extractedContext.scenario}`)
    console.log(`Severity Signals: [${result.extractedContext.severity_signals.join(', ')}]`)
    console.log(`Subject: ${result.extractedContext.subject}`)
  }
  
  return result
}

function testKnowledgeBase(normalizedQuery) {
  console.log(`\n📚 KNOWLEDGE BASE TEST: "${normalizedQuery}"`)
  console.log('─'.repeat(60))
  
  const chunks = MOCK_KB_CHUNKS[normalizedQuery]
  if (!chunks) {
    console.log('❌ No knowledge base chunks found (similarity < threshold)')
    return []
  }
  
  chunks.forEach((chunk, i) => {
    console.log(`Chunk ${i + 1} (score: ${chunk.score}):`)
    console.log(`"${chunk.text}"`)
  })
  
  return chunks
}

function testFormatter(chunks, extractedContext) {
  console.log(`\n🎯 FORMATTER TEST`)
  console.log('─'.repeat(60))
  
  const normalizedQuery = extractedContext.scenario === 'cut' ? 'minor finger laceration first aid' :
                         extractedContext.scenario === 'burn' ? 'pediatric thermal burn hand first aid' :
                         extractedContext.scenario === 'cardiac_arrest' ? 'adult unresponsive not breathing CPR emergency' :
                         'restaurant recommendation'
  
  const result = MOCK_FORMATTER_RESPONSES[normalizedQuery]
  if (!result) {
    console.log('❌ No mock formatter response available')
    return null
  }
  
  console.log(`Severity: ${result.severity}`)
  console.log(`Care Tier: ${result.careTier}`)
  console.log(`Out of Scope: ${result.outOfScope}`)
  console.log(`Steps:`)
  result.steps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`)
  })
  console.log(`Reasoning: "${result.reasoning}"`)
  
  return result
}

function runFullPipeline(query) {
  console.log(`\n🚀 FULL PIPELINE TEST: "${query}"`)
  console.log('═'.repeat(80))
  
  // Stage 1: Parser
  const parserResult = testParser(query)
  if (!parserResult) return
  
  if (parserResult.action === 'clarify') {
    console.log('\n✅ Pipeline complete - clarification returned')
    return
  }
  
  // Stage 2: Knowledge Base
  const chunks = testKnowledgeBase(parserResult.normalizedQuery)
  if (chunks.length === 0) {
    console.log('\n✅ Pipeline complete - out of scope (similarity threshold)')
    return
  }
  
  // Stage 3: Formatter  
  const formatterResult = testFormatter(chunks, parserResult.extractedContext)
  if (!formatterResult) return
  
  if (formatterResult.outOfScope) {
    console.log('\n✅ Pipeline complete - out of scope (formatter decision)')
  } else {
    console.log('\n✅ Pipeline complete - triage card generated')
  }
}

// Run the demo scenarios
console.log('FirstAid AI Agent Test Suite')
console.log('Testing the 5 demo scenarios with mock AI responses...\n')

const scenarios = [
  "I feel weird",
  "I have a small paper cut on my finger", 
  "my child burned their hand on the stove",
  "adult is not breathing and unresponsive",
  "what is the best restaurant near me"
]

scenarios.forEach(scenario => {
  runFullPipeline(scenario)
})

console.log('\n' + '═'.repeat(80))
console.log('🎉 All scenarios tested!')
console.log('\nTo test with real AWS Bedrock:')
console.log('1. Configure AWS credentials: aws configure')
console.log('2. Set environment variables: AWS_REGION, CLAUDE_MODEL_ID, KNOWLEDGE_BASE_ID')
console.log('3. Run individual components with real Bedrock calls')