#!/usr/bin/env bun
/**
 * HandelsregisterLookup.ts - German Company Registry Lookup Helper
 *
 * Usage:
 *   bun run HandelsregisterLookup.ts <company_name>     # Search by name
 *   bun run HandelsregisterLookup.ts --hrb HRB123456   # Search by HRB number
 *   bun run HandelsregisterLookup.ts --city München    # Filter by city
 *
 * Note: This tool generates lookup URLs and structures available data.
 * Full automated lookup requires paid API access or manual search.
 */

interface CompanySearchParams {
  name?: string;
  hrb?: string;
  city?: string;
  state?: string;
}

interface HandelsregisterEntry {
  name: string;
  hrb?: string;
  court?: string;
  city?: string;
  status?: string;
  registeredCapital?: string;
  purpose?: string;
  management?: string[];
  lookupUrls: {
    unternehmensregister: string;
    handelsregister: string;
    bundesanzeiger: string;
  };
}

// German federal states and their registry courts
const REGISTRY_COURTS: Record<string, string[]> = {
  "Baden-Württemberg": ["Stuttgart", "Mannheim", "Freiburg", "Ulm"],
  "Bayern": ["München", "Nürnberg", "Augsburg", "Würzburg", "Regensburg"],
  "Berlin": ["Berlin (Charlottenburg)"],
  "Brandenburg": ["Potsdam", "Cottbus", "Frankfurt (Oder)"],
  "Bremen": ["Bremen"],
  "Hamburg": ["Hamburg"],
  "Hessen": ["Frankfurt am Main", "Darmstadt", "Wiesbaden", "Kassel"],
  "Mecklenburg-Vorpommern": ["Rostock", "Schwerin"],
  "Niedersachsen": ["Hannover", "Braunschweig", "Oldenburg", "Osnabrück"],
  "Nordrhein-Westfalen": ["Düsseldorf", "Köln", "Dortmund", "Essen", "Münster"],
  "Rheinland-Pfalz": ["Mainz", "Koblenz", "Ludwigshafen", "Kaiserslautern"],
  "Saarland": ["Saarbrücken"],
  "Sachsen": ["Dresden", "Leipzig", "Chemnitz"],
  "Sachsen-Anhalt": ["Magdeburg", "Halle", "Stendal"],
  "Schleswig-Holstein": ["Kiel", "Lübeck", "Flensburg"],
  "Thüringen": ["Jena", "Erfurt", "Gera"],
};

// Common legal forms in Germany
const LEGAL_FORMS = {
  GmbH: "Gesellschaft mit beschränkter Haftung",
  "GmbH & Co. KG": "GmbH & Co. Kommanditgesellschaft",
  AG: "Aktiengesellschaft",
  KG: "Kommanditgesellschaft",
  OHG: "Offene Handelsgesellschaft",
  UG: "Unternehmergesellschaft (haftungsbeschränkt)",
  SE: "Societas Europaea",
  eG: "eingetragene Genossenschaft",
};

function generateLookupUrls(params: CompanySearchParams): HandelsregisterEntry["lookupUrls"] {
  const encodedName = encodeURIComponent(params.name || "");
  const encodedCity = encodeURIComponent(params.city || "");

  return {
    unternehmensregister: `https://www.unternehmensregister.de/ureg/?submitaction=showSearchForm&language=de` +
      (params.name ? `#` : ""),
    handelsregister: `https://www.handelsregister.de/rp_web/mask.do?Ession_Key=&Operation=all` +
      `&schlagwort=${encodedName}` +
      (params.city ? `&ort=${encodedCity}` : ""),
    bundesanzeiger: `https://www.bundesanzeiger.de/pub/de/suchergebnis?8&fulltext=${encodedName}`,
  };
}

function formatCompanySearch(params: CompanySearchParams): string {
  const urls = generateLookupUrls(params);

  const sections = [
    `\n🏢 HANDELSREGISTER LOOKUP`,
    `${"=".repeat(50)}`,
    ``,
    `Search: ${params.name || params.hrb || "N/A"}`,
    params.city ? `City: ${params.city}` : null,
    params.state ? `State: ${params.state}` : null,
    ``,
    `📋 LOOKUP URLS:`,
    ``,
    `1. Unternehmensregister (Official Portal)`,
    `   ${urls.unternehmensregister}`,
    `   → Search with company name, filter by legal form`,
    ``,
    `2. Handelsregister (Direct Registry)`,
    `   ${urls.handelsregister}`,
    `   → Shows HRB/HRA entries with registration court`,
    ``,
    `3. Bundesanzeiger (Public Filings)`,
    `   ${urls.bundesanzeiger}`,
    `   → Annual reports, insolvencies, announcements`,
    ``,
    `📊 DATA AVAILABLE:`,
    ``,
    `Basic (Free):`,
    `  • Company name, HRB number, registry court`,
    `  • Registered address`,
    `  • Legal form`,
    `  • Registration date`,
    ``,
    `Extended (Paid/Manual):`,
    `  • Registered capital (Stammkapital)`,
    `  • Company purpose (Unternehmensgegenstand)`,
    `  • Management (Geschäftsführer)`,
    `  • Shareholders (if filed)`,
    `  • Authorized signatories (Prokura)`,
    ``,
    `Bundesanzeiger (Free):`,
    `  • Annual financial statements`,
    `  • Insolvency announcements`,
    `  • Corporate actions`,
  ].filter(Boolean);

  return sections.join("\n");
}

function suggestSearchStrategy(companyName: string): string {
  // Detect legal form in name
  const legalForm = Object.keys(LEGAL_FORMS).find(form =>
    companyName.toUpperCase().includes(form.toUpperCase())
  );

  const tips = [
    ``,
    `💡 SEARCH TIPS:`,
    ``,
    `1. Search without legal form suffix (e.g., "Müller" instead of "Müller GmbH")`,
    `2. Try variations: umlauts (ü→ue, ä→ae, ö→oe)`,
    `3. For group structures, search parent company first`,
  ];

  if (legalForm) {
    tips.push(`4. Detected legal form: ${legalForm} (${LEGAL_FORMS[legalForm as keyof typeof LEGAL_FORMS]})`);
  }

  tips.push(
    ``,
    `📍 COMMON REGISTRY COURTS BY REGION:`,
    ``
  );

  // Show major courts
  const majorCourts = [
    "München", "Frankfurt am Main", "Düsseldorf", "Hamburg",
    "Berlin (Charlottenburg)", "Stuttgart", "Köln"
  ];

  for (const court of majorCourts) {
    tips.push(`  • ${court}`);
  }

  return tips.join("\n");
}

function generateCompanyTemplate(): string {
  return `
📝 COMPANY DATA TEMPLATE
${"=".repeat(50)}

Copy and fill when documenting company registry data:

\`\`\`markdown
## Company Registry Data

| Field | Value |
|-------|-------|
| Name | |
| HRB Number | |
| Registry Court | |
| Legal Form | |
| Registered Address | |
| Registered Capital | |
| Founded | |
| Last Updated | |

### Management (Geschäftsführer)
- Name, since YYYY-MM-DD

### Company Purpose
[German text from registry]

### Key Shareholders (if available)
| Shareholder | Share % |
|-------------|---------|
| | |

### Source
- Registry lookup: YYYY-MM-DD
- Bundesanzeiger: [link to filings]
\`\`\`
`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
🏢 HandelsregisterLookup - German Company Registry Helper

Usage:
  bun run HandelsregisterLookup.ts <company_name>       # Search by name
  bun run HandelsregisterLookup.ts --hrb HRB123456     # Search by HRB
  bun run HandelsregisterLookup.ts --city München      # Filter by city
  bun run HandelsregisterLookup.ts --template          # Show data template

Data Sources:
  • unternehmensregister.de - Official German company register portal
  • handelsregister.de - Direct registry access
  • bundesanzeiger.de - Public company filings

Note: Full automated lookup requires paid API access.
This tool generates lookup URLs and provides data templates.

Examples:
  bun run HandelsregisterLookup.ts "Bosch GmbH"
  bun run HandelsregisterLookup.ts "Siemens" --city München
  bun run HandelsregisterLookup.ts --template
`);
    return;
  }

  // Check for template flag
  if (args.includes("--template")) {
    console.log(generateCompanyTemplate());
    return;
  }

  // Parse arguments
  const params: CompanySearchParams = {};

  const hrbIndex = args.indexOf("--hrb");
  if (hrbIndex !== -1 && args[hrbIndex + 1]) {
    params.hrb = args[hrbIndex + 1];
  }

  const cityIndex = args.indexOf("--city");
  if (cityIndex !== -1 && args[cityIndex + 1]) {
    params.city = args[cityIndex + 1];
  }

  const stateIndex = args.indexOf("--state");
  if (stateIndex !== -1 && args[stateIndex + 1]) {
    params.state = args[stateIndex + 1];
  }

  // Company name is any arg not starting with --
  const nameArgs = args.filter((a, i) => {
    if (a.startsWith("--")) return false;
    const prevArg = args[i - 1];
    if (prevArg && ["--hrb", "--city", "--state"].includes(prevArg)) return false;
    return true;
  });

  if (nameArgs.length > 0) {
    params.name = nameArgs.join(" ");
  }

  if (!params.name && !params.hrb) {
    console.error("❌ Please provide a company name or HRB number");
    process.exit(1);
  }

  // Output search information
  console.log(formatCompanySearch(params));
  console.log(suggestSearchStrategy(params.name || ""));
  console.log(generateCompanyTemplate());
}

main().catch(console.error);
