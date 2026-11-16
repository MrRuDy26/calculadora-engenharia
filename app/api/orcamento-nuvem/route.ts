import { NextResponse } from 'next/server';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://dvqpypimaoybdrivzigt.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cXB5cGltYW95YmRyaXZ6aWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzQ3MTUsImV4cCI6MjA5NDM1MDcxNX0.jfFcdZkZp0omvyJx9SjmPnbmarF_7mYUJf_a21Vf79g';

export async function GET() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chale_orcamento?id=eq.default`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn('[API /orcamento-nuvem GET] Erro Supabase HTTP', res.status);
      return NextResponse.json({
        sucesso: false,
        temDados: false,
        erro: `Erro Supabase HTTP ${res.status}`,
      });
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({
        sucesso: true,
        temDados: false,
        dados: null,
      });
    }

    const registro = rows[0];
    return NextResponse.json({
      sucesso: true,
      temDados: Boolean(registro.itens && registro.itens.length > 0) || Number(registro.area_util) > 0,
      dados: {
        projeto: registro.projeto || 'Chalé no Campo',
        areaUtil: Number(registro.area_util) || 0,
        metaOrcamento: Number(registro.meta_orcamento) || 0,
        escolhas: registro.escolhas || {},
        itens: Array.isArray(registro.itens) ? registro.itens : [],
        dadosPlanta: registro.dados_planta || {},
        updatedAt: registro.updated_at,
      },
    });
  } catch (err: any) {
    console.error('[API /orcamento-nuvem GET] Exceção:', err);
    return NextResponse.json({
      sucesso: false,
      temDados: false,
      erro: err?.message || 'Falha ao buscar dados na nuvem.',
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { areaUtil = 0, metaOrcamento = 0, escolhas = {}, itens = [], dadosPlanta = {} } = body;

    const payload = {
      id: 'default',
      projeto: 'Chalé Minha Casa no Campo',
      area_util: Number(areaUtil) || 0,
      meta_orcamento: Number(metaOrcamento) || 0,
      escolhas: escolhas || {},
      itens: Array.isArray(itens) ? itens : [],
      dados_planta: dadosPlanta || {},
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/chale_orcamento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[API /orcamento-nuvem POST] Erro Supabase:', errText);
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Erro Supabase HTTP ${res.status}: ${errText}`,
        },
        { status: 500 }
      );
    }

    const saved = await res.json();
    return NextResponse.json({
      sucesso: true,
      mensagem: 'Planilha e dados do projeto salvos na nuvem com sucesso!',
      updatedAt: saved[0]?.updated_at || payload.updated_at,
      totalItens: payload.itens.length,
    });
  } catch (err: any) {
    console.error('[API /orcamento-nuvem POST] Exceção:', err);
    return NextResponse.json(
      {
        sucesso: false,
        erro: err?.message || 'Falha ao salvar dados na nuvem.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const payload = {
      id: 'default',
      projeto: 'Chalé Minha Casa no Campo',
      area_util: 0,
      meta_orcamento: 0,
      escolhas: {},
      itens: [],
      dados_planta: {},
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/chale_orcamento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      sucesso: res.ok,
      mensagem: 'Planilha na nuvem resetada com sucesso.',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: err?.message || 'Falha ao resetar nuvem.',
      },
      { status: 500 }
    );
  }
}
