import { NextResponse } from 'next/server';

// Constante de fallback caso a variável de ambiente não esteja configurada
const FALLBACK_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyUp_D9ISI5r3io9NbiOHIZZ3BVJdbAgKbNGeRI-cWS4QLqxy2r2nLEiAzERgtLVnE2/exec';

// Dados consolidados padrão de engenharia para o Chalé "minha-casa-no-campo"
const DEFAULT_ORCAMENTO = {
  projeto: 'Chalé Compacto Pinus Autoclavado (45,10 m²)',
  dataAtualizacao: '2026-11-11T19:00:00.000Z',
  kpis: {
    custoTotal: 'R$ 44.098,10',
    custoSqm: 'R$ 977,78/m²',
    metaOrcamento: 'R$ 40.000,00',
    economiaProjetada: 'R$ 2.620,00',
  },
  etapas: [
    {
      id: '1.0',
      nome: 'Fundação (Radier de Concreto Armado)',
      status: 'Pronto',
      custo: 5281.10,
      progresso: 100,
      detalhes: 'Escavação compactada, lona 200 micras, ferragem armada e concreto usinado 25 MPa.'
    },
    {
      id: '2.0',
      nome: 'Kit Estrutural Pinus + Cobertura Sanduíche',
      status: 'Em Cotação',
      custo: 31637.00,
      progresso: 60,
      detalhes: 'Pilares e vigas em pinus autoclavado CCA, fixadores galvanizados e telha termoacústica PIR.'
    },
    {
      id: '3.0',
      nome: 'Kit Esquadrias (Portas e Janelas)',
      status: 'Em Cotação',
      custo: 7180.00,
      progresso: 30,
      detalhes: 'Esquadrias em alumínio linha preta, vidros temperados 8mm e vedação perimetral.'
    }
  ],
  metaObra: {
    areaM2: 45.1,
    dimensoes: '5,5m x 8,2m',
    local: 'Minha Casa no Campo',
    responsavel: 'Engenharia & Gestão Própria'
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  const appsScriptUrl =
    process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
    process.env.APPS_SCRIPT_URL ||
    FALLBACK_APPS_SCRIPT_URL;

  try {
    if (!appsScriptUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL do Google Apps Script não configurada nas variáveis de ambiente.',
          ...DEFAULT_ORCAMENTO,
          isFallback: true,
        },
        { status: 500 }
      );
    }

    const response = await fetch(appsScriptUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!response.ok) {
      console.warn(`[API /orcamento] Google Apps Script retornou status HTTP ${response.status}`);
      return NextResponse.json(
        {
          success: true,
          source: 'fallback',
          warning: `Google Apps Script retornou status HTTP ${response.status}. Utilizando base consolidada local.`,
          ...DEFAULT_ORCAMENTO,
          isFallback: true,
        },
        { status: 200 }
      );
    }

    const rawText = await response.text();

    // Se o Google redirecionar para a tela de autenticação (permissão não pública no Apps Script)
    if (
      rawText.trim().startsWith('<') ||
      rawText.includes('<!doctype html') ||
      rawText.includes('accounts.google.com')
    ) {
      console.warn(
        '[API /orcamento] O Apps Script retornou HTML em vez de JSON (autenticação exigida). Usando fallback.'
      );
      return NextResponse.json(
        {
          success: true,
          source: 'fallback_auth_required',
          warning:
            'O Web App do Google Apps Script precisa estar configurado com "Quem tem acesso: Qualquer pessoa" para leitura pública via API. Exibindo dados consolidados de engenharia.',
          ...DEFAULT_ORCAMENTO,
          isFallback: true,
        },
        { status: 200 }
      );
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseError) {
      console.error('[API /orcamento] Erro no JSON.parse da resposta do Sheets:', parseError);
      return NextResponse.json(
        {
          success: true,
          source: 'fallback_parse_error',
          warning: 'Resposta recebida não é um JSON válido. Utilizando dados consolidados.',
          ...DEFAULT_ORCAMENTO,
          isFallback: true,
        },
        { status: 200 }
      );
    }

    // Se a planilha já retorna o payload estruturado ou apenas parte dele
    const consolidatedData = {
      success: true,
      source: 'google_sheets',
      projeto: parsedData.projeto || DEFAULT_ORCAMENTO.projeto,
      dataAtualizacao: parsedData.dataAtualizacao || new Date().toISOString(),
      kpis: {
        custoTotal: parsedData.kpis?.custoTotal ?? DEFAULT_ORCAMENTO.kpis.custoTotal,
        custoSqm: parsedData.kpis?.custoSqm ?? DEFAULT_ORCAMENTO.kpis.custoSqm,
        metaOrcamento: parsedData.kpis?.metaOrcamento ?? DEFAULT_ORCAMENTO.kpis.metaOrcamento,
        economiaProjetada: parsedData.kpis?.economiaProjetada ?? DEFAULT_ORCAMENTO.kpis.economiaProjetada,
      },
      etapas:
        Array.isArray(parsedData.etapas) && parsedData.etapas.length > 0
          ? parsedData.etapas
          : DEFAULT_ORCAMENTO.etapas,
      metaObra: parsedData.metaObra || DEFAULT_ORCAMENTO.metaObra,
      isFallback: false,
    };

    return NextResponse.json(consolidatedData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[API /orcamento] Erro ao buscar dados do Google Apps Script:', error);
    return NextResponse.json(
      {
        success: true,
        source: 'fallback_exception',
        error: error.message || 'Erro ao conectar ao Google Apps Script',
        ...DEFAULT_ORCAMENTO,
        isFallback: true,
      },
      { status: 200 }
    );
  }
}
