import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export interface PlantaItemGerado {
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

export interface AnalisePlantaResponse {
  sucesso: boolean;
  motorUtilizado: 'gemini-3.6-flash' | 'gemini-3.8-flash' | 'gemini-3.5-flash' | string;
  areaTotalDetectada: number;
  dadosPlanta: {
    areaDetectadaM2: number;
    areaTotalDetectada: number;
    perimetroEstimadoM: number;
    comodosDetectados: string[];
    areaBanheiroM2: number;
    paredeAlvenariaBanheiroM2: number;
    esquadriasDetectadas: {
      portasGiro: number;
      portaSocial: number;
      portaBalcao: number;
      janelasQuartoSala: number;
      janelaMaximAr: number;
      totalPortas?: number;
      totalJanelas?: number;
    };
    observacoesEngenharia: string[];
  };
  itensGerados: PlantaItemGerado[];
  kpisEstimados: {
    custoTotal: number;
    totalBruto: number;
    economiaTotal: number;
    custoPorM2: number;
  };
  erro?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      imagemBase64,
      mimeType = 'image/png',
      areaEstimada,
      apiKey: apiKeyOverride,
      modelo = 'gemini-3.6-flash',
    } = body;

    // 1. Obtenção da chave de API
    const geminiKey =
      apiKeyOverride ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!geminiKey || geminiKey.trim() === '') {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Chave GEMINI_API_KEY não configurada. Adicione sua chave da Google AI Studio no arquivo .env.local (GEMINI_API_KEY=sua_chave) ou informe no campo de chave da interface.',
        },
        { status: 400 }
      );
    }

    // 2. Validação da imagem recebida
    if (!imagemBase64 || typeof imagemBase64 !== 'string') {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Nenhuma imagem de planta baixa foi enviada. Carregue um arquivo JPG, PNG ou PDF.',
        },
        { status: 400 }
      );
    }

    // Limpeza de prefixo data URI se houver
    const cleanBase64 = imagemBase64.replace(/^data:[^;]+;base64,/, '').trim();
    if (!cleanBase64) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'O arquivo base64 enviado está vazio ou corrompido.',
        },
        { status: 400 }
      );
    }

    // Determina o MIME type aceito pelo Gemini
    let resolvedMimeType = mimeType;
    if (imagemBase64.startsWith('data:image/jpeg') || imagemBase64.startsWith('data:image/jpg')) {
      resolvedMimeType = 'image/jpeg';
    } else if (imagemBase64.startsWith('data:image/png')) {
      resolvedMimeType = 'image/png';
    } else if (imagemBase64.startsWith('data:image/webp')) {
      resolvedMimeType = 'image/webp';
    } else if (imagemBase64.startsWith('data:application/pdf')) {
      resolvedMimeType = 'application/pdf';
    }

    // 3. Inicialização real do Google Generative AI SDK
    const genAI = new GoogleGenerativeAI(geminiKey.trim());
    
    // Suporte prioritário à família moderna de modelos Gemini Flash (gemini-3.6-flash / gemini-3.8-flash)
    const modelosValidos = [
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.7-flash',
    ];
    const modeloEscolhido = modelosValidos.includes(modelo) ? modelo : 'gemini-3.6-flash';

    // 1. Forçar Response em JSON
    const generativeModel = genAI.getGenerativeModel({
      model: modeloEscolhido,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.15,
        maxOutputTokens: 8192,
      },
    });

    // 4. Prompt de Extração Neutra de Geometria e Visão Computacional (Fase 1)
    const promptEngenharia = `
Você é um Especialista em Visão Computacional e Arquitetura/Engenharia.
Sua missão é realizar a EXTRAÇÃO PURA DA GEOMETRIA ESPACIAL DA PLANTA BAIXA fornecida nesta imagem.

Examine atentamente o desenho técnico, as cotas métricas (largura, comprimento), os nomes dos cômodos, as divisórias e as aberturas de portas e janelas.
${areaEstimada ? `(Área de referência inicial estimada: ${areaEstimada} m²)` : ''}

REGRAS DE EXTRAÇÃO GEOMÉTRICA PURA (SEM ATRELAR MATERIAIS):
1. Detecte a Área Útil Real em m² (com base nas cotas ou escala gráfica).
2. Estime o Perímetro Externo total da edificação em metros lineares.
3. Identifique todos os cômodos presentes (Sala, Quarto, Cozinha, Varanda, etc.) com suas metragens.
4. Localize especificamente o Banheiro / Área Úmida e informe sua área em m² e a metragem estimada de suas paredes em m².
5. Conte com exatidão as aberturas: portas (social, internas, correr/balcão) e janelas (quarto, sala, maxim-ar/banheiro).
6. Liste observações técnicas puramente geométricas da planta.

ATENÇÃO: NÃO imponha nem atrele nenhum material ou método construtivo pré-definido (não dite concreto, alvenaria ou madeira). Apenas extraia a geometria pura.

FORMATO EXCLUSIVO DE RESPOSTA (JSON):
Retorne ESTRITAMENTE um objeto JSON válido no formato abaixo, sem nenhum texto antes ou depois:

{
  "areaTotalDetectada": 45.10,
  "dadosPlanta": {
    "areaTotalDetectada": 45.10,
    "areaDetectadaM2": 45.10,
    "perimetroEstimadoM": 27.40,
    "comodosDetectados": [
      "Quarto / Mezanino",
      "Sala Integrada",
      "Cozinha Americana",
      "Banheiro"
    ],
    "areaBanheiroM2": 4.50,
    "paredeBanheiroM2": 18.50,
    "esquadriasDetectadas": {
      "portasGiro": 2,
      "portaSocial": 1,
      "portaBalcao": 1,
      "janelasQuartoSala": 2,
      "janelaMaximAr": 1,
      "totalPortas": 4,
      "totalJanelas": 3
    },
    "observacoesGeometria": [
      "Geometria retangular aproximada de 5,50m x 8,20m",
      "Banheiro posicionado na lateral posterior com área de 4,50m²",
      "Total de 4 portas e 3 janelas catalogadas"
    ]
  }
}
`;

    // 5. Chamada real à API Gemini Vision
    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: resolvedMimeType,
      },
    };

    // 2. Tratamento de Exceções (Try/Catch) envolvendo toda a chamada generateContent
    let result;
    try {
      console.log(`[API ANALISAR-PLANTA] Enviando imagem (${resolvedMimeType}) para modelo ${modeloEscolhido}...`);
      result = await generativeModel.generateContent([
        promptEngenharia,
        imagePart,
      ]);
    } catch (apiError: any) {
      // 4. Log de Servidor: Mostra no terminal o exato erro caso a API do Google retorne falha
      console.log('====================================================');
      console.log('[BACKEND GEMINI ERROR] A API do Google retornou falha:');
      console.log('Status HTTP:', apiError?.status || 'N/A');
      console.log('Mensagem de Erro:', apiError?.message || String(apiError));
      if (apiError?.errorDetails) {
        console.log('Error Details:', JSON.stringify(apiError.errorDetails, null, 2));
      }
      console.log('====================================================');

      const msgErro = apiError?.message || String(apiError);
      let explicacaoAmigavel = msgErro;

      if (
        msgErro.includes('API_KEY_SERVICE_BLOCKED') ||
        msgErro.includes('blocked') ||
        msgErro.includes('Permission denied') ||
        msgErro.includes('ACCESS_DENIED')
      ) {
        explicacaoAmigavel =
          'Acesso negado à API do Gemini (403: Permission denied / ACCESS_DENIED). A "Generative Language API" não está autorizada para esta chave ou projeto. Acesse https://aistudio.google.com/app/apikey para gerar uma chave direta do Google AI Studio com a API habilitada, e atualize o GEMINI_API_KEY no arquivo .env.local.';
      } else if (msgErro.includes('API_KEY_INVALID') || msgErro.includes('not valid') || msgErro.includes('API key not valid')) {
        explicacaoAmigavel =
          'A chave GEMINI_API_KEY configurada no .env.local não é válida. Verifique e atualize no Google AI Studio (aistudio.google.com).';
      } else if (msgErro.includes('RESOURCE_EXHAUSTED') || msgErro.includes('429') || msgErro.includes('quota')) {
        explicacaoAmigavel =
          'Limite de cota de requisições excedido na API Gemini. Aguarde alguns instantes antes de tentar novamente.';
      }

      return NextResponse.json(
        {
          sucesso: false,
          erro: explicacaoAmigavel,
        },
        { status: 500 }
      );
    }

    // Extração do texto de resposta com proteção
    let rawText = '';
    try {
      const response = await result.response;
      rawText = response.text() || '';
    } catch (textErr: any) {
      console.log('[BACKEND GEMINI ERROR] Falha ao extrair texto da resposta:', textErr?.message || textErr);
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'A resposta do Gemini não pôde ser lida (possível bloqueio de segurança ou retorno vazio).',
        },
        { status: 500 }
      );
    }

    console.log('[API ANALISAR-PLANTA] Resposta recebida do Gemini. Caracteres:', rawText.length);

    // 3. Validação do Retorno: remova manualmente eventuais crases de markdown do texto usando .replace(/```json/g, "").replace(/```/g, "")
    let textoLimpo = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    // Extrai o objeto JSON válido delimitado por { e } caso haja texto antes ou depois
    const primeiroColchete = textoLimpo.indexOf('{');
    const ultimoColchete = textoLimpo.lastIndexOf('}');
    if (primeiroColchete !== -1 && ultimoColchete !== -1 && ultimoColchete >= primeiroColchete) {
      textoLimpo = textoLimpo.substring(primeiroColchete, ultimoColchete + 1);
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(textoLimpo);
    } catch (parseError: any) {
      console.log('====================================================');
      console.log('[BACKEND JSON PARSE ERROR] Falha ao interpretar JSON retornado pela IA:');
      console.log('Erro de parse:', parseError?.message || parseError);
      console.log('Texto bruto recebido (primeiros 300 caracteres):', textoLimpo.substring(0, 300));
      console.log('====================================================');

      return NextResponse.json(
        {
          sucesso: false,
          erro: 'O modelo de inteligência artificial gerou uma resposta incompleta ou inválida. Tente reenviar a imagem.',
          textoRecebido: textoLimpo.substring(0, 400),
        },
        { status: 500 }
      );
    }

    if (!parsedJson.dadosPlanta) {
      console.log('[BACKEND JSON ERROR] Estrutura JSON recebida não possui dadosPlanta válidos.');
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'A resposta da IA não contém os dados geométricos esperados da planta (dadosPlanta).',
        },
        { status: 500 }
      );
    }

    const areaDetectada =
      Number(parsedJson.areaTotalDetectada) ||
      Number(parsedJson.dadosPlanta?.areaTotalDetectada) ||
      Number(parsedJson.dadosPlanta?.areaDetectadaM2) ||
      Number(areaEstimada) ||
      0;

    const esquadriasDetectadas = parsedJson.dadosPlanta?.esquadriasDetectadas || {};
    const totalPortas =
      Number(esquadriasDetectadas.totalPortas) ||
      ((Number(esquadriasDetectadas.portasGiro) || 0) +
        (Number(esquadriasDetectadas.portaSocial) || 0) +
        (Number(esquadriasDetectadas.portaBalcao) || 0)) ||
      0;
    const totalJanelas =
      Number(esquadriasDetectadas.totalJanelas) ||
      ((Number(esquadriasDetectadas.janelasQuartoSala) || 0) +
        (Number(esquadriasDetectadas.janelaMaximAr) || 0)) ||
      0;

    // Validação de itens caso existam
    const itensValidados: PlantaItemGerado[] = Array.isArray(parsedJson.itensGerados)
      ? parsedJson.itensGerados.map((item: any, idx: number) => {
          const bruto = Number(item.valorBruto) || 0;
          const desc = Number(item.desconto) || 0;
          const liq = Math.max(0, bruto - desc);

          return {
            id: item.id || `ai-${Date.now()}-${idx + 1}`,
            codigo: item.codigo || `${(idx + 1).toFixed(1)}`,
            descricao: String(item.descricao || 'Item de Engenharia'),
            categoria: item.categoria || 'Outros',
            unidade: item.unidade || 'un',
            quantidade: Number(item.quantidade) || 1,
            aplicarMargemPerda: Boolean(item.aplicarMargemPerda),
            status: item.status || 'Em Cotação',
            valorBruto: Number(bruto.toFixed(2)),
            desconto: Number(desc.toFixed(2)),
            valorLiquido: Number(liq.toFixed(2)),
            observacoes: String(item.observacoes || ''),
          };
        })
      : [];

    const totalBruto = itensValidados.reduce((acc, it) => acc + it.valorBruto, 0);
    const economiaTotal = itensValidados.reduce((acc, it) => acc + it.desconto, 0);
    const custoTotal = itensValidados.reduce((acc, it) => acc + it.valorLiquido, 0);
    const custoPorM2 = areaDetectada > 0 ? Number((custoTotal / areaDetectada).toFixed(2)) : 0;

    const observacoes = Array.isArray(parsedJson.dadosPlanta.observacoesGeometria)
      ? parsedJson.dadosPlanta.observacoesGeometria
      : Array.isArray(parsedJson.dadosPlanta.observacoesEngenharia)
      ? parsedJson.dadosPlanta.observacoesEngenharia
      : ['Geometria espacial identificada com sucesso pela IA.'];

    const respostaFinal: AnalisePlantaResponse = {
      sucesso: true,
      motorUtilizado: modeloEscolhido as any,
      areaTotalDetectada: areaDetectada,
      dadosPlanta: {
        areaDetectadaM2: areaDetectada,
        areaTotalDetectada: areaDetectada,
        perimetroEstimadoM: Number(parsedJson.dadosPlanta.perimetroEstimadoM) || 0,
        comodosDetectados: Array.isArray(parsedJson.dadosPlanta.comodosDetectados)
          ? parsedJson.dadosPlanta.comodosDetectados
          : ['Espaço Integrado', 'Dormitório', 'Banheiro'],
        areaBanheiroM2: Number(parsedJson.dadosPlanta.areaBanheiroM2) || 4.5,
        paredeAlvenariaBanheiroM2:
          Number(parsedJson.dadosPlanta.paredeBanheiroM2 || parsedJson.dadosPlanta.paredeAlvenariaBanheiroM2) || 16,
        esquadriasDetectadas: {
          portasGiro: Number(esquadriasDetectadas.portasGiro) || 0,
          portaSocial: Number(esquadriasDetectadas.portaSocial) || 0,
          portaBalcao: Number(esquadriasDetectadas.portaBalcao) || 0,
          janelasQuartoSala: Number(esquadriasDetectadas.janelasQuartoSala) || 0,
          janelaMaximAr: Number(esquadriasDetectadas.janelaMaximAr) || 0,
        },
        observacoesEngenharia: observacoes,
      },
      itensGerados: itensValidados,
      kpisEstimados: {
        custoTotal: Number(custoTotal.toFixed(2)),
        totalBruto: Number(totalBruto.toFixed(2)),
        economiaTotal: Number(economiaTotal.toFixed(2)),
        custoPorM2,
      },
    };

    return NextResponse.json(respostaFinal);
  } catch (error: any) {
    const mensagemErro =
      error?.message ||
      (typeof error === 'string' ? error : 'Falha desconhecida ao processar requisição');

    console.log('====================================================');
    console.log('[ERRO GERAL NO BACKEND /api/analisar-planta]:', mensagemErro);
    console.log('====================================================');

    return NextResponse.json(
      {
        sucesso: false,
        erro: `Falha na requisição: ${mensagemErro}`,
      },
      { status: 500 }
    );
  }
}
