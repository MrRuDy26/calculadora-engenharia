import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ItemExtraidoLista {
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

export interface ProcessarListaResponse {
  sucesso: boolean;
  resumo?: string;
  totalItens: number;
  valorTotalEstimado: number;
  itens: ItemExtraidoLista[];
  erro?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { texto, imagemBase64, arquivoBase64, mimeType = 'image/png' } = body;
    const base64Final = imagemBase64 || arquivoBase64;

    if ((!texto || !texto.trim()) && (!base64Final || !base64Final.trim())) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Envie um texto com a lista de quantitativos ou uma imagem/PDF do orçamento.',
        },
        { status: 400 }
      );
    }

    const geminiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!geminiKey || geminiKey.trim() === '') {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Chave GEMINI_API_KEY não configurada no servidor (.env.local).',
        },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const promptInstrucao = `
Você é um Engenheiro Civil e Orçamentista Sênior com vasta experiência em obras residenciais e chalés de campo no Brasil.
O usuário recebeu uma LISTA DE QUANTITATIVOS DE MATERIAIS E SERVIÇOS fornecida por um mestre de obras, pedreiro, carpinteiro ou loja de materiais (pode ser mensagem de WhatsApp, anotações de canteiro, PDF ou foto).

SUA MISSÃO:
Analisar criticamente a lista, identificar CADA insumo, material e serviço, organizá-los e classificá-los em uma estrutura orçamentária profissional padronizada.

REGRAS DE CONVERSÃO E CLASSIFICAÇÃO:
1. "categoria": DEVE ser ESTRITAMENTE uma das seguintes 7 opções:
   - "Fundação": escavações, radier, baldrame, sapatas, concreto usinado/ensacado, areia, brita, ferro CA-50/CA-60 para base, lona preta, fôrmas de base.
   - "Estrutura & Cobertura": pilares, vigas, montantes, madeira pinus/eucalipto tratado, wood frame, tesouras, caibros, ripas, telhas termoacústicas/sanduíche/cerâmicas, cumeeiras, parafusos estruturais autobrocantes, manta térmica.
   - "Esquadrias": portas de entrada, portas internas, portas de correr/balcão, janelas blindex/alumínio, basculantes/maxim-ar, fechaduras, dobradiças, guarnições.
   - "Instalações": tubos PVC esgoto, tubos PVC soldável água fria, registros, conexões, caixas de gordura/sifonadas, eletrodutos corrugados, caixas 4x2, fiação flexível, disjuntores, selante PU40, espuma expansiva.
   - "Acabamento": revestimentos cerâmicos, porcelanato, assoalho de madeira, rodapés, argamassa colante AC-II/AC-III, rejunte, impermeabilizantes (tipo Denver/Vedacit), tintas, verniz marítimo/stain.
   - "Mão de Obra": diárias de pedreiro, diárias de carpinteiro, servente/ajudante, empreitadas parciais ou globais de montagem.
   - "Outros": caçamba de entulho, frete, aluguel de betoneira ou andaime, insumos gerais.

2. "codigo": numeração ordenada lógica (ex: "1.1", "1.2" para fundação, "2.1", "2.2" para estrutura, "3.1" para esquadrias, etc.).
3. "descricao": título técnico claro com dimensões e especificações quando identificáveis.
4. "unidade": unidade de medida correta ("m²", "m³", "m", "saco", "barra", "kg", "unidade", "conjunto", "diária", "vg", "litro", "peça", "rolo").
5. "quantidade": número positivo decimal ou inteiro.
6. "aplicarMargemPerda": true para madeiras e revestimentos que sofrem perdas por corte (~10%), false para itens pré-moldados, esquadrias ou mão de obra.
7. "status": "Em Cotação".
8. "valorBruto", "desconto", "valorLiquido":
   - Se a lista original trouxer preços unitários ou totais, use-os fielmente.
   - Se a lista NÃO trouxer preços, estime valores médios realistas de mercado brasileiro (SINAPI / varejo de construção civil) em Reais (BRL).
   - "desconto" pode ser 0 ou uma margem de desconto para pagamento à vista (~5%).
   - "valorLiquido" = valorBruto - desconto.
9. "observacoes": breve nota técnica sobre aplicação, bitola ou especificação do insumo.

RETORNE ESTRITAMENTE UM JSON COM O SEGUINTE FORMATO:
{
  "sucesso": true,
  "resumo": "Resumo sintético dos materiais e serviços extraídos da lista",
  "totalItens": 0,
  "valorTotalEstimado": 0,
  "itens": [
    {
      "codigo": "1.1",
      "descricao": "Cimento Portland CP II-Z-32 50kg",
      "categoria": "Fundação",
      "unidade": "saco",
      "quantidade": 40,
      "aplicarMargemPerda": false,
      "status": "Em Cotação",
      "valorBruto": 1520.00,
      "desconto": 76.00,
      "valorLiquido": 1444.00,
      "observacoes": "Para concretagem de radier e argamassas"
    }
  ]
}
`;

    const partesConteudo: any[] = [];
    partesConteudo.push(promptInstrucao);

    if (texto && texto.trim()) {
      partesConteudo.push(`\n\n--- TEXTO / LISTA FORNECIDA PELO CLIENTE OU FORNECEDOR ---\n${texto.trim()}`);
    }

    if (base64Final && base64Final.trim()) {
      const cleanBase64 = base64Final.replace(/^data:[^;]+;base64,/, '').trim();
      let resolvedMime = mimeType;
      if (base64Final.startsWith('data:image/jpeg') || base64Final.startsWith('data:image/jpg')) {
        resolvedMime = 'image/jpeg';
      } else if (base64Final.startsWith('data:image/png')) {
        resolvedMime = 'image/png';
      } else if (base64Final.startsWith('data:image/webp')) {
        resolvedMime = 'image/webp';
      } else if (base64Final.startsWith('data:application/pdf')) {
        resolvedMime = 'application/pdf';
      }

      partesConteudo.push({
        inlineData: {
          data: cleanBase64,
          mimeType: resolvedMime,
        },
      });
    }

    console.log('[API PROCESSAR-LISTA] Chamando Gemini 3.6 Flash...');
    const result = await model.generateContent(partesConteudo);
    const response = await result.response;
    const rawText = response.text() || '';

    let textoLimpo = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const primeiroColchete = textoLimpo.indexOf('{');
    const ultimoColchete = textoLimpo.lastIndexOf('}');
    if (primeiroColchete !== -1 && ultimoColchete !== -1 && ultimoColchete >= primeiroColchete) {
      textoLimpo = textoLimpo.substring(primeiroColchete, ultimoColchete + 1);
    }

    const parsed = JSON.parse(textoLimpo);
    const timestamp = Date.now();

    const itensMapeados: ItemExtraidoLista[] = Array.isArray(parsed.itens)
      ? parsed.itens.map((it: any, idx: number) => {
          const bruto = Math.max(0, Number(it.valorBruto) || 0);
          const desc = Math.max(0, Number(it.desconto) || 0);
          const liq = Math.max(0, bruto - desc);

          const categoriasValidas = [
            'Fundação',
            'Estrutura & Cobertura',
            'Esquadrias',
            'Instalações',
            'Acabamento',
            'Mão de Obra',
            'Outros',
          ];
          const cat = categoriasValidas.includes(it.categoria) ? it.categoria : 'Outros';

          return {
            id: `item-lista-${timestamp}-${idx + 1}`,
            codigo: it.codigo ? String(it.codigo) : `${(idx + 1).toFixed(1)}`,
            descricao: String(it.descricao || `Item ${idx + 1}`),
            categoria: cat,
            unidade: String(it.unidade || 'un'),
            quantidade: Math.max(0.01, Number(it.quantidade) || 1),
            aplicarMargemPerda: Boolean(it.aplicarMargemPerda),
            status: it.status || 'Em Cotação',
            valorBruto: Number(bruto.toFixed(2)),
            desconto: Number(desc.toFixed(2)),
            valorLiquido: Number(liq.toFixed(2)),
            observacoes: String(it.observacoes || ''),
          };
        })
      : [];

    const valorTotal = itensMapeados.reduce((acc, i) => acc + i.valorLiquido, 0);

    return NextResponse.json({
      sucesso: true,
      resumo: parsed.resumo || `Lista processada com sucesso: ${itensMapeados.length} itens identificados.`,
      totalItens: itensMapeados.length,
      valorTotalEstimado: Number(valorTotal.toFixed(2)),
      itens: itensMapeados,
    });
  } catch (err: any) {
    console.error('[API PROCESSAR-LISTA ERROR]:', err);
    return NextResponse.json(
      {
        sucesso: false,
        erro: err?.message || 'Erro ao processar a lista de quantitativos com IA.',
      },
      { status: 500 }
    );
  }
}
