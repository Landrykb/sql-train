import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace('/api/auth/github/', '');
  const backendUrl = new URL(`http://localhost:8000/auth/github/${path}`);
  searchParams.forEach((value, key) => backendUrl.searchParams.append(key, value));

  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from backend: ${response.statusText}` },
        { status: response.status }
      );
    }

    if (response.redirected) {
      return NextResponse.redirect(response.url);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: `Backend request failed: ${err.message}` }, { status: 500 });
  }
}
