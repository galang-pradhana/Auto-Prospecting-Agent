const cheerio = require('cheerio');
const fs = require('fs');

/**
 * Intelligent Section Extractor
 * Detects sections based on semantic tags, common ID patterns, and class naming heuristics.
 */
function extractSections(html) {
    const $ = cheerio.load(html);
    const sections = [];
    const seenIds = new Set();

    // 1. Primary: Semantic <section>, <header>, <footer>, <main> tags
    $('section, header, footer, main').each((i, el) => {
        const $el = $(el);
        const id = $el.attr('id') || `section-${i}`;
        const tagName = el.tagName.toUpperCase();
        let name = $el.attr('aria-label') || $el.attr('id') || tagName;

        if (seenIds.has(id)) return;
        seenIds.add(id);

        sections.push({
            id,
            tagName,
            name: formatName(name),
            type: 'semantic'
        });
    });

    // 2. Secondary: Divs with common section-like IDs or Classes
    const commonKeywords = [
        'hero', 'about', 'feature', 'service', 'price', 'pricing', 
        'testimonial', 'faq', 'contact', 'team', 'portfolio', 'gallery',
        'cta', 'subscribe', 'newsletter', 'blog', 'post'
    ];

    $('div').each((i, el) => {
        const $el = $(el);
        const id = $el.attr('id') || '';
        const className = $el.attr('class') || '';
        
        const hasKeyword = commonKeywords.some(kw => 
            id.toLowerCase().includes(kw) || className.toLowerCase().includes(kw)
        );

        if (hasKeyword && id && !seenIds.has(id)) {
            seenIds.add(id);
            sections.push({
                id,
                tagName: 'DIV',
                name: formatName(id),
                type: 'heuristic'
            });
        }
    });

    // 3. Fallback: Direct children of body if too few sections found
    if (sections.length < 3) {
        $('body > div').each((i, el) => {
            const $el = $(el);
            const id = $el.attr('id') || `block-${i}`;
            if (!seenIds.has(id)) {
                sections.push({
                    id,
                    tagName: 'DIV',
                    name: `Block ${i + 1}`,
                    type: 'layout'
                });
            }
        });
    }

    return sections;
}

function formatName(name) {
    return name
        .replace(/[-_]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Example usage
const sampleHtml = `
<html>
    <body>
        <header id="main-header">Nav</header>
        <div id="hero_section">Hero Content</div>
        <section id="features">Features</section>
        <div class="pricing-table" id="pricing">Pricing</div>
        <footer id="site_footer">Footer</footer>
    </body>
</html>
`;

console.log('--- DETECTED SECTIONS ---');
const results = extractSections(sampleHtml);
console.table(results);

module.exports = { extractSections };
