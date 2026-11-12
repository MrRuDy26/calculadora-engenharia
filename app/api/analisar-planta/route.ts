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
  dadosPlanta: {
    areaDetectadaM2: number;
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

    // 4. Prompt de Engenharia Civil e Visão Computacional
    const promptEngenharia = `
Você é um Engenheiro Civil Sênior especialista em Orçamentos Paramétricos e Construção Mista (Madeira e Concreto).
Sua missão é realizar a LEITURA VISUAL DETALHADA E REAL DA PLANTA BAIXA fornecida nesta imagem.

Examine atentamente o desenho técnico, as cotas métricas (largura, comprimento), os nomes dos cômodos, as paredes e as aberturas de portas e janelas.
${areaEstimada ? `(Área de referência inicial informada pelo usuário: ${areaEstimada} m²)` : ''}

REGRAS TÉCNICAS OBRIGATÓRIAS QUE VOCÊ DEVE APLICAR NA EXTRAÇÃO:

1. GEOMETRIA REAL:
   - Detecte a área útil real em m² a partir das dimensões ou proporção da planta.
   - Calcule o perímetro externo total da edificação em metros.
   - Liste todos os cômodos detectados com suas respectivas metragens estimadas.

2. ÁREAS ÚMIDAS (BANHEIRO / BOX):
   - Localize o(s) banheiro(s) na planta.
   - É REGRA MANDATÓRIA DE ENGENHARIA: todas as paredes do banheiro e do box molhado NÃO podem ser de madeira para evitar apodrecimento por umidade e vapor. Devem ser executadas em ALVENARIA CONVENCIONAL (blocos ou tijolos cerâmicos 8 furos, argamassa com aditivo impermeabilizante e revestimento cerâmico/porcelanato no piso e paredes do box).
   - Estime a área de piso do banheiro e a área de paredes de alvenaria em m².

3. FUNDAÇÃO RADIER (CONCRETO ARMADO):
   - Volume de Concreto Usinado FCK 25 MPa = Área Útil × 0.10m (espessura) × 1.10 (10% de folga técnica para nivelamento do solo).
   - Malha de Aço Soldada Nervurada POP Q138 (4,2mm a cada 10cm) = Área Útil × 1.15 (15% de transpasse de armadura conforme NBR 6118).
   - Lona Plástica Preta 200 micras = Área Útil × 1.20 (20% de transpasse e dobras perimétricas contra umidade do solo).
   - Fôrmas e Caixaria em tábuas de pinus/eucalipto 20cm no perímetro externo (+10%).

4. INFRAESTRUTURA HIDRÁULICA E ESGOTO:
   - Tubulações de esgoto sanitário PVC (100mm para vaso, 75mm/50mm/40mm para caixas sifonadas, pia de banheiro e pia de cozinha).
   - Tubulações de água fria e água quente em PPR / CPVC soldáveis e registros de pressão/gaveta.

5. ESTRUTURA DE MADEIRA & PAREDES SECAS:
   - Calcule a área líquida de paredes de madeira (descontando as paredes em alvenaria do banheiro e vãos de esquadrias).
   - É REGRA MANDATÓRIA: Aplique OBRIGATORIAMENTE 10% DE MARGEM TÉCNICA DE PERDA sobre a metragem de tábuas macho-fêmea em Pinus Autoclavado CCA (devido a cortes em obra).
   - Dimensione pilares estruturais de pinus autoclavado 12x12cm e vigas/terças de cobertura 6x16cm (+10% perda).
   - Conectores metálicos e parafusos estruturais galvanizados a fogo.

6. ESQUADRIAS DETECTADAS:
   - Conte exatamente as portas (porta social de entrada, portas de giro internas, porta-balcão de correr) e janelas (janelas de quarto/sala e maxim-ar do banheiro) visíveis na planta baixa.
   - Inclua kit de fixação elástica com espuma expansiva PU e selante PU40 flexível (para absorver a dilatação natural da madeira sem trincar vidros).

7. COBERTURA TERMOACÚSTICA:
   - Telhas sanduíche galvalume com núcleo PIR 30mm trapezoidal (área inclinada + beirais de 60cm). Dispensa caibros intermediários.

VALORES DE MERCADO EM REAIS (BRL):
Atribua valores brutos e descontos realistas baseados na tabela SINAPI e preços médios de insumos para obras de chalés. O valorLiquido deve ser exatamente (valorBruto - desconto).

FORMATO EXCLUSIVO DE RESPOSTA (JSON):
Retorne ESTRITAMENTE um objeto JSON válido no formato abaixo, sem nenhum texto antes ou depois:

{
  "dadosPlanta": {
    "areaDetectadaM2": 45.10,
    "perimetroEstimadoM": 27.40,
    "comodosDetectados": [
      "Quarto / Mezanino",
      "Sala de Estar Integrada",
      "Cozinha Americana",
      "Banheiro Social (Alvenaria)"
    ],
    "areaBanheiroM2": 4.50,
    "paredeAlvenariaBanheiroM2": 18.50,
    "esquadriasDetectadas": {
      "portasGiro": 2,
      "portaSocial": 1,
      "portaBalcao": 1,
      "janelasQuartoSala": 2,
      "janelaMaximAr": 1
    },
    "observacoesEngenharia": [
      "Planta lida com sucesso...",
      "..."
    ]
  },
  "itensGerados": [
    {
      "id": "item-1",
      "codigo": "1.1",
      "descricao": "Concreto Usinado FCK 25 MPa c/ Brita 1 (Esp. 10cm + 10% folga)",
      "categoria": "Fundação",
      "unidade": "m³",
      "quantidade": 4.96,
      "aplicarMargemPerda": true,
      "status": "Em Cotação",
      "valorBruto": 2232.00,
      "desconto": 150.00,
      "valorLiquido": 2082.00,
      "observacoes": "Laje radier monolítica calculada para a área da planta..."
    }
  ]
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

    if (!parsedJson.dadosPlanta || !Array.isArray(parsedJson.itensGerados)) {
      console.log('[BACKEND JSON ERROR] Estrutura JSON recebida não possui dadosPlanta ou itensGerados válidos.');
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'A resposta da IA não contém a estrutura esperada de matriz de custos (dadosPlanta/itensGerados).',
        },
        { status: 500 }
      );
    }

    // Validação e normalização dos itens gerados
    const itensValidados: PlantaItemGerado[] = parsedJson.itensGerados.map((item: any, idx: number) => {
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
    });

    const totalBruto = itensValidados.reduce((acc, it) => acc + it.valorBruto, 0);
    const economiaTotal = itensValidados.reduce((acc, it) => acc + it.desconto, 0);
    const custoTotal = itensValidados.reduce((acc, it) => acc + it.valorLiquido, 0);
    const areaDetectada = Number(parsedJson.dadosPlanta.areaDetectadaM2) || areaEstimada || 45.10;
    const custoPorM2 = areaDetectada > 0 ? Number((custoTotal / areaDetectada).toFixed(2)) : 0;

    const respostaFinal: AnalisePlantaResponse = {
      sucesso: true,
      motorUtilizado: modeloEscolhido as any,
      dadosPlanta: {
        areaDetectadaM2: areaDetectada,
        perimetroEstimadoM: Number(parsedJson.dadosPlanta.perimetroEstimadoM) || 0,
        comodosDetectados: Array.isArray(parsedJson.dadosPlanta.comodosDetectados)
          ? parsedJson.dadosPlanta.comodosDetectados
          : [],
        areaBanheiroM2: Number(parsedJson.dadosPlanta.areaBanheiroM2) || 0,
        paredeAlvenariaBanheiroM2: Number(parsedJson.dadosPlanta.paredeAlvenariaBanheiroM2) || 0,
        esquadriasDetectadas: parsedJson.dadosPlanta.esquadriasDetectadas || {
          portasGiro: 0,
          portaSocial: 0,
          portaBalcao: 0,
          janelasQuartoSala: 0,
          janelaMaximAr: 0,
        },
        observacoesEngenharia: Array.isArray(parsedJson.dadosPlanta.observacoesEngenharia)
          ? parsedJson.dadosPlanta.observacoesEngenharia
          : [],
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
