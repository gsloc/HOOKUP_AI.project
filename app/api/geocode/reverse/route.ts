import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');

  if (!latitude || !longitude) {
    return NextResponse.json({ error: 'Missing latitude or longitude' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding service failed' }, { status: 502 });
    }

    const data = await response.json();
    const first = data.results?.[0];

    if (!first) {
      return NextResponse.json({ error: 'No results' }, { status: 404 });
    }

    return NextResponse.json({
      name: first.name,
      state: first.admin1,
      country: first.country,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
