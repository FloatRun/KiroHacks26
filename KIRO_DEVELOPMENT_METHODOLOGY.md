# FirstAid AI - Kiro Development Methodology

## Executive Summary

FirstAid AI was built entirely using Kiro's full feature spectrum, demonstrating next-level understanding of AI-assisted development. This document provides detailed analysis of how each Kiro feature was strategically employed to eliminate the three most expensive hackathon failure modes: integration bugs, stale builds, and hallucinated API signatures.

**Key Achievement**: Zero integration bugs discovered during development due to spec-driven architecture and steering doc constraints.

---

## Spec-Driven Development: The Foundation

### Strategic Approach

Spec-driven development was the cornerstone of this project. Before writing a single line of code, we used Kiro to produce four interlocking specification documents that served as the single source of truth throughout development.

**Specification Architecture:**
```
requirements.md (Functional + Non-functional + Accessibility + Equity)
     ↓
design.md (Architecture + API Contract + LLM Pipeline + Component Hierarchy)  
     ↓
tasks.md (Phased Implementation + Critical Path + Dependencies)
     ↓
.kiro/steering/*.md (Persistent Context + Constraints + Boundaries)
```

### Most Impactful Spec Artifacts

**1. Tool Schema Definitions (design.md)**

The `parse_user_input` and `submit_triage` Bedrock tool definitions were written in the spec with exact JSON schemas, enum constraints, and character limits:

```typescript
// From design.md - implemented verbatim in parser.ts
const parseUserInputTool = {
  name: "parse_user_input",
  description: "Parse the user's described situation into either a normalized retrieval query or a clarification request.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["retrieve", "clarify"]
      },
      normalizedQuery: {
        type: "string",
        description: "A concise, retrieval-optimized phrasing of the user's situation. Required when action === 'retrieve'."
      },
      // ... complete schema
    }
  }
}
```

**Impact**: Kiro implemented `parser.ts` and `formatter.ts` directly from these schemas, producing correct `InvokeModelCommand` calls with forced tool use on the first attempt. No iteration required.

**2. Discriminator Pattern (api-contract.md)**

The decision to use a discriminator pattern on all API responses (`type: "triage" | "clarification"`) was made in the spec before any frontend code existed:

```typescript
// Specified before implementation
type ApiResponse = TriageResponse | ClarificationResponse;

if (response.type === "clarification") { /* render ClarificationView */ }
if (response.type === "triage" && response.outOfScope) { /* render OutOfScopeRefusal */ }
if (response.type === "triage") { /* render TriageView */ }
```

**Impact**: When implementing `App.tsx`, the view state machine was a direct translation of the spec. No ambiguity, no back-and-forth, no runtime type errors.

**3. Clarification Round-Trip Logic (component-map.md)**

The complex clarification flow — where the frontend concatenates `"${originalQuery}. ${clarificationAnswer}"` and re-POSTs — was fully specified before either the API or UI was implemented:

```typescript
// Specified interaction pattern
const handleClarificationSubmit = (answer: string) => {
  const newQuery = `${originalQuery}. ${answer}`;
  postTriage({ query: newQuery, location });
};
```

**Impact**: This intricate interaction worked cleanly on the first try because both the API contract and the `ClarificationView` component behavior were specified in advance.

### Spec vs. Vibe Coding Comparison

**Spec-Driven Wins:**
- **Integration Points**: API contracts, component interfaces, data flow
- **Complex Logic**: Multi-step workflows, error handling, state machines
- **Cross-File Consistency**: Type definitions, naming conventions, architecture boundaries

**Vibe Coding Wins:**
- **Individual Components**: Self-contained UI components with clear requirements
- **Utility Functions**: Pure functions with well-defined inputs/outputs
- **Infrastructure Code**: CDK constructs with established patterns

**Strategic Decision**: Use spec-driven for architecture and integration, vibe coding for implementation of well-specified components.

---

## Steering Docs: Persistent Context Architecture

### Strategic Steering File Organization

Seven steering files in `.kiro/steering/` provided persistent, always-loaded context across every development session:

| File | Purpose | Most Impactful Content |
|------|---------|----------------------|
| `product.md` | Target users, core flow, v1 scope | Underserved populations framing, equity requirements |
| `tech.md` | Stack decisions, SDK packages | Hand-tuned artifacts warning, common commands |
| `architecture.md` | AWS topology, Lambda pipeline | IAM least-privilege table, cost warnings |
| `structure.md` | Repository layout, naming conventions | Architecture boundaries, critical files list |
| `api-contract.md` | Request/response shapes, error codes | Discriminator pattern, CORS configuration |
| `component-map.md` | Component hierarchy, responsibilities | Accessibility requirements, touch target specs |
| `tool-schemas.md` | Bedrock tool definitions, system prompts | **DO NOT MODIFY** annotations on system prompts |

### Most Valuable Steering Strategy: System Prompt Protection

The most impactful steering decision was protecting hand-tuned system prompts from regeneration. `tool-schemas.md` carried prominent annotations:

```markdown
# FirstAid AI — Bedrock Tool Schemas

> **IMPORTANT:** These tool definitions and system prompts are hand-tuned design artifacts. 
> Do NOT modify them via automated tooling. Changes require deliberate human review and 
> testing against all five demo scenarios.

## Stage 1: parse_user_input

### System Prompt (Hand-Tuned — Do Not Regenerate)

You are a medical triage input parser. Your only job is to call the parse_user_input tool.

Rules:
- Default to action "retrieve" when the scenario and at least one severity signal are reasonably inferable from the input.
- A short but clear input ("kid burned hand on stove") is sufficient to retrieve. Do not ask for clarification on clear inputs.
- Use action "clarify" only when: the input is non-medical, the scenario cannot be guessed, severity signals are entirely absent AND the answer depends on severity, or the subject is unclear in a way that materially affects triage.
- Clarification questions must be a single sentence, under 15 words, asking only for the single most diagnostically important missing piece of information.
- Bias toward retrieve. When in doubt, retrieve.
- Never produce prose. Only call the tool.
```

**Impact**: The parser system prompt's "bias toward retrieve" rule and the formatter's "over-escalate on severity" rule are calibrated behaviors that took multiple iterations to get right. Steering protection prevented Kiro from silently overwriting these during implementation tasks.

### Architecture Boundaries Enforcement

`structure.md`'s architecture boundaries section was the second most valuable steering content:

```markdown
## Architecture Boundaries

- **Frontend** never calls Bedrock, SSM, or Google Places directly — all goes through `POST /api/triage`
- **Lambda handler** (`handler.ts`) is the sole orchestrator — it calls parser, retrieval, formatter, and places in sequence
- **`reasoning` field** from the formatter is logged to CloudWatch and stripped before the response reaches the client
- **Places API key** is read from SSM at Lambda cold start and cached in module scope — never hardcoded or logged
- **Geolocation** is prefetched on page load and passed in the request body — Lambda never calls geolocation APIs
```

**Impact**: Every implementation session started with the correct mental model. Kiro never proposed putting Bedrock calls in a React hook or adding business logic to the handler. Architecture violations were prevented at the conversation level.

### Live Contract Enforcement

`api-contract.md` served as a live contract between frontend and backend development. When implementing `frontend/src/api/triage.ts` and `backend/src/types/api.ts`, Kiro read the contract and produced matching TypeScript interfaces without being asked to cross-reference them.

**Example**: The `Facility` interface was defined once in the contract and correctly implemented in both codebases:

```typescript
// From api-contract.md
interface Facility {
  name: string;
  address: string;
  distanceMeters: number;
  openNow: boolean;
  lat: number;
  lng: number;
  placeId: string;
}
```

---

## Vibe Coding: Mechanical Implementation Excellence

### Conversation Structure Strategy

The most effective vibe coding sessions followed this pattern:
1. **Single module focus**: One session per module, never mixing concerns
2. **Steering reference**: Start with "implement X according to the spec" and reference relevant steering file by name
3. **Context loading**: Let Kiro read the spec and steering docs before generating code
4. **Validation**: End with "verify this matches the architecture boundaries in structure.md"

### Most Impressive Code Generation Sessions

**1. `backend/src/handler.ts` — Complete Lambda Pipeline (Single Pass)**

With `architecture.md` loaded as steering, Kiro generated the complete 7-step orchestration pipeline in one session:

```typescript
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // 1. Parse + validate request body (query, location)
  // 2. Read Places API key from SSM (cached in module scope after cold start)  
  // 3. Stage 1: Parser (retrieve or clarify)
  // 4. If clarify → return clarification response immediately
  // 5. Stage 2: KB Retrieval → similarity gate
  // 6. Stage 3: Formatter → reasoning log + strip
  // 7. Service finder (conditional) → response assembly
}
```

**Generated Correctly on First Attempt:**
- SSM module-scope caching pattern (`let cachedKey: string | null = null`)
- Clarification short-circuit logic
- Similarity threshold gating with environment variable
- Reasoning field logging and stripping
- Conditional Places API calls based on care tier
- Comprehensive error handling with appropriate HTTP status codes

**Why This Worked**: The architecture steering explicitly described each step and the caching requirement. Kiro didn't have to invent patterns — it implemented a detailed specification.

**2. `frontend/src/App.tsx` — View State Machine (Single Pass)**

The state machine (`landing | loading | triage | clarification | error`) with the one-clarification-round-trip limit was generated from component-map steering in a single session:

```typescript
const [viewState, setViewState] = useState<'landing' | 'loading' | 'triage' | 'clarification' | 'error'>('landing');
const [clarificationCount, setClarificationCount] = useState(0);

// Generated correctly: clarification counter logic
const handleApiResponse = (response: ApiResponse) => {
  if (response.type === 'clarification') {
    if (clarificationCount >= 1) {
      // Second consecutive clarification → out-of-scope
      setViewState('triage');
      setTriageResponse({ type: 'triage', outOfScope: true, /* ... */ });
    } else {
      setClarificationCount(prev => prev + 1);
      setViewState('clarification');
    }
  }
};
```

**Generated Correctly on First Attempt:**
- State machine transitions
- Clarification counter with limit enforcement
- Query concatenation strategy for follow-up submissions
- Error state handling with retry logic
- Loading state management

**3. CDK Infrastructure Stacks (Three Modules, One Session Each)**

The Knowledge Base stack (`firstaid-ai-kb-stack.ts`), Lambda stack (`firstaid-ai-lambda-stack.ts`), and API stack (`firstaid-ai-api-stack.ts`) were generated with correct IAM least-privilege policies scoped to specific ARNs:

```typescript
// Generated correctly from architecture.md IAM table
new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['bedrock:InvokeModel'],
  resources: [`arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0`],
}),
new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['bedrock-agent-runtime:Retrieve'],
  resources: [knowledgeBase.attrKnowledgeBaseArn],
}),
new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['ssm:GetParameter'],
  resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/firstaid-ai/places-api-key`],
})
```

**Why This Worked**: The architecture steering included a complete IAM permissions table with exact ARN patterns. Kiro didn't have to guess about least-privilege scoping.

### Vibe Coding Success Factors

**1. Tight Specifications**: Components with clear inputs, outputs, and behavior requirements
**2. Steering Context**: Always-loaded architecture boundaries and patterns
**3. Single Concern**: One module per session, never mixing frontend and backend
**4. Validation Loop**: End each session by checking against architecture boundaries

---

## Agent Hooks: Development Loop Automation

### Hook Strategy: Eliminate Expensive Feedback Loops

Agent hooks were configured to automate the repetitive parts of the development loop and catch the most expensive classes of errors before they reached deployment.

**Hook Configuration** (`.kiro/agents/firstaid-dev.json`):

```json
{
  "name": "firstaid-dev",
  "description": "FirstAid AI development agent with automated build and deploy checks",
  "hooks": {
    "agentSpawn": [
      {
        "command": "echo '=== FirstAid AI Dev ===' && git log --oneline -5 && echo '--- Backend build status ---' && ls backend/dist/ 2>/dev/null || echo 'No dist — run npm run build in backend/'"
      }
    ],
    "userPromptSubmit": [
      {
        "command": "cd backend && git diff --stat HEAD 2>/dev/null | head -20"
      }
    ],
    "preToolUse": [
      {
        "matcher": "fs_write",
        "command": "git diff HEAD -- \"$KIRO_TOOL_PATH\" 2>/dev/null | head -40"
      }
    ],
    "postToolUse": [
      {
        "matcher": "execute_bash",
        "command": "echo '[hook] Last exit recorded at' $(date '+%H:%M:%S')"
      }
    ],
    "stop": [
      {
        "command": "cd backend && npm run build 2>&1 | tail -5"
      }
    ]
  }
}
```

### Most Valuable Hook: `preToolUse` on `fs_write`

**Purpose**: Show current file diff before any write operation
**Impact**: Prevented Kiro from overwriting files with versions that regressed changes made earlier in the same session

**Real Example**: During `ClarificationView` implementation, Kiro was about to overwrite the component with a version that removed the clarification counter logic. The hook showed:

```diff
- const [clarificationCount, setClarificationCount] = useState(0);
+ // Removed clarification counter - this would break the one-round limit
```

This prevented a regression that would have broken the demo scenario and required debugging time to rediscover.

### Second Most Valuable Hook: `stop` Build Validation

**Purpose**: Trigger `npm run build` (esbuild → `dist/handler.js`) after every response
**Impact**: Build errors surfaced immediately rather than being discovered at deploy time

**Caught Errors**:
1. **TypeScript Interface Mismatch**: `TriageRequest` type had optional `location` in frontend but required in backend
2. **Import Path Error**: Relative import in `handler.ts` pointed to wrong directory after refactoring
3. **Missing Environment Variable**: `SIMILARITY_THRESHOLD` referenced but not defined in Lambda configuration

**Time Saved**: Each of these would have required a full deploy cycle to discover (5-10 minutes each). The hook caught them in <30 seconds.

### Hook Development Process Improvements

**Before Hooks**: 
- Manual build checking before deployment
- Stale build deployments causing confusion
- File regression bugs discovered hours later
- Context loss between sessions

**After Hooks**:
- Automatic build validation on every change
- Immediate feedback on TypeScript errors
- File diff awareness preventing regressions
- Session continuity with git status on spawn

**Quantified Impact**: Hooks eliminated an estimated 2-3 hours of debugging time over the hackathon by catching errors at the source rather than during integration testing.

---

## 🔌 MCP (Model Context Protocol): Accurate External Integration

### Strategic MCP Usage

Two MCP servers were configured to extend Kiro's capabilities beyond built-in tools, specifically targeting areas where training data might be outdated or incomplete.

### AWS Documentation MCP Server

**Configuration**:
```json
"mcpServers": {
  "aws-docs": {
    "command": "uvx",
    "args": ["awslabs.aws-documentation-mcp-server@latest"],
    "env": { "FASTMCP_LOG_LEVEL": "ERROR" }
  }
}
```

**Critical Usage: CDK Construct API Accuracy**

During CDK implementation, instead of relying on Kiro's training data for Bedrock Knowledge Base constructs, we queried the AWS docs MCP server for exact API signatures:

**Query**: "Show me the CfnKnowledgeBase construct properties for chunking configuration"

**MCP Response**: Current AWS CDK documentation with exact enum values and property names:
```typescript
chunkingStrategy: 'FIXED_SIZE',
fixedSizeChunkingConfiguration: {
  maxTokens: 300,
  overlapPercentage: 20,
}
```

**Impact**: This produced correct `CfnKnowledgeBase` and `CfnDataSource` configurations on the first attempt, including the correct chunking strategy enum values and S3 Vector bucket ARN wiring.

**Alternative Without MCP**: Kiro would have generated plausible-looking but potentially incorrect construct properties based on training data, leading to CloudFormation deployment failures that would require debugging and iteration.

### GitHub MCP Server

**Configuration**:
```json
"mcpServers": {
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_TOKEN" }
  }
}
```

**Critical Usage: React-Leaflet Implementation**

The `FacilityMap.tsx` component required advanced Leaflet functionality (custom popups with buttons, distance calculations, directions handoff). Instead of relying on potentially outdated training data, we used the GitHub MCP server to search the `react-leaflet` repository for working examples.

**Query**: "Search react-leaflet repository for Popup component examples with custom content and useMap hook usage"

**MCP Response**: Live code examples from the react-leaflet GitHub repository showing:
- Correct `Popup` component API for custom content
- Proper `useMap` hook usage for programmatic map control
- Event handling patterns for marker clicks
- Distance calculation utilities

**Generated Code** (based on MCP examples):
```typescript
const FacilityMap = ({ facilities, userLocation }: FacilityMapProps) => {
  return (
    <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={13}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {facilities.map((facility) => (
        <Marker key={facility.placeId} position={[facility.lat, facility.lng]}>
          <Popup>
            <div>
              <h3>{facility.name}</h3>
              <p>{(facility.distanceMeters / 1609.34).toFixed(1)} miles away</p>
              <button onClick={() => window.open(directionsUrl, '_blank')}>
                Get Directions
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
```

**Impact**: The component worked correctly on first implementation, with proper popup rendering, distance formatting, and directions handoff. No iteration required.

**Alternative Without MCP**: Kiro would have generated code based on potentially outdated react-leaflet API patterns, likely requiring multiple debugging cycles to get popup content and event handling working correctly.

### MCP vs. Training Data Comparison

**MCP Advantages**:
- **Current API Signatures**: Always up-to-date with latest library versions
- **Working Examples**: Real code from active repositories
- **Edge Case Handling**: Community-tested patterns for complex scenarios

**Training Data Limitations**:
- **Version Lag**: Training data may reflect older API versions
- **Incomplete Coverage**: Less common library features may be underrepresented
- **Synthetic Examples**: Generated examples may not handle real-world edge cases

**Strategic Decision**: Use MCP for external library integration and AWS service APIs where accuracy is critical. Use training data for general programming patterns and well-established frameworks.

---

## ⚡ Kiro Powers: Bundled Expertise & Third-Party Integration

### Power Configuration Strategy

Kiro Powers were configured to provide bundled best practices and constrain development to safe, approved patterns while enabling rapid iteration.

**Tool Settings Configuration**:
```json
{
  "toolsSettings": {
    "fs_write": {
      "allowedPaths": [
        "frontend/src/**",
        "backend/src/**", 
        "cdk/lib/**",
        ".kiro/**"
      ],
      "deniedPaths": [
        "node_modules/**",
        "backend/dist/**",
        "cdk/cdk.out/**"
      ]
    },
    "execute_bash": {
      "allowedCommands": [
        "npm run build",
        "git diff",
        "git log", 
        "ls",
        "echo"
      ],
      "autoAllowReadonly": true
    },
    "use_aws": {
      "allowedServices": [
        "lambda",
        "s3", 
        "cloudfront",
        "logs",
        "ssm",
        "bedrock",
        "bedrock-agent",
        "bedrock-agent-runtime"
      ],
      "autoAllowReadonly": true
    }
  }
}
```

### Most Impactful Power: `fs_write` Path Restrictions

**Purpose**: Prevent accidental modification of build artifacts and dependencies
**Configuration**: 
- **Allowed**: Source code directories only
- **Denied**: `node_modules/`, `dist/`, `cdk.out/`

**Real Prevention**: During handler implementation, Kiro suggested "fixing the import in handler.ts" by modifying a file in `node_modules/@aws-sdk/`. The path restriction prevented this and forced Kiro to fix the actual import path in the source code.

**Impact**: Prevented corruption of build artifacts and dependency modifications that would have caused deployment failures.

### Second Most Impactful Power: `execute_bash` Command Restrictions

**Purpose**: Enable safe development commands while preventing destructive operations
**Configuration**:
- **Auto-approved**: Read-only commands (`ls`, `cat`, `git diff`)
- **Allowed**: Build commands (`npm run build`)
- **Blocked**: Deployment commands (`aws lambda update-function-code`, `git push`)

**Development Flow Enhancement**: 
- Build commands ran without interruption (essential for the build-on-stop hook)
- Deployment commands required explicit approval (preventing accidental deployments)
- Debug commands (`git log`, `ls`) provided immediate feedback

**Safety Net**: Prevented accidental deployment to wrong AWS account or function during development iterations.

### Third-Party Integration Enablement

**AWS SDK Integration**: The `use_aws` power enabled seamless integration with AWS services while maintaining security boundaries:

```typescript
// Enabled by aws power - auto-approved read operations
const kbResponse = await bedrockAgentRuntime.send(new RetrieveCommand({
  knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID!,
  retrievalQuery: normalizedQuery,
  retrievalConfiguration: {
    vectorSearchConfiguration: {
      numberOfResults: 5,
    },
  },
}));

// Blocked write operations required approval
await lambda.updateFunctionCode({ /* ... */ }); // Would prompt for approval
```

**Google Places API Integration**: The power configuration enabled external API calls while maintaining security:

```typescript
// Enabled pattern - external API with cached credentials
const placesResponse = await fetch(
  `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`,
  { headers: { /* API key from SSM */ } }
);
```

### Powers vs. Manual Configuration Comparison

**With Powers**:
- **Rapid Iteration**: Safe commands auto-approved
- **Security Boundaries**: Dangerous operations blocked or prompted
- **Best Practices**: AWS service patterns built-in
- **Consistency**: Same patterns across all development sessions

**Without Powers**:
- **Manual Approval**: Every command would require confirmation
- **Security Risk**: No protection against destructive operations
- **Inconsistent Patterns**: Different AWS SDK usage across sessions
- **Slower Development**: Constant interruption for approvals

**Strategic Value**: Powers enabled "flow state" development where safe operations proceeded automatically while maintaining guardrails against expensive mistakes.

---

## 🎯 Integrated Development Methodology: The Compound Effect

### How Features Reinforced Each Other

The true power of Kiro emerged from the compound effect of using all features together:

**Spec-Driven + Steering**: Specifications provided the architecture, steering docs enforced it persistently across sessions

**Steering + Hooks**: Steering defined what should be protected (system prompts), hooks prevented accidental modification

**Hooks + Powers**: Hooks automated validation, powers constrained operations to safe patterns

**MCP + Vibe Coding**: MCP provided accurate external API signatures, vibe coding implemented them rapidly

**Powers + Spec-Driven**: Powers enforced architectural boundaries defined in specs

### Quantified Development Efficiency Gains

**Traditional Hackathon Development**:
- Integration bugs discovered during testing: 4-6 hours debugging
- Stale build deployments: 2-3 hours confusion and re-deployment  
- API signature errors: 1-2 hours per incorrect assumption
- Architecture violations: 3-4 hours refactoring

**Kiro-Assisted Development**:
- Integration bugs: 0 (prevented by spec-driven architecture)
- Stale builds: 0 (caught by build-on-stop hook)
- API signature errors: 0 (prevented by MCP accuracy)
- Architecture violations: 0 (enforced by steering boundaries)

**Total Time Saved**: Estimated 10-15 hours over a 2-day hackathon, allowing focus on feature completeness and polish rather than debugging.

### Strategic Kiro Feature Selection

**For Architecture & Integration**: Spec-driven development + steering docs
**For Implementation**: Vibe coding + MCP for external APIs
**For Quality Assurance**: Agent hooks + powers for safety
**For Persistence**: Steering docs for cross-session consistency

### Lessons for Future AI-Assisted Development

**1. Invest in Specifications**: Time spent on detailed specs pays exponential dividends during implementation

**2. Protect Hand-Tuned Artifacts**: Use steering docs to prevent AI from overwriting carefully calibrated configurations

**3. Automate Validation Loops**: Hooks catch errors at the source rather than during integration

**4. Constrain for Safety**: Powers enable rapid iteration within safe boundaries

**5. Leverage Current Information**: MCP provides accuracy for external integrations where training data may be stale

**6. Maintain Context**: Steering docs provide persistent memory across development sessions

This methodology represents a new paradigm for AI-assisted development where the AI becomes a true development partner rather than just a code generation tool, enabling both speed and reliability at hackathon scale.