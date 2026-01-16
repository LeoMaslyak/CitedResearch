# CitedResearch Enhancements

Tracking improvements for the PE News Feed and research tools.

## High Priority

### PE News Feed v2 (SPEC-014)
- [ ] **SQLite Storage & Deduplication**
  - [ ] Add SQLite database to PENewsFeed.ts
  - [ ] Implement deduplication logic (hash URL + date)
  - [ ] Add historical query capability (--since 30d from DB)
  - [ ] Migrate existing RSS logic to store results
  - [ ] Add fetch logging for debugging

- [ ] **Browser Automation (Playwright)**
  - [ ] Set up Playwright infrastructure
  - [ ] Implement secure credential management (env vars / keychain)
  - [ ] Create scraper for Finance Magazin (subscription)
  - [ ] Create scraper for Handelsblatt Pro (subscription)
  - [ ] Add session/cookie persistence
  - [ ] Rate limiting and ToS compliance

- [ ] **Email Integration**
  - [ ] Extend SPEC-003 Gmail processor for PE news
  - [ ] Add filters for known PE news senders
  - [ ] Implement body parsing for newsletters
  - [ ] Add PDF attachment processing (market reports)
  - [ ] Route extracted content to news feed storage

### Source Expansion
- [ ] Evaluate Mergermarket email alerts integration
- [ ] Evaluate PitchBook news feed access
- [ ] Add IMAP DACH newsletter parsing
- [ ] Add broker report PDF processing

## Medium Priority

### Intelligence Features
- [ ] Entity extraction (company names, deal values)
- [ ] Cross-reference with CRM watchlist
- [ ] Auto-alert on watchlist company mentions
- [ ] Sentiment analysis layer
- [ ] Relevance scoring v2 (ML-based?)

### Output Enhancements
- [ ] Weekly digest generation (email format)
- [ ] Obsidian export for research notes
- [ ] Dashboard view in PAI Observability
- [ ] Slack notification integration

### Validation & Quality
- [ ] Source freshness validation v2
- [ ] Automated source health checks
- [ ] Missing article detection
- [ ] Citation accuracy validation

## Low Priority / Ideas

### Advanced Analytics
- [ ] Topic clustering across articles
- [ ] Trend detection over time
- [ ] Deal flow prediction signals
- [ ] Competitor mention tracking

### Integrations
- [ ] NotebookLM export for deep analysis
- [ ] n8n workflow triggers
- [ ] CRM activity creation from mentions
- [ ] Custom webhook endpoints

## Completed

### 2026-01-08 (v1.0)
- [x] Basic RSS feed aggregation (5 sources)
- [x] Relevance scoring with 20+ keywords
- [x] Time-based filtering (--since)
- [x] Keyword filtering (--filter)
- [x] JSON output format (--json)
- [x] Source tier classification

### 2026-01-08 (ValidateSources)
- [x] Source freshness validation tool
- [x] n8n webhook integration
- [x] 7 data types with max age rules
- [x] Local fallback validation

### 2026-01-08 (HandelsregisterLookup)
- [x] German company registry lookup
- [x] URL generation for 3 registries
- [x] Data templates for structured entry

---

## Open Questions (from SPEC-014)

> Answer these to refine the implementation plan:

1. **Subscriptions:** Which services do you have access to?
2. **Credentials:** How are login credentials stored?
3. **Email sources:** Which addresses receive market reports?
4. **Volume:** How many PE-related emails per week?
5. **Output format:** Preferred daily intel format?
6. **CRM integration:** Auto-flag watchlist mentions?

---

*Add new ideas by editing this file or mentioning them in a session.*
