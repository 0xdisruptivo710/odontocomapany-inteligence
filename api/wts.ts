/**
 * Proxy da WTS Chat API.
 *
 * Existe por dois motivos: o token nunca chega ao browser, e a WTS não manda
 * cabeçalho de CORS (chamada direta do front seria bloqueada).
 *
 * Uso: /api/wts?p=/crm/v2/panel/card&PanelId=...&ContactId=...
 * O parâmetro `p` é o path na WTS; todo o resto da query é repassado.
 */
async function handler(req: Request): Promise<Response> {
  const token = process.env.WTS_TOKEN_ODONTO_COMPANY;
  if (!token) {
    return Response.json(
      { error: 'WTS_TOKEN_ODONTO_COMPANY not configured on server' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const wtsPath = url.searchParams.get('p');
  if (!wtsPath) {
    return Response.json(
      { error: 'missing_path_query', hint: 'use /api/wts?p=/chat/v2/session/xxx' },
      { status: 400 },
    );
  }

  const forwardParams = new URLSearchParams(url.searchParams);
  forwardParams.delete('p');
  const forwardQs = forwardParams.toString();
  const target = `https://api.wts.chat${wtsPath}${forwardQs ? `?${forwardQs}` : ''}`;

  // Authorization SEM "Bearer" — com Bearer a WTS devolve 401.
  const headers: Record<string, string> = {
    Authorization: token,
    accept: 'application/json',
  };
  const ct = req.headers.get('content-type');
  if (ct) headers['content-type'] = ct;

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, { method: req.method, headers, body });
  } catch (err) {
    return Response.json(
      { error: 'upstream_fetch_failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
