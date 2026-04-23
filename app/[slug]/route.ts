import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

// Serve the AI-generated HTML as a raw Response.
// The AI generates full <!DOCTYPE html> documents, so we cannot wrap them
// inside a React <div> — that would produce invalid nested <html> tags
// which breaks script execution (blank page symptom).
//
// We also inject a lightweight tracking beacon before </body> so that
// lead engagement (click, time-on-page, hot-lead threshold) is recorded.

function buildBeaconScript(token: string, baseUrl: string): string {
    const trackBase = `${baseUrl}/api/track/${token}`;
    return `
<script>
(function() {
  var _tb = '${trackBase}';
  var _sent = false;
  var _totalSeconds = 0;
  var _qualified = false;

  function _ping(event, extra) {
    var url = _tb + '?event=' + event + (extra || '');
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        var img = new Image();
        img.src = url;
      }
    } catch(e) {}
  }

  // Fire 'view' event on page load (records linkClickedAt + stage 'clicked')
  function _onLoad() {
    if (!_sent) {
      _sent = true;
      _ping('view');
    }
  }

  // Accumulate time every 5 seconds via 'beacon' event
  var _interval = setInterval(function() {
    _totalSeconds += 5;
    _ping('beacon', '&seconds=5');

    // Fire 'qualified' once after 10 seconds total
    if (!_qualified && _totalSeconds >= 10) {
      _qualified = true;
      _ping('qualified');
    }
  }, 5000);

  // Fire on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _onLoad);
  } else {
    _onLoad();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    clearInterval(_interval);
  });
})();
</script>`;
}

export async function GET(request: Request, context: { params: { slug: string } }) {
    const lead = await prisma.lead.findUnique({
        where: {
            slug: context.params.slug,
            status: 'LIVE',
        },
        select: {
            id: true,
            htmlCode: true,
        }
    });

    if (!lead?.htmlCode) {
        return new Response('Not Found', { status: 404 });
    }

    // ── Generate or reuse tracking token ────────────────────────────────────
    let trackingToken = await prisma.trackingToken.findUnique({
        where: { prospectId: lead.id },
        select: { token: true }
    });

    if (!trackingToken) {
        const newToken = randomBytes(32).toString('hex');
        trackingToken = await prisma.trackingToken.create({
            data: {
                token: newToken,
                prospectId: lead.id,
            },
            select: { token: true }
        });
    }

    // ── Inject beacon script before </body> ──────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const beaconScript = buildBeaconScript(trackingToken.token, baseUrl);
    const finalHtml = lead.htmlCode.replace('</body>', `${beaconScript}\n</body>`);

    return new Response(finalHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

export const dynamic = 'force-dynamic';
