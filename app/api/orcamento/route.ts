import { NextResponse } from 'next/server';

// =========================================================================
// TIPOS E ESTRUTURAS DO MOTOR PARAMÉTRICO DE ENGENHARIA
// =========================================================================

export interface ItemObraCalculado {
  id: string;
  codigo: string;
  descricao: string;
  categoria:
    | 'Fundação'
    | 'Estrutura & Cobertura'
    | 'Esquadrias'
    | 'Instalações'
    | 'Acabamento'
    | 'Mão de Obra'
    | 'Outros';
  unidade: string;
  quantidade: number;
  aplicarMargemPerda: boolean;
  status: 'Pronto' | 'Em Execução' | 'Em Cotação' | 'Planejado';
  valorBruto: number;
  desconto: number;
  valorLiquido: number;
  observacoes: string;
}

export interface GeometriaPlanta {
  areaTotal: number;
  perimetro?: number;
  areaBanheiro?: number;
  paredeBanheiro?: number;
  esquadrias?: {
    portasGiro?: number;
    portaSocial?: number;
    portaBalcao?: number;
    janelasQuartoSala?: number;
    janelaMaximAr?: number;
    totalPortas?: number;
    totalJanelas?: number;
  };
  comodos?: string[];
}

export interface DecisoesEngenharia {
  fundacao: 'Radier de Concreto' | 'Baldrame com Sapatas Isoladas' | 'Estacas/Pilares de Madeira' | string;
  estruturaSeca: 'Madeira Pinus Autoclavado CCA (+10% perda)' | 'Alvenaria Convencional Estrutural' | 'Wood Frame' | string;
  estruturaMolhada: 'Alvenaria Convencional' | 'Drywall RU (Umidade)' | string;
  piso: 'Assoalho de Madeira Maciça' | 'Contrapiso + Piso Cerâmico' | 'Porcelanato' | string;
  maoDeObraFase1: string;
  maoDeObraFase2: string;
}

export interface OrcamentoDecisaoRequest {
  geometria: GeometriaPlanta;
  escolhas: DecisoesEngenharia;
}

// Constante de fallback caso a variável de ambiente não esteja configurada
const FALLBACK_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyUp_D9ISI5r3io9NbiOHIZZ3BVJdbAgKbNGeRI-cWS4QLqxy2r2nLEiAzERgtLVnE2/exec';

// Dados consolidados padrão de engenharia para o Chalé "minha-casa-no-campo"
const DEFAULT_ORCAMENTO = {
  projeto: 'Chalé Compacto Personalizado',
  dataAtualizacao: new Date().toISOString(),
  kpis: {
    custoTotal: 'R$ 0,00',
    custoSqm: 'R$ 0,00/m²',
    metaOrcamento: 'R$ 0,00',
    economiaProjetada: 'R$ 0,00',
  },
  etapas: [],
  metaObra: {
    areaM2: 0,
    dimensoes: 'Variável',
    local: 'Minha Casa no Campo',
    responsavel: 'Engenharia & Gestão Própria'
  }
};

// =========================================================================
// ROTA GET: INTEGRAÇÃO HISTÓRICA / GOOGLE SHEETS
// =========================================================================
export async function GET(request: Request) {
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

    if (
      rawText.trim().startsWith('<') ||
      rawText.includes('<!doctype html') ||
      rawText.includes('accounts.google.com')
    ) {
      return NextResponse.json(
        {
          success: true,
          source: 'fallback_auth_required',
          warning: 'Google Apps Script requer autenticação pública.',
          ...DEFAULT_ORCAMENTO,
          isFallback: true,
        },
        { status: 200 }
      );
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          success: true,
          source: 'fallback_parse_error',
          ...DEFAULT_ORCAMENTO,
          isFallback: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        source: 'google_sheets',
        ...parsedData,
        isFallback: false,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  } catch (error: any) {
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

// =========================================================================
// ROTA POST: MOTOR DE CÁLCULO BASEADO EM GEOMETRIA E ESCOLHAS DO ENGENHEIRO
// =========================================================================
export async function POST(request: Request) {
  try {
    const body: OrcamentoDecisaoRequest = await request.json();
    const { geometria, escolhas } = body;

    if (!geometria || !geometria.areaTotal || geometria.areaTotal <= 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Área da geometria não informada ou inválida. Por favor, forneça uma área maior que zero.',
        },
        { status: 400 }
      );
    }

    if (
      !escolhas ||
      !escolhas.fundacao ||
      !escolhas.estruturaSeca ||
      !escolhas.estruturaMolhada ||
      !escolhas.piso ||
      !escolhas.maoDeObraFase1 ||
      !escolhas.maoDeObraFase2
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Todas as 6 decisões (Fundação, Estrutura Seca, Banheiro, Piso e as 2 Fases de Mão de Obra) devem ser selecionadas.',
        },
        { status: 400 }
      );
    }

    const areaTotal = Number(geometria.areaTotal);
    const larguraEstimada = Math.sqrt(areaTotal / 1.5);
    const comprimentoEstimado = 1.5 * larguraEstimada;
    const perimetroTotal = Number(
      geometria.perimetro && geometria.perimetro > 0
        ? geometria.perimetro
        : 2 * (larguraEstimada + comprimentoEstimado)
    );

    const areaBanheiro = Number(
      geometria.areaBanheiro && geometria.areaBanheiro > 0
        ? geometria.areaBanheiro
        : Math.min(6.0, Math.max(3.5, areaTotal * 0.10))
    );

    const paredeBanheiro = Number(
      geometria.paredeBanheiro && geometria.paredeBanheiro > 0
        ? geometria.paredeBanheiro
        : Math.max(15, areaBanheiro * 3.8)
    );

    const areaSeca = Math.max(5, areaTotal - areaBanheiro);
    const perimetroParedesSecas = Math.max(10, perimetroTotal * 0.85);
    const areaParedesSecas = Number((perimetroParedesSecas * 2.70 * 0.82).toFixed(2));

    const totalPortas = Number(
      geometria.esquadrias?.totalPortas ??
      ((geometria.esquadrias?.portasGiro || 0) +
        (geometria.esquadrias?.portaSocial || 0) +
        (geometria.esquadrias?.portaBalcao || 0) || 3)
    );

    const totalJanelas = Number(
      geometria.esquadrias?.totalJanelas ??
      ((geometria.esquadrias?.janelasQuartoSala || 0) +
        (geometria.esquadrias?.janelaMaximAr || 0) || 3)
    );

    const itens: ItemObraCalculado[] = [];
    const timestamp = Date.now();

    // -----------------------------------------------------------------------
    // GRUPO 1: FUNDAÇÃO
    // -----------------------------------------------------------------------
    if (escolhas.fundacao === 'Radier de Concreto') {
      const volConcreto = Number((areaTotal * 0.10 * 1.10).toFixed(2));
      const areaMalha = Number((areaTotal * 1.15).toFixed(2));
      const areaLona = Number((areaTotal * 1.20).toFixed(2));
      const caixariaM = Number((perimetroTotal * 1.10).toFixed(2));

      itens.push({
        id: `fnd-radier-conc-${timestamp}`,
        codigo: '1.1',
        descricao: `Concreto Usinado FCK 25 MPa c/ Brita 1 (Laje Radier 10cm + 10% folga)`,
        categoria: 'Fundação',
        unidade: 'm³',
        quantidade: volConcreto,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((volConcreto * 440.00).toFixed(2)),
        desconto: Number((volConcreto * 30.00).toFixed(2)),
        valorLiquido: Number((volConcreto * 410.00).toFixed(2)),
        observacoes: `Dimensionado para laje radier monolítica de ${areaTotal.toFixed(2)} m² com 10cm de espessura e 10% de folga por desníveis de solo.`,
      });

      itens.push({
        id: `fnd-radier-aco-${timestamp}`,
        codigo: '1.2',
        descricao: 'Malha de Aço Soldada Nervurada POP Q138 (4,2mm a cada 10cm) c/ Transpasse',
        categoria: 'Fundação',
        unidade: 'm²',
        quantidade: areaMalha,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((areaMalha * 28.00).toFixed(2)),
        desconto: Number((areaMalha * 2.00).toFixed(2)),
        valorLiquido: Number((areaMalha * 26.00).toFixed(2)),
        observacoes: 'Armadura horizontal bidirecional contra retração térmica e esforços cortantes com 15% de transpasse NBR 6118.',
      });

      itens.push({
        id: `fnd-radier-lona-${timestamp}`,
        codigo: '1.3',
        descricao: 'Lona Plástica Preta Pesada 200 Micras (Barreira de Umidade e Vapor)',
        categoria: 'Fundação',
        unidade: 'm²',
        quantidade: areaLona,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((areaLona * 4.50).toFixed(2)),
        desconto: Number((areaLona * 0.50).toFixed(2)),
        valorLiquido: Number((areaLona * 4.00).toFixed(2)),
        observacoes: 'Manta impermeabilizante assentada sobre o terreno compactado com 20% de transpasse perimétrico.',
      });

      itens.push({
        id: `fnd-radier-forma-${timestamp}`,
        codigo: '1.4',
        descricao: 'Fôrmas e Caixaria Perimétrica em Tábuas de Pinus/Eucalipto 20cm',
        categoria: 'Fundação',
        unidade: 'm',
        quantidade: caixariaM,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((caixariaM * 38.00).toFixed(2)),
        desconto: Number((caixariaM * 3.00).toFixed(2)),
        valorLiquido: Number((caixariaM * 35.00).toFixed(2)),
        observacoes: 'Contenção lateral da laje radier travada com piquetes de madeira a cada 60cm.',
      });

      itens.push({
        id: `fnd-radier-hidro-${timestamp}`,
        codigo: '1.5',
        descricao: 'Tubulações Hidráulicas e Esgoto Pré-Concretagem Embutidas no Radier',
        categoria: 'Instalações',
        unidade: 'conjunto',
        quantidade: 1,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((areaTotal * 16.00).toFixed(2)),
        desconto: Number((areaTotal * 2.00).toFixed(2)),
        valorLiquido: Number((areaTotal * 14.00).toFixed(2)),
        observacoes: 'Pontos sifonados e ramais de saída 100mm/50mm passantes testados sob pressão antes da concretagem.',
      });
    } else if (escolhas.fundacao === 'Baldrame com Sapatas Isoladas') {
      const numSapatas = Math.max(6, Math.ceil(areaTotal / 7.0));
      const volConcretoBaldrame = Number((perimetroTotal * 0.20 * 0.35 * 1.15).toFixed(2));
      const pesoAco = Number((perimetroTotal * 4.6).toFixed(2));
      const areaImpermeabilizacao = Number((perimetroTotal * 0.75).toFixed(2));

      itens.push({
        id: `fnd-sapata-escav-${timestamp}`,
        codigo: '1.1',
        descricao: 'Escavação Manual e Apiloamento de Sapatas Isoladas e Valas Baldrame',
        categoria: 'Fundação',
        unidade: 'unidade',
        quantidade: numSapatas,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: numSapatas * 190.00,
        desconto: numSapatas * 15.00,
        valorLiquido: numSapatas * 175.00,
        observacoes: `Escavação de ${numSapatas} sapatas isoladas de 80x80cm até a cota de solo firme com apiloamento de fundo.`,
      });

      itens.push({
        id: `fnd-sapata-conc-${timestamp}`,
        codigo: '1.2',
        descricao: 'Concreto Armado FCK 25 MPa Usinado para Sapatas e Vigas Baldrame',
        categoria: 'Fundação',
        unidade: 'm³',
        quantidade: volConcretoBaldrame,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((volConcretoBaldrame * 480.00).toFixed(2)),
        desconto: Number((volConcretoBaldrame * 30.00).toFixed(2)),
        valorLiquido: Number((volConcretoBaldrame * 450.00).toFixed(2)),
        observacoes: 'Vigas baldrame dimensionadas para travamento estrutural e distribuição de cargas nas sapatas.',
      });

      itens.push({
        id: `fnd-sapata-aco-${timestamp}`,
        codigo: '1.3',
        descricao: 'Aço CA-50 / CA-60 Cortado e Dobrado em Estribos e Armaduras Longitudinais',
        categoria: 'Fundação',
        unidade: 'kg',
        quantidade: pesoAco,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((pesoAco * 13.00).toFixed(2)),
        desconto: Number((pesoAco * 1.00).toFixed(2)),
        valorLiquido: Number((pesoAco * 12.00).toFixed(2)),
        observacoes: 'Gaiolas de armadura montadas com espaçadores plásticos para cobertura mínima de 3cm.',
      });

      itens.push({
        id: `fnd-sapata-imper-${timestamp}`,
        codigo: '1.4',
        descricao: 'Impermeabilização Rígida e Pintura Asfáltica (3 Demãos) em Vigas Baldrame',
        categoria: 'Fundação',
        unidade: 'm²',
        quantidade: areaImpermeabilizacao,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((areaImpermeabilizacao * 35.00).toFixed(2)),
        desconto: Number((areaImpermeabilizacao * 3.00).toFixed(2)),
        valorLiquido: Number((areaImpermeabilizacao * 32.00).toFixed(2)),
        observacoes: 'Blindagem contra umidade ascendente do solo protegendo as paredes superiores.',
      });
    } else {
      // Estacas/Pilares de Madeira
      const numPilaresMadeira = Math.max(8, Math.ceil(areaTotal / 5.0));
      const metrosVigasBarrotes = Number((perimetroTotal * 1.30).toFixed(2));

      itens.push({
        id: `fnd-estaca-madeira-${timestamp}`,
        codigo: '1.1',
        descricao: 'Pilares/Estacas de Eucalipto Tratado Autoclavado CCA Ø 18-20cm (Elevado)',
        categoria: 'Fundação',
        unidade: 'unidade',
        quantidade: numPilaresMadeira,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: numPilaresMadeira * 230.00,
        desconto: numPilaresMadeira * 20.00,
        valorLiquido: numPilaresMadeira * 210.00,
        observacoes: 'Fundação ecológica suspensa em eucalipto tratado com garantia contra fungos e brocas de 15 anos.',
      });

      itens.push({
        id: `fnd-estaca-sapatinha-${timestamp}`,
        codigo: '1.2',
        descricao: 'Sapatas Pontuais em Concreto Ciclópico para Ancoragem dos Pilares',
        categoria: 'Fundação',
        unidade: 'unidade',
        quantidade: numPilaresMadeira,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: numPilaresMadeira * 150.00,
        desconto: numPilaresMadeira * 15.00,
        valorLiquido: numPilaresMadeira * 135.00,
        observacoes: 'Bases de concreto com chumbadores para isolar o topo do pilar do contato direto com a terra.',
      });

      itens.push({
        id: `fnd-estaca-viga-barrote-${timestamp}`,
        codigo: '1.3',
        descricao: 'Vigamento Principal Mestre e Barrotes Elevados 8x20cm Madeira Tratada',
        categoria: 'Fundação',
        unidade: 'm',
        quantidade: metrosVigasBarrotes,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((metrosVigasBarrotes * 88.00).toFixed(2)),
        desconto: Number((metrosVigasBarrotes * 8.00).toFixed(2)),
        valorLiquido: Number((metrosVigasBarrotes * 80.00).toFixed(2)),
        observacoes: 'Grelha estrutural elevada do solo, garantindo circulação de ar e proteção contra animais e umidade.',
      });
    }

    // -----------------------------------------------------------------------
    // GRUPO 2: ESTRUTURA (ÁREAS SECAS)
    // -----------------------------------------------------------------------
    if (escolhas.estruturaSeca.includes('Pinus Autoclavado')) {
      const areaMadeiraComPerda = Number((areaParedesSecas * 1.10).toFixed(2));
      const numPilares = Math.ceil(perimetroTotal / 3.0) + 2;
      const metrosVigamento = Number((perimetroTotal * 1.15).toFixed(2));

      itens.push({
        id: `est-pinus-paredes-${timestamp}`,
        codigo: '2.1',
        descricao: 'Madeiramento de Paredes Pinus Autoclavado CCA (Macho-Fêmea c/ +10% Perda)',
        categoria: 'Estrutura & Cobertura',
        unidade: 'm²',
        quantidade: areaMadeiraComPerda,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((areaMadeiraComPerda * 120.00).toFixed(2)),
        desconto: Number((areaMadeiraComPerda * 12.00).toFixed(2)),
        valorLiquido: Number((areaMadeiraComPerda * 108.00).toFixed(2)),
        observacoes: 'Pranchas em pinus usinado tratado sob vácuo-pressão (CCA) com 10% de perda técnica obrigatória por recortes.',
      });

      itens.push({
        id: `est-pinus-pilares-${timestamp}`,
        codigo: '2.2',
        descricao: 'Pilares Estruturais 12x12cm Pinus Autoclavado CCA 3,00m',
        categoria: 'Estrutura & Cobertura',
        unidade: 'unidade',
        quantidade: numPilares,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: numPilares * 310.00,
        desconto: numPilares * 25.00,
        valorLiquido: numPilares * 285.00,
        observacoes: 'Montantes de sustentação vertical com sapatas metálicas galvanizadas de ancoragem.',
      });

      itens.push({
        id: `est-pinus-vigas-${timestamp}`,
        codigo: '2.3',
        descricao: 'Vigamento e Frechais da Cobertura 6x16cm Pinus CCA (c/ +10% Perda)',
        categoria: 'Estrutura & Cobertura',
        unidade: 'm',
        quantidade: metrosVigamento,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((metrosVigamento * 65.00).toFixed(2)),
        desconto: Number((metrosVigamento * 6.50).toFixed(2)),
        valorLiquido: Number((metrosVigamento * 58.50).toFixed(2)),
        observacoes: 'Terças e vigas estruturais com espaçamento otimizado para apoio direto de cobertura.',
      });

      itens.push({
        id: `est-pinus-ferr-${timestamp}`,
        codigo: '2.4',
        descricao: 'Conectores Metálicos, Barras Roscadas e Parafusos Estruturais Galvanizados',
        categoria: 'Estrutura & Cobertura',
        unidade: 'conjunto',
        quantidade: 1,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((areaTotal * 30.00).toFixed(2)),
        desconto: Number((areaTotal * 3.00).toFixed(2)),
        valorLiquido: Number((areaTotal * 27.00).toFixed(2)),
        observacoes: 'Ferragens galvanizadas a fogo para junções nó a nó e fixação resistente a esforços de vento.',
      });
    } else if (escolhas.estruturaSeca.includes('Alvenaria')) {
      const qtdBlocos = Math.ceil(areaParedesSecas * 13 * 1.08);
      const m2ChapiscoEmboco = Number((areaParedesSecas * 2).toFixed(2));
      const qtdVergas = Math.max(4, totalPortas + totalJanelas);

      itens.push({
        id: `est-alv-blocos-${timestamp}`,
        codigo: '2.1',
        descricao: 'Blocos Cerâmicos Estruturais / Concreto 14x19x39cm (+8% Perda)',
        categoria: 'Estrutura & Cobertura',
        unidade: 'unidade',
        quantidade: qtdBlocos,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((qtdBlocos * 4.90).toFixed(2)),
        desconto: Number((qtdBlocos * 0.40).toFixed(2)),
        valorLiquido: Number((qtdBlocos * 4.50).toFixed(2)),
        observacoes: 'Alvenaria com modulação técnica, assentada com argamassa mista e graute nos pontos de amarração.',
      });

      itens.push({
        id: `est-alv-revest-${timestamp}`,
        codigo: '2.2',
        descricao: 'Chapisco e Emboço Interno e Externo com Argamassa Estabilizada',
        categoria: 'Acabamento',
        unidade: 'm²',
        quantidade: m2ChapiscoEmboco,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((m2ChapiscoEmboco * 40.00).toFixed(2)),
        desconto: Number((m2ChapiscoEmboco * 3.50).toFixed(2)),
        valorLiquido: Number((m2ChapiscoEmboco * 36.50).toFixed(2)),
        observacoes: 'Revestimento de regularização e vedação acústica das paredes de alvenaria.',
      });

      itens.push({
        id: `est-alv-vergas-${timestamp}`,
        codigo: '2.3',
        descricao: 'Vergas e Contravergas Pré-Moldadas para Vãos de Portas e Janelas',
        categoria: 'Estrutura & Cobertura',
        unidade: 'conjunto',
        quantidade: qtdVergas,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: qtdVergas * 90.00,
        desconto: qtdVergas * 10.00,
        valorLiquido: qtdVergas * 80.00,
        observacoes: 'Reforço superior e inferior contra trincas de cisalhamento nos vãos de abertura.',
      });
    } else {
      // Wood Frame
      const metrosMontantes = Number((areaParedesSecas * 3.8).toFixed(2));
      const m2OSB = Number((areaParedesSecas * 1.10).toFixed(2));
      const m2Isolamento = Number((areaParedesSecas).toFixed(2));

      itens.push({
        id: `est-wf-montantes-${timestamp}`,
        codigo: '2.1',
        descricao: 'Montantes e Guias Wood Frame em Madeira Estrutural 2x4 Tratada CCA',
        categoria: 'Estrutura & Cobertura',
        unidade: 'm',
        quantidade: metrosMontantes,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((metrosMontantes * 36.00).toFixed(2)),
        desconto: Number((metrosMontantes * 3.00).toFixed(2)),
        valorLiquido: Number((metrosMontantes * 33.00).toFixed(2)),
        observacoes: 'Esqueleto estrutural leve e modulado a cada 40/60cm conforme normas de Wood Frame.',
      });

      itens.push({
        id: `est-wf-osb-${timestamp}`,
        codigo: '2.2',
        descricao: 'Painéis Estruturais de Contraventamento OSB 11,1mm HomePlus (+10% Perda)',
        categoria: 'Estrutura & Cobertura',
        unidade: 'm²',
        quantidade: m2OSB,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((m2OSB * 70.00).toFixed(2)),
        desconto: Number((m2OSB * 5.00).toFixed(2)),
        valorLiquido: Number((m2OSB * 65.00).toFixed(2)),
        observacoes: 'Chapas fenólicas de rigidez estrutural externa e fixação perimétrica contínua.',
      });

      itens.push({
        id: `est-wf-termo-${timestamp}`,
        codigo: '2.3',
        descricao: 'Isolamento Termoacústico em Lã de Vidro / Rocha 50mm e Barreira de Vapor',
        categoria: 'Acabamento',
        unidade: 'm²',
        quantidade: m2Isolamento,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((m2Isolamento * 44.00).toFixed(2)),
        desconto: Number((m2Isolamento * 4.00).toFixed(2)),
        valorLiquido: Number((m2Isolamento * 40.00).toFixed(2)),
        observacoes: 'Preenchimento do miolo da parede garantindo conforto térmico e bloqueio de ruídos.',
      });
    }

    // -----------------------------------------------------------------------
    // GRUPO 3: ESTRUTURA (ÁREAS MOLHADAS - BANHEIRO)
    // -----------------------------------------------------------------------
    if (escolhas.estruturaMolhada.includes('Alvenaria')) {
      const m2AlvBanheiro = Number(paredeBanheiro.toFixed(2));
      const m2ImpermeabilizacaoBox = Number((areaBanheiro * 2.2).toFixed(2));

      itens.push({
        id: `molh-alv-paredes-${timestamp}`,
        codigo: '3.1',
        descricao: 'Paredes do Banheiro em Alvenaria Convencional com Argamassa Hidrófuga',
        categoria: 'Estrutura & Cobertura',
        unidade: 'm²',
        quantidade: m2AlvBanheiro,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((m2AlvBanheiro * 92.00).toFixed(2)),
        desconto: Number((m2AlvBanheiro * 8.00).toFixed(2)),
        valorLiquido: Number((m2AlvBanheiro * 84.00).toFixed(2)),
        observacoes: 'Barreira maciça em alvenaria protegendo o restante da estrutura contra respingos e vapor dágua.',
      });

      itens.push({
        id: `molh-alv-imper-${timestamp}`,
        codigo: '3.2',
        descricao: 'Impermeabilização Polimérica Rígida e Flexível (3 Demãos) na Área do Box',
        categoria: 'Acabamento',
        unidade: 'm²',
        quantidade: m2ImpermeabilizacaoBox,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((m2ImpermeabilizacaoBox * 58.00).toFixed(2)),
        desconto: Number((m2ImpermeabilizacaoBox * 5.00).toFixed(2)),
        valorLiquido: Number((m2ImpermeabilizacaoBox * 53.00).toFixed(2)),
        observacoes: 'Aplicação com argamassa polimérica (Viaplus/SikaTop) até 1,80m de altura no box e rodapés.',
      });
    } else {
      // Drywall RU (Umidade)
      const m2DrywallRU = Number((paredeBanheiro * 1.10).toFixed(2));
      const m2MembranaRU = Number((areaBanheiro * 2.5).toFixed(2));

      itens.push({
        id: `molh-drywall-ru-${timestamp}`,
        codigo: '3.1',
        descricao: 'Drywall RU Chapa Verde Resistente à Umidade com Estrutura Galvanizada 40cm',
        categoria: 'Estrutura & Cobertura',
        unidade: 'm²',
        quantidade: m2DrywallRU,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((m2DrywallRU * 78.00).toFixed(2)),
        desconto: Number((m2DrywallRU * 6.00).toFixed(2)),
        valorLiquido: Number((m2DrywallRU * 72.00).toFixed(2)),
        observacoes: 'Placa com aditivos hidrofugantes e silicone no núcleo com tratamento de juntas anti-umidade.',
      });

      itens.push({
        id: `molh-drywall-membrana-${timestamp}`,
        codigo: '3.2',
        descricao: 'Membrana Líquida Emborrachada e Fita Elastomérica para Drywall em Box',
        categoria: 'Acabamento',
        unidade: 'm²',
        quantidade: m2MembranaRU,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((m2MembranaRU * 65.00).toFixed(2)),
        desconto: Number((m2MembranaRU * 5.00).toFixed(2)),
        valorLiquido: Number((m2MembranaRU * 60.00).toFixed(2)),
        observacoes: 'Impermeabilização elástica contínua sobre drywall antes do assentamento cerâmico.',
      });
    }

    // -----------------------------------------------------------------------
    // GRUPO 4: PISO / REVESTIMENTO
    // -----------------------------------------------------------------------
    if (escolhas.piso === 'Assoalho de Madeira Maciça') {
      const m2Assoalho = Number((areaSeca * 1.10).toFixed(2));
      const m2BarrotesPiso = Number((areaSeca * 2.2).toFixed(2));
      const m2PisoBanheiro = Number((areaBanheiro * 1.12).toFixed(2));

      itens.push({
        id: `piso-assoalho-madeira-${timestamp}`,
        codigo: '4.1',
        descricao: 'Assoalho de Madeira Maciça Nobre Tratada (Macho-Fêmea c/ +10% Perda)',
        categoria: 'Acabamento',
        unidade: 'm²',
        quantidade: m2Assoalho,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((m2Assoalho * 195.00).toFixed(2)),
        desconto: Number((m2Assoalho * 15.00).toFixed(2)),
        valorLiquido: Number((m2Assoalho * 180.00).toFixed(2)),
        observacoes: 'Réguas maciças encaixadas com conforto térmico excelente, lixadas e finalizadas com verniz PU alto tráfego.',
      });

      itens.push({
        id: `piso-assoalho-barrote-${timestamp}`,
        codigo: '4.2',
        descricao: 'Granzepes e Barrotes Tratados CCA para Nivelamento e Fixação do Assoalho',
        categoria: 'Acabamento',
        unidade: 'm',
        quantidade: m2BarrotesPiso,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((m2BarrotesPiso * 30.00).toFixed(2)),
        desconto: Number((m2BarrotesPiso * 3.00).toFixed(2)),
        valorLiquido: Number((m2BarrotesPiso * 27.00).toFixed(2)),
        observacoes: 'Estrutura secundária de apoio garantindo piso 100% nivelado e sem rangidos.',
      });

      itens.push({
        id: `piso-assoalho-banheiro-${timestamp}`,
        codigo: '4.3',
        descricao: 'Piso Cerâmico Antiderrapante Especial para Área Molhada do Banheiro',
        categoria: 'Acabamento',
        unidade: 'm²',
        quantidade: m2PisoBanheiro,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((m2PisoBanheiro * 78.00).toFixed(2)),
        desconto: Number((m2PisoBanheiro * 6.00).toFixed(2)),
        valorLiquido: Number((m2PisoBanheiro * 72.00).toFixed(2)),
        observacoes: 'Revestimento cerâmico esmaltado PEI-4 para higiene e resistência na área úmida.',
      });
    } else if (escolhas.piso === 'Contrapiso + Piso Cerâmico') {
      const m2Contrapiso = Number(areaTotal.toFixed(2));
      const m2Ceramico = Number((areaTotal * 1.10).toFixed(2));

      itens.push({
        id: `piso-ceramico-contrapiso-${timestamp}`,
        codigo: '4.1',
        descricao: 'Execução de Contrapiso Regularizado com Argamassa Farofa (esp. 3 a 5cm)',
        categoria: 'Acabamento',
        unidade: 'm²',
        quantidade: m2Contrapiso,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((m2Contrapiso * 44.00).toFixed(2)),
        desconto: Number((m2Contrapiso * 4.00).toFixed(2)),
        valorLiquido: Number((m2Contrapiso * 40.00).toFixed(2)),
        observacoes: 'Base plana e nivelada curada com aditivo de aderência.',
      });

      itens.push({
        id: `piso-ceramico-placas-${timestamp}`,
        codigo: '4.2',
        descricao: 'Piso Cerâmico Esmaltado PEI-4 / PEI-5 (+10% Perda) c/ Argamassa AC-II',
        categoria: 'Acabamento',
        unidade: 'm²',
        quantidade: m2Ceramico,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((m2Ceramico * 70.00).toFixed(2)),
        desconto: Number((m2Ceramico * 6.00).toFixed(2)),
        valorLiquido: Number((m2Ceramico * 64.00).toFixed(2)),
        observacoes: 'Solução resistente a tráfego no campo, de fácil limpeza e manutenção econômica.',
      });
    } else {
      // Porcelanato
      const m2Regul = Number(areaTotal.toFixed(2));
      const m2Porcelanato = Number((areaTotal * 1.10).toFixed(2));

      itens.push({
        id: `piso-porc-regularizacao-${timestamp}`,
        codigo: '4.1',
        descricao: 'Regularização e Autonivelamento de Base com Argamassa de Alta Aderência',
        categoria: 'Acabamento',
        unidade: 'm²',
        quantidade: m2Regul,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((m2Regul * 48.00).toFixed(2)),
        desconto: Number((m2Regul * 4.00).toFixed(2)),
        valorLiquido: Number((m2Regul * 44.00).toFixed(2)),
        observacoes: 'Tolerância milimétrica de nivelamento exigida para assentamento de porcelanatos retificados.',
      });

      itens.push({
        id: `piso-porc-placas-${timestamp}`,
        codigo: '4.2',
        descricao: 'Porcelanato Retificado Grande Formato 60x60 / 80x80cm (+10% Perda)',
        categoria: 'Acabamento',
        unidade: 'm²',
        quantidade: m2Porcelanato,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((m2Porcelanato * 118.00).toFixed(2)),
        desconto: Number((m2Porcelanato * 10.00).toFixed(2)),
        valorLiquido: Number((m2Porcelanato * 108.00).toFixed(2)),
        observacoes: 'Argamassa especial AC-III, niveladores plásticos e rejunte acrílico ou epóxi impermeável.',
      });
    }

    // -----------------------------------------------------------------------
    // GRUPO 5: COBERTURA, ESQUADRIAS & INSTALAÇÕES COMPLEMENTARES
    // -----------------------------------------------------------------------
    const areaTelhado = Number((areaTotal * 1.28).toFixed(2));
    const metrosCumeeira = Number((comprimentoEstimado * 1.10).toFixed(2));
    const qtdParafusos = Math.ceil(areaTelhado * 4.5);

    itens.push({
      id: `cob-telha-pir-${timestamp}`,
      codigo: '5.1',
      descricao: 'Telhas Sanduíche Termoacústicas Galvalume PIR 30mm Trapezoidais',
      categoria: 'Estrutura & Cobertura',
      unidade: 'm²',
      quantidade: areaTelhado,
      aplicarMargemPerda: true,
      status: 'Em Cotação',
      valorBruto: Number((areaTelhado * 145.00).toFixed(2)),
      desconto: Number((areaTelhado * 13.00).toFixed(2)),
      valorLiquido: Number((areaTelhado * 132.00).toFixed(2)),
      observacoes: 'Telha sanduíche com poliisocianurato (PIR) garantindo isolamento acústico superior e conforto térmico.',
    });

    itens.push({
      id: `cob-cumeeira-${timestamp}`,
      codigo: '5.2',
      descricao: 'Cumeeiras e Rufos Termoacústicos Galvalume c/ Vedação EPDM',
      categoria: 'Estrutura & Cobertura',
      unidade: 'm',
      quantidade: metrosCumeeira,
      aplicarMargemPerda: true,
      status: 'Em Cotação',
      valorBruto: Number((metrosCumeeira * 95.00).toFixed(2)),
      desconto: Number((metrosCumeeira * 9.50).toFixed(2)),
      valorLiquido: Number((metrosCumeeira * 85.50).toFixed(2)),
      observacoes: 'Estanqueidade completa no encontro das águas do telhado e rufos de vedação perimétricos.',
    });

    itens.push({
      id: `cob-fixadores-${timestamp}`,
      codigo: '5.3',
      descricao: 'Parafusos Autobrocantes 12-14 x 3" c/ Arruela de Vedação Vulcanizada',
      categoria: 'Estrutura & Cobertura',
      unidade: 'unidade',
      quantidade: qtdParafusos,
      aplicarMargemPerda: true,
      status: 'Em Cotação',
      valorBruto: Number((qtdParafusos * 2.10).toFixed(2)),
      desconto: Number((qtdParafusos * 0.20).toFixed(2)),
      valorLiquido: Number((qtdParafusos * 1.90).toFixed(2)),
      observacoes: 'Fixação resistente aos ventos com vedação em borracha de alta durabilidade aos raios UV.',
    });

    itens.push({
      id: `esq-kit-completo-${timestamp}`,
      codigo: '5.4',
      descricao: `Kit Esquadrias em Alumínio Preto Linha Suprema (${totalPortas} Portas, ${totalJanelas} Janelas)`,
      categoria: 'Esquadrias',
      unidade: 'conjunto',
      quantidade: 1,
      aplicarMargemPerda: false,
      status: 'Em Cotação',
      valorBruto: Number((7200.00 + (totalPortas + totalJanelas - 6) * 650.00).toFixed(2)),
      desconto: 550.00,
      valorLiquido: Number((6650.00 + (totalPortas + totalJanelas - 6) * 650.00).toFixed(2)),
      observacoes: 'Esquadrias em perfil preto fosco com vidros temperados 8mm, contramarcos e vedação estanque.',
    });

    itens.push({
      id: `esq-vedacao-pu-${timestamp}`,
      codigo: '5.5',
      descricao: 'Insumos de Instalação: Espuma Expansiva PU Elástica e Selante PU40',
      categoria: 'Instalações',
      unidade: 'conjunto',
      quantidade: 1,
      aplicarMargemPerda: false,
      status: 'Em Cotação',
      valorBruto: 490.00,
      desconto: 40.00,
      valorLiquido: 450.00,
      observacoes: 'Fixação flexível que absorve dilatações diferenciais térmicas sem danificar esquadrias.',
    });

    // =========================================================================
    // ETAPA 6: MÃO DE OBRA & EMPREITADA SEGMENTADA POR FASES
    // =========================================================================
    const { maoDeObraFase1, maoDeObraFase2 } = escolhas;

    // --- FASE 1: FUNDAÇÃO, BASE E HIDRÁULICA (TRABALHO PESADO) ---
    let itemMaoDeObraFase1: ItemObraCalculado;

    if (maoDeObraFase1 === 'Empreitada Fechada (M2) - Pedreiro + Ajudante') {
      const valorUnitario = 200.00;
      const brutoUnitario = 220.00;
      const descontoUnitario = 20.00;
      itemMaoDeObraFase1 = {
        id: `mo-fase1-empreitada-${timestamp}`,
        codigo: '6.1',
        descricao: 'Mão de Obra Fase 1: Fundação, Base e Hidráulica (Empreitada Fechada M²)',
        categoria: 'Mão de Obra',
        unidade: 'm²',
        quantidade: areaTotal,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((areaTotal * brutoUnitario).toFixed(2)),
        desconto: Number((areaTotal * descontoUnitario).toFixed(2)),
        valorLiquido: Number((areaTotal * valorUnitario).toFixed(2)),
        observacoes: 'Equipe de pedreiro e ajudante: locação de obra, escavação, montagem de fôrmas, armaduras de aço, concretagem e tubulações hidráulicas embutidas na base.',
      };
    } else if (maoDeObraFase1 === 'Diárias (Gestão Própria)') {
      const diasEstimados = Math.max(8, Math.ceil(areaTotal * 0.28));
      const valorDiariaDupla = 350.00; // Pedreiro R$ 220 + Servente R$ 130
      const brutoDiaria = 370.00;
      const descontoDiaria = 20.00;
      itemMaoDeObraFase1 = {
        id: `mo-fase1-diarias-${timestamp}`,
        codigo: '6.1',
        descricao: `Mão de Obra Fase 1: Diárias de Pedreiro Oficial + Servente (${diasEstimados} diárias estimadas)`,
        categoria: 'Mão de Obra',
        unidade: 'diária',
        quantidade: diasEstimados,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((diasEstimados * brutoDiaria).toFixed(2)),
        desconto: Number((diasEstimados * descontoDiaria).toFixed(2)),
        valorLiquido: Number((diasEstimados * valorDiariaDupla).toFixed(2)),
        observacoes: 'Gestão direta por diárias para fundações, nivelamento do terreno e tubulações passantes de esgoto/água.',
      };
    } else if (maoDeObraFase1 === 'Autoconstrução (Custo Zero / Apenas Ferramentas)') {
      itemMaoDeObraFase1 = {
        id: `mo-fase1-autoconstrucao-${timestamp}`,
        codigo: '6.1',
        descricao: 'Mão de Obra Fase 1: Fundação, Base e Hidráulica (Autoconstrução / Mutirão Familiar)',
        categoria: 'Mão de Obra',
        unidade: 'verba',
        quantidade: 1,
        aplicarMargemPerda: false,
        status: 'Planejado',
        valorBruto: 0.00,
        desconto: 0.00,
        valorLiquido: 0.00,
        observacoes: 'Execução direta pelo proprietário em regime de autoconstrução. Custo financeiro de mão de obra direta nulo (R$ 0,00).',
      };
    } else {
      itemMaoDeObraFase1 = {
        id: `mo-fase1-custom-${timestamp}`,
        codigo: '6.1',
        descricao: `Mão de Obra Fase 1: Fundação e Hidráulica (${maoDeObraFase1})`,
        categoria: 'Mão de Obra',
        unidade: 'm²',
        quantidade: areaTotal,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((areaTotal * 200.00).toFixed(2)),
        desconto: 0.00,
        valorLiquido: Number((areaTotal * 200.00).toFixed(2)),
        observacoes: 'Mão de obra para serviços pesados de infraestrutura e instalações primárias.',
      };
    }
    itens.push(itemMaoDeObraFase1);

    // --- FASE 2: ESTRUTURA, COBERTURA E ACABAMENTO (TRABALHO LIMPO/MONTAGEM) ---
    let itemMaoDeObraFase2: ItemObraCalculado;

    if (maoDeObraFase2 === 'Empreitada Especializada (Carpintaria/Wood Frame)') {
      const valorUnitario = 260.00;
      const brutoUnitario = 285.00;
      const descontoUnitario = 25.00;
      itemMaoDeObraFase2 = {
        id: `mo-fase2-carpintaria-${timestamp}`,
        codigo: '6.2',
        descricao: 'Mão de Obra Fase 2: Carpintaria Especializada e Montagem Wood Frame/Pinus',
        categoria: 'Mão de Obra',
        unidade: 'm²',
        quantidade: areaTotal,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((areaTotal * brutoUnitario).toFixed(2)),
        desconto: Number((areaTotal * descontoUnitario).toFixed(2)),
        valorLiquido: Number((areaTotal * valorUnitario).toFixed(2)),
        observacoes: 'Profissionais especialistas em estruturas de madeira: montagem de montantes, vigamento aéreo, tesouras de telhado, isolamentos e forros.',
      };
    } else if (maoDeObraFase2 === 'Empreitada Convencional (Pedreiro de Alvenaria)') {
      const valorUnitario = 225.00;
      const brutoUnitario = 250.00;
      const descontoUnitario = 25.00;
      itemMaoDeObraFase2 = {
        id: `mo-fase2-alvenaria-${timestamp}`,
        codigo: '6.2',
        descricao: 'Mão de Obra Fase 2: Alvenaria Convencional, Telhado e Revestimentos',
        categoria: 'Mão de Obra',
        unidade: 'm²',
        quantidade: areaTotal,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((areaTotal * brutoUnitario).toFixed(2)),
        desconto: Number((areaTotal * descontoUnitario).toFixed(2)),
        valorLiquido: Number((areaTotal * valorUnitario).toFixed(2)),
        observacoes: 'Pedreiro e servente: elevação de alvenaria estrutural/vedação, assentamento de revestimentos cerâmicos e cobertura.',
      };
    } else if (maoDeObraFase2 === 'Diárias (Gestão Própria)') {
      const diasEstimados = Math.max(12, Math.ceil(areaTotal * 0.45));
      const valorDiariaDupla = 350.00;
      const brutoDiaria = 375.00;
      const descontoDiaria = 25.00;
      itemMaoDeObraFase2 = {
        id: `mo-fase2-diarias-${timestamp}`,
        codigo: '6.2',
        descricao: `Mão de Obra Fase 2: Diárias de Montagem e Acabamentos (${diasEstimados} diárias estimadas)`,
        categoria: 'Mão de Obra',
        unidade: 'diária',
        quantidade: diasEstimados,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((diasEstimados * brutoDiaria).toFixed(2)),
        desconto: Number((diasEstimados * descontoDiaria).toFixed(2)),
        valorLiquido: Number((diasEstimados * valorDiariaDupla).toFixed(2)),
        observacoes: 'Contratação direta por diárias para montagem da superestrutura, colocação de cobertura e acabamentos finos.',
      };
    } else if (maoDeObraFase2 === 'Autoconstrução (Custo Zero)') {
      itemMaoDeObraFase2 = {
        id: `mo-fase2-autoconstrucao-${timestamp}`,
        codigo: '6.2',
        descricao: 'Mão de Obra Fase 2: Estrutura, Cobertura e Acabamento (Autoconstrução / Faça Você Mesmo)',
        categoria: 'Mão de Obra',
        unidade: 'verba',
        quantidade: 1,
        aplicarMargemPerda: false,
        status: 'Planejado',
        valorBruto: 0.00,
        desconto: 0.00,
        valorLiquido: 0.00,
        observacoes: 'Montagem estrutural e acabamentos executados pelo próprio construtor em regime DIY/mutirão. Custo de mão de obra zerado (R$ 0,00).',
      };
    } else {
      itemMaoDeObraFase2 = {
        id: `mo-fase2-custom-${timestamp}`,
        codigo: '6.2',
        descricao: `Mão de Obra Fase 2: Superestrutura e Acabamentos (${maoDeObraFase2})`,
        categoria: 'Mão de Obra',
        unidade: 'm²',
        quantidade: areaTotal,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((areaTotal * 240.00).toFixed(2)),
        desconto: 0.00,
        valorLiquido: Number((areaTotal * 240.00).toFixed(2)),
        observacoes: 'Mão de obra para fechamentos e acabamentos finos da edificação.',
      };
    }
    itens.push(itemMaoDeObraFase2);

    // Totais calculados
    const totalBruto = itens.reduce((acc, i) => acc + i.valorBruto, 0);
    const economiaTotal = itens.reduce((acc, i) => acc + i.desconto, 0);
    const custoTotal = itens.reduce((acc, i) => acc + i.valorLiquido, 0);
    const custoSqm = areaTotal > 0 ? custoTotal / areaTotal : 0;

    return NextResponse.json({
      sucesso: true,
      itens,
      kpis: {
        custoTotal: Number(custoTotal.toFixed(2)),
        totalBruto: Number(totalBruto.toFixed(2)),
        economiaTotal: Number(economiaTotal.toFixed(2)),
        custoSqm: Number(custoSqm.toFixed(2)),
      },
      resumoDecisoes: {
        fundacao: escolhas.fundacao,
        estruturaSeca: escolhas.estruturaSeca,
        estruturaMolhada: escolhas.estruturaMolhada,
        piso: escolhas.piso,
        maoDeObraFase1: escolhas.maoDeObraFase1,
        maoDeObraFase2: escolhas.maoDeObraFase2,
        areaCalculada: areaTotal,
        qtdItensGerados: itens.length,
      },
    });
  } catch (err: any) {
    console.error('[API /orcamento POST] Erro ao calcular orçamento:', err);
    return NextResponse.json(
      {
        sucesso: false,
        erro: err?.message || 'Erro interno ao processar e calcular quantitativos.',
      },
      { status: 500 }
    );
  }
}
