#!/usr/bin/env bun
/**
 * PENewsFeed.ts - Aggregate DACH PE/M&A news from RSS feeds
 *
 * Usage:
 *   bun run PENewsFeed.ts                    # Fetch latest news
 *   bun run PENewsFeed.ts --filter succession # Filter by keyword
 *   bun run PENewsFeed.ts --since 24h        # Items from last 24 hours
 *   bun run PENewsFeed.ts --json             # Output as JSON
 */

interface FeedSource {
  name: string;
  url: string;
  tier: number;
  focus: string[];
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: Date;
  source: string;
  tier: number;
  description?: string;
  relevanceScore: number;
}

// DACH PE/M&A News Sources with RSS feeds
const PE_NEWS_FEEDS: FeedSource[] = [
  {
    name: "Finance Magazin",
    url: "https://www.finance-magazin.de/feed/",
    tier: 2,
    focus: ["M&A", "PE", "CFO", "Mittelstand"],
  },
  {
    name: "Private Equity Magazin",
    url: "https://www.private-equity-magazin.de/feed/",
    tier: 2,
    focus: ["PE", "Buyout", "VC", "Exit"],
  },
  {
    name: "Handelsblatt Unternehmen",
    url: "https://www.handelsblatt.com/contentexport/feed/unternehmen",
    tier: 3,
    focus: ["Corporate", "M&A", "Strategy"],
  },
  {
    name: "Manager Magazin",
    url: "https://www.manager-magazin.de/unternehmen/index.rss",
    tier: 3,
    focus: ["Executive", "Strategy", "M&A"],
  },
  {
    name: "WirtschaftsWoche",
    url: "https://www.wiwo.de/rss/feed.unternehmen.rss",
    tier: 3,
    focus: ["Business", "Mittelstand", "Innovation"],
  },
];

// PE/M&A relevance keywords (German + English)
const RELEVANCE_KEYWORDS = {
  high: [
    "private equity", "pe-investor", "buyout", "übernahme", "akquisition",
    "nachfolge", "succession", "mittelstand", "familienunternehmen",
    "carve-out", "exit", "portfolio", "beteiligung", "venture capital",
    "lbo", "leveraged buyout", "mbo", "management buyout"
  ],
  medium: [
    "m&a", "merger", "fusion", "transaktion", "deal", "investor",
    "finanzierung", "wachstum", "expansion", "strategie", "verkauf",
    "käufer", "veräußerung", "kapital", "equity"
  ],
  low: [
    "unternehmen", "geschäft", "management", "führung", "ceo", "cfo",
    "vorstand", "aufsichtsrat", "umsatz", "gewinn"
  ]
};

async function fetchFeed(source: FeedSource): Promise<NewsItem[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "PAI-PENewsFeed/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      console.error(`⚠️  Failed to fetch ${source.name}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseRSSFeed(xml, source);
  } catch (error) {
    console.error(`⚠️  Error fetching ${source.name}: ${error}`);
    return [];
  }
}

function parseRSSFeed(xml: string, source: FeedSource): NewsItem[] {
  const items: NewsItem[] = [];

  // Simple RSS parsing (item tags)
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);

  for (const match of itemMatches) {
    const itemXml = match[1];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDateStr = extractTag(itemXml, "pubDate");
    const description = extractTag(itemXml, "description");

    if (!title || !link) continue;

    const pubDate = pubDateStr ? new Date(pubDateStr) : new Date();
    const relevanceScore = calculateRelevance(title, description || "");

    items.push({
      title: cleanText(title),
      link: link.trim(),
      pubDate,
      source: source.name,
      tier: source.tier,
      description: description ? cleanText(description).slice(0, 200) : undefined,
      relevanceScore,
    });
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdataMatch) return cdataMatch[1];

  // Regular tag
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1] : null;
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateRelevance(title: string, description: string): number {
  const text = (title + " " + description).toLowerCase();
  let score = 0;

  for (const keyword of RELEVANCE_KEYWORDS.high) {
    if (text.includes(keyword)) score += 10;
  }
  for (const keyword of RELEVANCE_KEYWORDS.medium) {
    if (text.includes(keyword)) score += 5;
  }
  for (const keyword of RELEVANCE_KEYWORDS.low) {
    if (text.includes(keyword)) score += 1;
  }

  return score;
}

function formatItem(item: NewsItem): string {
  const tierEmoji = item.tier === 2 ? "⭐" : "📰";
  const relevance = item.relevanceScore >= 10 ? "🔥" : item.relevanceScore >= 5 ? "📊" : "";
  const age = getRelativeTime(item.pubDate);

  return `${tierEmoji} ${relevance} [${item.source}] ${item.title}
   ${item.link}
   ${age}`;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("de-DE");
}

function parseSince(since: string): Date {
  const now = new Date();
  const match = since.match(/^(\d+)(h|d|w)$/);

  if (!match) return new Date(0);

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "h": return new Date(now.getTime() - value * 60 * 60 * 1000);
    case "d": return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
    case "w": return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
    default: return new Date(0);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
📰 PENewsFeed - DACH PE/M&A News Aggregator

Usage:
  bun run PENewsFeed.ts                     # Fetch all latest news
  bun run PENewsFeed.ts --filter nachfolge  # Filter by keyword
  bun run PENewsFeed.ts --since 24h         # Items from last 24 hours
  bun run PENewsFeed.ts --since 7d          # Items from last 7 days
  bun run PENewsFeed.ts --min-relevance 5   # Minimum relevance score
  bun run PENewsFeed.ts --json              # Output as JSON

Sources (${PE_NEWS_FEEDS.length} feeds):
${PE_NEWS_FEEDS.map(f => `  - ${f.name} (Tier ${f.tier})`).join("\n")}

Relevance Scoring:
  🔥 High relevance (10+): PE, buyout, succession terms
  📊 Medium relevance (5+): M&A, deal, investor terms
`);
    return;
  }

  // Parse arguments
  const filterIndex = args.indexOf("--filter");
  const filter = filterIndex !== -1 ? args[filterIndex + 1]?.toLowerCase() : null;

  const sinceIndex = args.indexOf("--since");
  const sinceDate = sinceIndex !== -1 ? parseSince(args[sinceIndex + 1] || "7d") : parseSince("7d");

  const minRelIndex = args.indexOf("--min-relevance");
  const minRelevance = minRelIndex !== -1 ? parseInt(args[minRelIndex + 1] || "0") : 0;

  const outputJson = args.includes("--json");

  console.log("🔍 Fetching DACH PE/M&A news...\n");

  // Fetch all feeds in parallel
  const allItems: NewsItem[] = [];
  const results = await Promise.all(PE_NEWS_FEEDS.map(fetchFeed));

  for (const items of results) {
    allItems.push(...items);
  }

  // Filter and sort
  let filtered = allItems
    .filter(item => item.pubDate >= sinceDate)
    .filter(item => item.relevanceScore >= minRelevance);

  if (filter) {
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(filter) ||
      (item.description?.toLowerCase().includes(filter))
    );
  }

  // Sort by relevance then date
  filtered.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return b.pubDate.getTime() - a.pubDate.getTime();
  });

  if (outputJson) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  // Display results
  console.log(`📊 Found ${filtered.length} relevant articles\n`);

  if (filtered.length === 0) {
    console.log("No articles found matching criteria.");
    return;
  }

  // Group by relevance
  const highRelevance = filtered.filter(i => i.relevanceScore >= 10);
  const mediumRelevance = filtered.filter(i => i.relevanceScore >= 5 && i.relevanceScore < 10);
  const lowRelevance = filtered.filter(i => i.relevanceScore < 5);

  if (highRelevance.length > 0) {
    console.log("🔥 HIGH RELEVANCE (PE/M&A specific)\n");
    highRelevance.slice(0, 10).forEach(item => console.log(formatItem(item) + "\n"));
  }

  if (mediumRelevance.length > 0) {
    console.log("📊 MEDIUM RELEVANCE\n");
    mediumRelevance.slice(0, 10).forEach(item => console.log(formatItem(item) + "\n"));
  }

  if (lowRelevance.length > 0 && highRelevance.length + mediumRelevance.length < 5) {
    console.log("📰 OTHER BUSINESS NEWS\n");
    lowRelevance.slice(0, 5).forEach(item => console.log(formatItem(item) + "\n"));
  }

  console.log("---");
  console.log(`Summary: ${highRelevance.length} high | ${mediumRelevance.length} medium | ${lowRelevance.length} low relevance`);
}

main().catch(console.error);
