import { NextRequest, NextResponse } from 'next/server';

/**
 * IP-based geolocation fallback used by services/location/locationService.ts
 * when both browser-geolocation strategies have timed out.
 *
 * Server-side proxy for two reasons:
 *   1. Some CDNs (including ipapi.co) rate-limit unrecognized browser origins.
 *   2. Reading the true client IP requires header inspection, which is only
 *      reliable at the server tier.
 *
 * Behavior:
 *   - Extracts client IP from `x-forwarded-for` (first entry), or `x-real-ip`.
 *     Vercel populates `x-forwarded-for` in production.
 *   - Local dev has no proxy headers, so the client IP is loopback. Detecting
 *     loopback and falling through to https://ipapi.co/json/ (no IP suffix)
 *     causes ipapi to geolocate the *caller* — the dev machine's public IP —
 *     which is exactly what you want for testing.
 *   - Returns { latitude, longitude, city, region } on success.
 *   - Returns 404 when ipapi returns `error: true` (reserved IP / rate limit),
 *     502 on upstream HTTP error, 500 on network exception. The 404 path is
 *     what the client uses to distinguish "IP fallback declined to answer" from
 *     other failures — see locationService.ts.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp =
    forwarded?.split(',')[0]?.trim() ||
    realIp?.trim() ||
    '';

  const isLoopback =
    clientIp === '' ||
    clientIp === '127.0.0.1' ||
    clientIp === '::1' ||
    clientIp.startsWith('::ffff:127.') ||
    clientIp.startsWith('10.') ||
    clientIp.startsWith('192.168.') ||
    // 172.16.0.0/12 private range
    /^172\.(1[6-9]|2\d|3[01])\./.test(clientIp);

  const url = isLoopback ? 'https://ipapi.co/json/' : `https://ipapi.co/${clientIp}/json/`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'HOOKUP-AI/1.0' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'IP geolocation upstream failed' },
        { status: 502 },
      );
    }

    const data = await response.json();

    // ipapi returns { error: true, reason: '...' } for reserved IPs and
    // rate-limit responses (with HTTP 200). Numeric latitude/longitude are
    // present only on success.
    if (
      data.error ||
      typeof data.latitude !== 'number' ||
      typeof data.longitude !== 'number'
    ) {
      return NextResponse.json(
        { error: 'IP geolocation returned no coordinates' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      latitude: data.latitude,
      longitude: data.longitude,
      city: typeof data.city === 'string' ? data.city : undefined,
      region: typeof data.region === 'string' ? data.region : undefined,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
