---
name: deep-dive
description: 'Explain implementation concepts in depth, producing reference documentation. Use when the engineer wants to understand how something works in the codebase or needs a concept explained with production context. Triggers on: explain how, deep dive into, how does this work, walk me through, document this.'
---

# Deep Dive

Explain implementation concepts in depth, producing reference docs that connect theory to this codebase.

---

## The Job

1. Identify what the engineer wants to understand (code, concept, pattern)
2. Trace the implementation through the codebase
3. Produce a reference doc explaining it end-to-end
4. Save to `docs/<project>/<topic>.md`

**Important:** This is about explanation and documentation, not implementation. Do not modify code.

---

## Step 1: Identify the Topic

The engineer might point to:

- A specific file or function ("How does the email generation pipeline work?")
- A concept ("Explain how promptfoo red-teaming works")
- A pattern ("Walk me through pessimistic locking in this codebase")
- A technology ("How does LangGraph work here?")

If unclear, ask: "What specifically do you want to understand better?"

---

## Step 2: Trace the Implementation

Read the relevant source files and trace the execution flow:

- Entry point → intermediate layers → data layer
- Configuration and environment setup
- External dependencies and integrations
- Error handling and edge cases

---

## Step 3: Generate the Doc

Follow the structure of existing deep-dive docs:

### Templates

- **Architecture doc:** [`docs/RealtyAi/ai-email-generation-architecture.md`](../../docs/RealtyAi/ai-email-generation-architecture.md)
- **Security/eval doc:** [`docs/RealtyAi/llm-security-testing.md`](../../docs/RealtyAi/llm-security-testing.md)
- **Data flow doc:** [`docs/RealtyAi/data-flow.md`](../../docs/RealtyAi/data-flow.md)

### Sections

1. **Overview** — What this is and why it matters. One paragraph.
2. **Architecture** — How the pieces fit together. Include an ASCII or mermaid diagram if the system has multiple components.
3. **Implementation Walkthrough** — Step-by-step through the code flow. Reference specific files with paths (e.g., `apps/realty-ai-api/src/modules/email/ai/nodes.ts`).
4. **Key Patterns** — Design decisions, why this approach was chosen, what patterns it uses.
5. **Configuration** — Environment variables, setup requirements, dependencies.
6. **Production Considerations** — What would change at scale. Security implications. Monitoring hooks.
7. **Trade-offs** — What alternatives exist. What are the limitations of this approach.
8. **Related Reading** — Links to relevant docs, blog posts, or other files in this repo.

### Writing Style

- Write for an experienced engineer who hasn't seen this code before
- Be specific: file paths, function names, line-level references
- Explain the "why" not just the "what"
- Include concrete examples where they help
- Don't over-explain fundamentals — focus on what's specific to this implementation

---

## Output

- **Format:** Markdown (`.md`)
- **Location:** `docs/<project>/<topic>.md`
  - Use the app/project name for the directory (e.g., `RealtyAi`, `ai-tic-tac-toe`)
  - Use a descriptive kebab-case filename for the topic

---

## Checklist Before Saving

- [ ] Architecture diagram included (if multi-component system)
- [ ] File paths reference actual files in the codebase
- [ ] "Why" is explained, not just "what"
- [ ] Production considerations addressed
- [ ] Trade-offs discussed
