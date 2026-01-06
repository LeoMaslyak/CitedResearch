#!/usr/bin/env bun
/**
 * ValidateSources.ts - Validate source freshness for PE research
 *
 * Usage:
 *   bun run ValidateSources.ts <url> [--type <dataType>]
 *   bun run ValidateSources.ts --batch < urls.txt
 *
 * Data types: market_sizing, succession_stats, pe_deal_activity, company_financials, industry_trends
 */

const N8N_WEBHOOK_URL = "https://n8n.srv1226824.hstgr.cloud/webhook/validate-source";

interface ValidationResult {
  url: string;
  dataType: string;
  publishDate: string | null;
  ageInDays: number | null;
  maxAgeDays: number;
  valid: boolean;
  status: "fresh" | "aging" | "stale" | "date_not_found" | "error";
  checkedAt: string;
  error?: string;
}

const MAX_AGE_RULES: Record<string, number> = {
  market_sizing: 365,
  succession_stats: 180,
  pe_deal_activity: 90,
  company_financials: 365,
  industry_trends: 180,
  credit_rating: 30,       // Credit data must be very fresh
  insolvency_data: 7,      // Insolvency info should be near real-time
  general: 365,
};

async function validateSource(
  url: string,
  dataType: string = "general"
): Promise<ValidationResult> {
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, dataType }),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Fallback: local validation if n8n unavailable
    return localValidation(url, dataType, error as Error);
  }
}

async function localValidation(
  url: string,
  dataType: string,
  originalError: Error
): Promise<ValidationResult> {
  console.error(`⚠️  n8n unavailable, using local validation: ${originalError.message}`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PAI-ResearchBot/1.0)",
      },
    });

    const html = await response.text();

    // Extract date patterns
    const patterns = [
      /datePublished["']?\s*[:=]\s*["']?(\d{4}-\d{2}-\d{2})/i,
      /published["']?\s*[:=]\s*["']?(\d{4}-\d{2}-\d{2})/i,
      /"date":\s*"(\d{4}-\d{2}-\d{2})/i,
      /(\d{4}-\d{2}-\d{2})/,
    ];

    let publishDate: string | null = null;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        publishDate = match[1];
        break;
      }
    }

    const maxAgeDays = MAX_AGE_RULES[dataType] || MAX_AGE_RULES.general;
    let ageInDays: number | null = null;
    let valid = false;
    let status: ValidationResult["status"] = "date_not_found";

    if (publishDate) {
      const pubDate = new Date(publishDate);
      const now = new Date();
      ageInDays = Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24));

      if (ageInDays <= maxAgeDays) {
        valid = true;
        status = "fresh";
      } else if (ageInDays <= maxAgeDays * 2) {
        status = "aging";
      } else {
        status = "stale";
      }
    }

    return {
      url,
      dataType,
      publishDate,
      ageInDays,
      maxAgeDays,
      valid,
      status,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      url,
      dataType,
      publishDate: null,
      ageInDays: null,
      maxAgeDays: MAX_AGE_RULES[dataType] || MAX_AGE_RULES.general,
      valid: false,
      status: "error",
      checkedAt: new Date().toISOString(),
      error: String(error),
    };
  }
}

function formatResult(result: ValidationResult): string {
  const statusEmoji = {
    fresh: "✅",
    aging: "⚠️",
    stale: "❌",
    date_not_found: "❓",
    error: "💥",
  };

  const lines = [
    `${statusEmoji[result.status]} ${result.url}`,
    `   Status: ${result.status.toUpperCase()}`,
    `   Type: ${result.dataType}`,
    `   Published: ${result.publishDate || "Unknown"}`,
    `   Age: ${result.ageInDays !== null ? `${result.ageInDays} days` : "N/A"}`,
    `   Max allowed: ${result.maxAgeDays} days`,
  ];

  if (result.error) {
    lines.push(`   Error: ${result.error}`);
  }

  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
📊 ValidateSources - Check source freshness for PE research

Usage:
  bun run ValidateSources.ts <url> [--type <dataType>]
  echo "url1\\nurl2" | bun run ValidateSources.ts --batch [--type <dataType>]

Data Types:
  market_sizing      - Max 12 months
  succession_stats   - Max 6 months
  pe_deal_activity   - Max 3 months
  company_financials - Max current FY (12 months)
  industry_trends    - Max 6 months
  credit_rating      - Max 1 month (Creditreform, Bürgel)
  insolvency_data    - Max 7 days (real-time preferred)
  general           - Max 12 months (default)

Examples:
  bun run ValidateSources.ts https://kfw.de/report --type succession_stats
  bun run ValidateSources.ts https://pitchbook.com/pe-report --type pe_deal_activity
`);
    return;
  }

  let dataType = "general";
  const typeIndex = args.indexOf("--type");
  if (typeIndex !== -1 && args[typeIndex + 1]) {
    dataType = args[typeIndex + 1];
    args.splice(typeIndex, 2);
  }

  const isBatch = args.includes("--batch");

  if (isBatch) {
    // Read URLs from stdin
    const input = await Bun.stdin.text();
    const urls = input.split("\n").filter((u) => u.trim());

    console.log(`🔍 Validating ${urls.length} sources...\n`);

    const results: ValidationResult[] = [];
    for (const url of urls) {
      const result = await validateSource(url.trim(), dataType);
      results.push(result);
      console.log(formatResult(result));
      console.log();
    }

    // Summary
    const fresh = results.filter((r) => r.status === "fresh").length;
    const aging = results.filter((r) => r.status === "aging").length;
    const stale = results.filter((r) => r.status === "stale").length;
    const unknown = results.filter((r) => ["date_not_found", "error"].includes(r.status)).length;

    console.log("---");
    console.log(`Summary: ✅ ${fresh} fresh | ⚠️ ${aging} aging | ❌ ${stale} stale | ❓ ${unknown} unknown`);

    // Output JSON for programmatic use
    console.log(JSON.stringify({ results, summary: { fresh, aging, stale, unknown } }));
  } else {
    // Single URL
    const url = args[0];
    if (!url || !url.startsWith("http")) {
      console.error("❌ Please provide a valid URL");
      process.exit(1);
    }

    const result = await validateSource(url, dataType);
    console.log(formatResult(result));
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
