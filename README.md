# 🤝 LinkedIn Agent

An AI-powered LinkedIn assistant built with React + Claude (Anthropic API). Designed to help software engineers write better posts, optimize their profile, track job applications, and grow their network — all from one interface.

---

## ✨ Features

### ✍️ Write & Post
- AI-generated LinkedIn posts with hooks, hashtags & CTA
- Post rewriter with tone control (formal / casual / inspirational)
- A/B post variants generator
- Hashtag recommender
- Multi-language post generation (10 languages)
- Content Calendar with best-time reminders

### 👤 Profile
- LinkedIn profile analyzer with specific improvement suggestions
- Resume → LinkedIn converter (PDF upload supported)
- Keyword gap analyzer (profile vs job description)
- Profile completeness scorer

### 💼 Jobs
- Auto-generate cover letters from job screenshots
- Job Tracker (Applied / Interview / Rejected / Offer)
- Interview Q&A practice mode
- Salary negotiation coach

### 🤝 Network
- DM template library (recruiter, peer, senior engineer)
- Follow-up message strategies
- Connection growth tactics

---

## 🛠️ Tech Stack

- **Frontend:** React (JSX), Tailwind-inspired inline styles
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Search:** Anthropic Web Search tool (`web_search_20250305`)
- **Storage:** Claude.ai persistent storage API
- **File Support:** Images, PDF (native document block), TXT, CSV

---

## 🚀 Getting Started

This agent is built to run as a **Claude.ai Artifact**.

1. Open [claude.ai](https://claude.ai)
2. Start a new chat
3. Upload `linkedin_agent_v15.jsx`
4. Ask Claude to render it as an artifact
5. The agent opens and runs directly in your browser — no backend needed

---

## 📁 File Structure
 linkedin-agent/
└── linkedin_agent_v15.jsx # Main agent component (self-contained)


---

## 🔑 Key Technical Details

- **Per-conversation memory** — each mode + sub-feature has its own
  independent chat history, switching modes never loses your work
- **PDF support** — resumes sent as native `document` blocks to Claude API
- **Web search** — agent searches live internet for trending topics,
  job postings and industry news
- **Persistent storage** — drafts, jobs, calendar entries and theme
  preference survive across sessions via Claude storage API
- **No backend required** — runs entirely client-side inside Claude.ai

---

## 👤 Author

**Ganesh Janawade**
Senior Software Engineer @ Persistent Systems 
AWS Certified AI Practitioner | Claude Certified Architect (CCAR-F)
www.linkedin.com/in/ganesh-janawade
---
