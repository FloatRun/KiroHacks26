# FirstAid AI — Demo Script

**Target Time:** 90 seconds  
**Demo Order:** Clarification → Self-Care → Urgent Care + Map → Emergency + Map → Out-of-Scope

---

## Pre-Demo Setup (30 seconds before)

1. **Open CloudFront URL** in browser: https://d32xsl7uhmmecy.cloudfront.net/
2. **Grant location permission** when prompted (essential for scenarios 3-4)
3. **Open CloudWatch logs** in separate tab: `/aws/lambda/firstaid-ai-triage`
4. **Verify all systems**: Quick test with "hello" to confirm API is responding
5. **Have fallback screenshots** ready in case of live demo failure

**Judge Setup Note**: "I'll demonstrate 5 scenarios showing different severity levels and the safety mechanisms built into our RAG pipeline. Each scenario targets a specific user journey for underserved populations."

---

## Scenario 1: Clarification (20 seconds)

**Input:** `"I feel weird"`

**Expected Flow:**
- Submit query
- Clarification UI appears: "Where do you feel weird — chest, head, stomach, or somewhere else?"
- Original query shown as immutable label

**Follow-up:** `"chest pain and left arm hurts"`
- Submit clarification
- Proceeds to triage response (likely emergency)

**Key Points:**
- Demonstrates intelligent parsing
- Shows one-round clarification limit
- Concatenation strategy: original + clarification

---

## Scenario 2: Self-Care (15 seconds)

**Input:** `"I have a small paper cut on my finger"`

**Expected Result:**
- **Green banner** (`bg-green-500`)
- **Severity:** "Self-care"
- **Steps:** 3-5 imperative actions (≤120 chars each)
- **Care Tier:** "Self-care at home"
- **No emergency callout**
- **No map** (self-care doesn't need facilities)

**Key Points:**
- Demonstrates grounded retrieval from medical corpus
- Shows appropriate severity escalation (low)
- Clean, accessible UI with WCAG AAA contrast

---

## Scenario 3: Urgent Care + Map (20 seconds)

**Input:** `"my child burned their hand on the stove"`

**Expected Result:**
- **Yellow banner** (`bg-yellow-400`)
- **Severity:** "Urgent care"
- **Steps:** 3-5 burn-specific first aid steps
- **Care Tier:** "Seek urgent care within 1 hour"
- **Map appears** with urgent care facility pins
- **User location marker** (distinct from facility pins)

**Map Interaction:**
- Tap facility pin → popup with name + distance
- "Get Directions" button → opens Google Maps

**Key Points:**
- Pediatric context affects severity assessment
- Google Places API integration (urgent care keyword)
- Leaflet map with OpenStreetMap tiles (no API key needed)

---

## Scenario 4: Emergency + Map (20 seconds)

**Input:** `"adult is not breathing and unresponsive"`

**Expected Result:**
- **Red banner** (`bg-red-600`)
- **Severity:** "Emergency"
- **Steps:** CPR/emergency response steps
- **Care Tier:** "Call emergency services now"
- **Emergency callout:** "Call 911" (prominent)
- **Map appears** with hospital pins (type: hospital, larger radius)

**Key Points:**
- Highest severity level
- Emergency number callout (≥44×44px touch target)
- Hospital-specific facility search
- Over-escalation bias in formatter

---

## Scenario 5: Out-of-Scope (15 seconds)

**Input:** `"what is the best restaurant near me"`

**Expected Result:**
- **Out-of-scope refusal UI** (distinct from triage card)
- **No severity banner**
- **No steps list**
- **No map**
- Plain language message with emergency number suggestion

**Key Points:**
- Similarity threshold gate (< 0.5 score)
- Non-medical query detection
- Graceful degradation with safety net

---

## Technical Highlights (During Demo)

### Show CloudWatch Logs (30 seconds)
- **Point to reasoning field**: "This shows our LLM's medical reasoning, logged server-side"
- **Highlight grounding**: "Notice it references specific retrieved medical protocols"
- **Privacy protection**: "This reasoning is stripped from the client response"

### Architecture Deep-Dive (60 seconds)
- **Two-stage LLM Pipeline**: "Parser determines retrieve vs. clarify, Formatter structures the response"
- **Similarity Threshold Gate**: "Prevents hallucinated medical advice - if retrieval score <0.5, we refuse"
- **Serverless RAG**: "Bedrock Knowledge Base with curated medical corpus from NHS, CDC, Red Cross"
- **Safety Mechanisms**: "One clarification limit, over-escalation bias, out-of-scope detection"

### Kiro Development Story (45 seconds)
- **Spec-driven approach**: "Complete architecture designed before any coding"
- **Steering docs**: "Persistent context prevented system prompt regeneration"
- **Agent hooks**: "Automated build validation caught errors before deployment"
- **Zero integration bugs**: "Discriminator pattern and type safety from day one"

---

## Fallback Plan

If live demo fails:
1. **Screenshots** of each scenario result
2. **Screen recording** of full flow (backup video)
3. **CloudWatch logs** showing reasoning field
4. **Code walkthrough** of key components

---

## Post-Demo Q&A Points

### Social Good Alignment
- **Target users:** Uninsured, rural, non-native speakers, first-time caregivers
- **No barriers:** No accounts, no payment, no tracking
- **Fast response:** <5 second target for emergency situations
- **Grounded advice:** Medical corpus, not hallucinated content

### Technical Innovation
- **Discriminator pattern:** Type-safe API responses
- **Similarity threshold:** Prevents hallucinated medical advice
- **One-clarification limit:** Prevents conversation loops
- **Graceful degradation:** Every failure mode has a safe path

### Kiro Usage
- **Spec-driven development:** Complete architecture before coding
- **Steering docs:** Persistent context across sessions
- **Agent hooks:** Automated build-on-stop, pre-write diffs
- **MCP servers:** AWS docs, GitHub examples for accuracy
- **Vibe coding:** Generated complete modules from specs

**Total Demo Time:** ~90 seconds  
**Setup Buffer:** 30 seconds  
**Q&A Buffer:** 2-3 minutes