'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  Pencil,
  RotateCcw,
  Save,
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Percent,
  Download,
  Filter,
  Layers,
  Home,
  DollarSign,
  TrendingDown,
  Hammer,
  Building,
  ShieldCheck,
  Box,
  UploadCloud,
  FileUp,
  Cpu,
  Scan,
  Eye,
  Check,
  RefreshCw
} from 'lucide-react';
import { PlantaItemGerado, AnalisePlantaResponse } from './api/analisar-planta/route';

export type CategoriaItem =
  | 'Fundação'
  | 'Estrutura & Cobertura'
  | 'Esquadrias'
  | 'Instalações'
  | 'Acabamento'
  | 'Mão de Obra'
  | 'Outros';

export type StatusItem = 'Pronto' | 'Em Execução' | 'Em Cotação' | 'Planejado';

export interface ItemObra {
  id: string;
  codigo: string;
  descricao: string;
  categoria: CategoriaItem;
  unidade: string;
  quantidade: number;
  aplicarMargemPerda: boolean; // Margem técnica de 10%
  status: StatusItem;
  valorBruto: number;
  desconto: number;
  valorLiquido: number;
  observacoes?: string;
}

const STORAGE_ITENS_KEY = 'minha_casa_no_campo_itens_v3';
const STORAGE_AREA_KEY = 'minha_casa_no_campo_area_v3';
const STORAGE_META_KEY = 'minha_casa_no_campo_meta_v3';

const CATEGORIAS: CategoriaItem[] = [
  'Fundação',
  'Estrutura & Cobertura',
  'Esquadrias',
  'Instalações',
  'Acabamento',
  'Mão de Obra',
  'Outros',
];

const STATUS_OPTIONS: StatusItem[] = [
  'Pronto',
  'Em Execução',
  'Em Cotação',
  'Planejado',
];

// Planta baixa arquitetônica vetorial de exemplo (Chalé 45,10 m²: 5,50m x 8,20m)
const PLANTA_EXEMPLO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 550" width="820" height="550" style="background:%230A0F1D;font-family:monospace">
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="%231E293B" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect width="820" height="550" fill="url(%23grid)" />
  
  <!-- Linhas de Cota Arquitetônicas Externas -->
  <line x1="80" y1="50" x2="740" y2="50" stroke="%2338BDF8" stroke-width="1.5" stroke-dasharray="4"/>
  <text x="390" y="42" fill="%2338BDF8" font-size="12" font-weight="bold" text-anchor="middle">8,20 m (COMPRIMENTO TOTAL)</text>
  <line x1="50" y1="80" x2="50" y2="480" stroke="%2338BDF8" stroke-width="1.5" stroke-dasharray="4"/>
  <text x="42" y="290" fill="%2338BDF8" font-size="12" font-weight="bold" text-anchor="middle" transform="rotate(-90 42 290)">5,50 m (LARGURA TOTAL)</text>

  <!-- Laje Radier Perimétrica de Concreto -->
  <rect x="80" y="80" width="660" height="400" fill="%230F172A" stroke="%2338BDF8" stroke-width="4" rx="4"/>
  <text x="730" y="470" fill="%2364748B" font-size="10" text-anchor="end">LAJE RADIER 45,10 m² (ESP. 10cm)</text>

  <!-- PAREDES DE MADEIRA PINUS AUTOCLAVADO CCA (+10% PERDA) -->
  <!-- Sala e Cozinha Americana -->
  <rect x="85" y="85" width="400" height="390" fill="%230F172A" stroke="%23D97706" stroke-width="2"/>
  <text x="285" y="240" fill="%23FCD34D" font-size="14" font-weight="bold" text-anchor="middle">SALA & COZINHA INTEGRADA</text>
  <text x="285" y="260" fill="%2394A3B8" font-size="11" text-anchor="middle">Madeiramento Pinus CCA (Macho-Fêmea)</text>

  <!-- Quarto / Suíte Mezanino -->
  <rect x="490" y="85" width="245" height="230" fill="%230F172A" stroke="%23D97706" stroke-width="2"/>
  <text x="612" y="190" fill="%23FCD34D" font-size="13" font-weight="bold" text-anchor="middle">DORMITÓRIO / MEZANINO</text>
  <text x="612" y="210" fill="%2394A3B8" font-size="10" text-anchor="middle">13,20 m² • Piso Madeira</text>

  <!-- ÁREA ÚMIDA: BANHEIRO SOCIAL EM ALVENARIA CONVENCIONAL -->
  <rect x="490" y="320" width="245" height="155" fill="%231E293B" stroke="%23EF4444" stroke-width="3"/>
  <rect x="630" y="325" width="100" height="145" fill="%23334155" stroke="%2338BDF8" stroke-width="1.5"/>
  <text x="560" y="380" fill="%23FCA5A5" font-size="12" font-weight="bold" text-anchor="middle">BANHEIRO</text>
  <text x="560" y="398" fill="%23F87171" font-size="9" font-weight="bold" text-anchor="middle">[ALVENARIA CONVENCIONAL]</text>
  <text x="560" y="414" fill="%23CBD5E1" font-size="8" text-anchor="middle">Blindagem contra umidade</text>
  <text x="680" y="400" fill="%2338BDF8" font-size="10" font-weight="bold" text-anchor="middle">BOX CHUV.</text>

  <!-- ESQUADRIAS -->
  <!-- Porta Entrada Principal -->
  <rect x="75" y="250" width="10" height="70" fill="%2310B981" stroke="%2334D399" stroke-width="2"/>
  <path d="M 85 250 A 70 70 0 0 1 155 320" fill="none" stroke="%2334D399" stroke-width="1.5" stroke-dasharray="3"/>
  <text x="120" y="240" fill="%2334D399" font-size="9" font-weight="bold">P1 (0,90m Pivotante)</text>

  <!-- Porta Balcão Deck/Varanda -->
  <rect x="230" y="475" width="120" height="10" fill="%2310B981" stroke="%2334D399" stroke-width="2"/>
  <text x="290" y="505" fill="%2334D399" font-size="10" font-weight="bold" text-anchor="middle">PORTA-BALCÃO (1,60x2,10m)</text>

  <!-- Janelas de Quarto e Sala -->
  <rect x="220" y="75" width="90" height="10" fill="%2338BDF8" stroke="%237DD3FC" stroke-width="2"/>
  <text x="265" y="70" fill="%2338BDF8" font-size="9" font-weight="bold" text-anchor="middle">J1 (1,20x1,00m)</text>

  <rect x="735" y="160" width="10" height="80" fill="%2338BDF8" stroke="%237DD3FC" stroke-width="2"/>
  <text x="750" y="205" fill="%2338BDF8" font-size="9" font-weight="bold">J2 (1,20x1,00m)</text>

  <!-- Maxim-ar Banheiro -->
  <rect x="735" y="375" width="10" height="45" fill="%23A855F7" stroke="%23C084FC" stroke-width="2"/>
  <text x="750" y="400" fill="%23C084FC" font-size="9" font-weight="bold">J3 (Maxim-ar)</text>
</svg>`;

export default function DashboardPage() {
  // Parâmetros Globais do Projeto
  const [areaUtil, setAreaUtil] = useState<number>(45.10);
  const [metaOrcamento, setMetaOrcamento] = useState<number>(40000);
  const [itens, setItens] = useState<ItemObra[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Estados de Filtro e Busca
  const [termoBusca, setTermoBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todas');
  const [statusFiltro, setStatusFiltro] = useState<string>('Todos');

  // Estado do Modal de Criação / Edição Manual
  const [isModalAberto, setIsModalAberto] = useState(false);
  const [itemEmEdicao, setItemEmEdicao] = useState<ItemObra | null>(null);

  // Campos do Formulário
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCategoria, setFormCategoria] = useState<CategoriaItem>('Fundação');
  const [formUnidade, setFormUnidade] = useState('m²');
  const [formQuantidade, setFormQuantidade] = useState<number>(1);
  const [formMargemPerda, setFormMargemPerda] = useState(false);
  const [formStatus, setFormStatus] = useState<StatusItem>('Em Cotação');
  const [formValorBruto, setFormValorBruto] = useState<number>(0);
  const [formDesconto, setFormDesconto] = useState<number>(0);
  const [formObservacoes, setFormObservacoes] = useState('');

  // =========================================================================
  // ESTADOS DO MÓDULO IA: VISÃO E LEITURA DE PLANTA BAIXA
  // =========================================================================
  const [imagemPlantaUrl, setImagemPlantaUrl] = useState<string | null>(null);
  const [imagemPlantaBase64, setImagemPlantaBase64] = useState<string | null>(null);
  const [nomeArquivoPlanta, setNomeArquivoPlanta] = useState<string>('');
  const [isAnalisandoPlanta, setIsAnalisandoPlanta] = useState(false);
  const [etapaAnaliseIA, setEtapaAnaliseIA] = useState<string>('');
  const [resultadoAnaliseIA, setResultadoAnaliseIA] = useState<AnalisePlantaResponse | null>(null);
  const [modalResultadoAberto, setModalResultadoAberto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Carregamento inicial do LocalStorage
  useEffect(() => {
    try {
      const areaSalva = localStorage.getItem(STORAGE_AREA_KEY);
      const metaSalva = localStorage.getItem(STORAGE_META_KEY);
      const itensSalvos = localStorage.getItem(STORAGE_ITENS_KEY);

      if (areaSalva) setAreaUtil(Math.max(1, parseFloat(areaSalva) || 45.10));
      if (metaSalva) setMetaOrcamento(Math.max(0, parseFloat(metaSalva) || 40000));
      if (itensSalvos) {
        const parsed = JSON.parse(itensSalvos);
        if (Array.isArray(parsed)) {
          setItens(parsed);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do LocalStorage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Persistência de Dados
  const salvarItens = useCallback((novosItens: ItemObra[]) => {
    setItens(novosItens);
    try {
      localStorage.setItem(STORAGE_ITENS_KEY, JSON.stringify(novosItens));
    } catch (e) {
      console.error('Erro ao persistir itens no LocalStorage:', e);
    }
  }, []);

  const handleAtualizarArea = (novaArea: number) => {
    const val = Math.max(1, novaArea || 1);
    setAreaUtil(val);
    try {
      localStorage.setItem(STORAGE_AREA_KEY, val.toString());
    } catch (e) {
      console.error('Erro ao salvar área:', e);
    }
  };

  const handleAtualizarMeta = (novaMeta: number) => {
    const val = Math.max(0, novaMeta || 0);
    setMetaOrcamento(val);
    try {
      localStorage.setItem(STORAGE_META_KEY, val.toString());
    } catch (e) {
      console.error('Erro ao salvar meta:', e);
    }
  };

  // 3. Cálculos Globais em Tempo Real
  const { custoTotal, totalBruto, economiaTotal, custoSqm, percentualMeta } = useMemo(() => {
    const totalLiq = itens.reduce((acc, item) => acc + (Number(item.valorLiquido) || 0), 0);
    const totalBrt = itens.reduce((acc, item) => acc + (Number(item.valorBruto) || 0), 0);
    const econ = itens.reduce((acc, item) => acc + (Number(item.desconto) || 0), 0);
    const sqm = areaUtil > 0 ? totalLiq / areaUtil : 0;
    const percMeta = metaOrcamento > 0 ? (totalLiq / metaOrcamento) * 100 : 0;

    return {
      custoTotal: totalLiq,
      totalBruto: totalBrt,
      economiaTotal: econ,
      custoSqm: sqm,
      percentualMeta: percMeta,
    };
  }, [itens, areaUtil, metaOrcamento]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // =========================================================================
  // MÓDULOS DE CÁLCULO PARAMÉTRICO DE ENGENHARIA CIVIL
  // =========================================================================

  // Geometria paramétrica estimada (Chalé proporcional retangular ~1:1.5)
  const parametrosGeometricos = useMemo(() => {
    const largura = Math.sqrt(areaUtil / 1.5);
    const comprimento = 1.5 * largura;
    const perimetro = 2 * (largura + comprimento);
    const peDireito = 2.70;
    return { largura, comprimento, perimetro, peDireito };
  }, [areaUtil]);

  // Módulo 1: Radier (Fundação)
  const gerarParametricoRadier = () => {
    const { perimetro } = parametrosGeometricos;
    const volumeConcreto = Number((areaUtil * 0.10 * 1.10).toFixed(2));
    const areaMalha = Number((areaUtil * 1.15).toFixed(2));
    const areaLona = Number((areaUtil * 1.20).toFixed(2));
    const metrosCaixaria = Number((perimetro * 1.10).toFixed(2));

    const novosItensRadier: ItemObra[] = [
      {
        id: `radier-conc-${Date.now()}-1`,
        codigo: '1.1',
        descricao: `Concreto Usinado FCK 25 MPa c/ Brita 1 (Esp. 10cm + 10% folga)`,
        categoria: 'Fundação',
        unidade: 'm³',
        quantidade: volumeConcreto,
        aplicarMargemPerda: true,
        status: 'Pronto',
        valorBruto: Number((volumeConcreto * 440.00).toFixed(2)),
        desconto: Number((volumeConcreto * 30.00).toFixed(2)),
        valorLiquido: Number((volumeConcreto * 410.00).toFixed(2)),
        observacoes: `Dimensionado para laje radier monolítica de ${areaUtil.toFixed(2)} m² com 10 cm de espessura e 10% de folga técnica por irregularidade do solo.`,
      },
      {
        id: `radier-aco-${Date.now()}-2`,
        codigo: '1.2',
        descricao: 'Malha de Aço Soldada POP Q138 (4,2mm a cada 10cm) c/ Transpasse',
        categoria: 'Fundação',
        unidade: 'm²',
        quantidade: areaMalha,
        aplicarMargemPerda: true,
        status: 'Pronto',
        valorBruto: Number((areaMalha * 38.00).toFixed(2)),
        desconto: Number((areaMalha * 2.50).toFixed(2)),
        valorLiquido: Number((areaMalha * 35.50).toFixed(2)),
        observacoes: 'Armadura soldada com 15% de transpasse entre painéis conforme NBR 6118.',
      },
      {
        id: `radier-lona-${Date.now()}-3`,
        codigo: '1.3',
        descricao: 'Lona Plástica Preta 200 Micras (Impermeabilização Sub-Base)',
        categoria: 'Fundação',
        unidade: 'm²',
        quantidade: areaLona,
        aplicarMargemPerda: true,
        status: 'Pronto',
        valorBruto: Number((areaLona * 5.80).toFixed(2)),
        desconto: Number((areaLona * 0.80).toFixed(2)),
        valorLiquido: Number((areaLona * 5.00).toFixed(2)),
        observacoes: 'Barreira impermeável contra umidade ascendente do solo com sobreposições soldadas/coladas.',
      },
      {
        id: `radier-forma-${Date.now()}-4`,
        codigo: '1.4',
        descricao: 'Fôrmas e Caixaria Perimétrica em Tábuas de Pinus 20cm e Sarrafos',
        categoria: 'Fundação',
        unidade: 'm',
        quantidade: metrosCaixaria,
        aplicarMargemPerda: true,
        status: 'Pronto',
        valorBruto: Number((metrosCaixaria * 25.00).toFixed(2)),
        desconto: Number((metrosCaixaria * 3.00).toFixed(2)),
        valorLiquido: Number((metrosCaixaria * 22.00).toFixed(2)),
        observacoes: 'Contenção lateral da laje e escoramento com piquetes e travas niveladas.',
      },
      {
        id: `radier-tubo-${Date.now()}-5`,
        codigo: '1.5',
        descricao: 'Tubulações Hidráulicas Pré-Radier (Passantes de Esgoto e Água)',
        categoria: 'Fundação',
        unidade: 'conjunto',
        quantidade: 1,
        aplicarMargemPerda: false,
        status: 'Pronto',
        valorBruto: Number((areaUtil * 16.00).toFixed(2)),
        desconto: Number((areaUtil * 2.00).toFixed(2)),
        valorLiquido: Number((areaUtil * 14.00).toFixed(2)),
        observacoes: 'Pontos e caixas sifonadas fixadas e testadas antes do lançamento do concreto.',
      },
    ];

    salvarItens([...itens, ...novosItensRadier]);
  };

  // Módulo 2: Estrutura de Madeira (Pinus / Eucalipto Autoclavado CCA c/ 10% perda)
  const gerarParametricoEstrutura = () => {
    const { perimetro, peDireito } = parametrosGeometricos;
    const areaParedesLiquida = perimetro * peDireito * 0.85;
    const areaParedesComPerda = Number((areaParedesLiquida * 1.10).toFixed(2));

    const numPilares = Math.ceil(perimetro / 3.0) + 2;
    const metrosVigamento = Number(((perimetro + parametrosGeometricos.comprimento * 2) * 1.10).toFixed(2));

    const novosItensEstrutura: ItemObra[] = [
      {
        id: `est-paredes-${Date.now()}-1`,
        codigo: '2.1',
        descricao: 'Madeiramento de Paredes Pinus Autoclavado CCA (Macho-Fêmea c/ +10% Perda)',
        categoria: 'Estrutura & Cobertura',
        unidade: 'm²',
        quantidade: areaParedesComPerda,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((areaParedesComPerda * 120.00).toFixed(2)),
        desconto: Number((areaParedesComPerda * 12.00).toFixed(2)),
        valorLiquido: Number((areaParedesComPerda * 108.00).toFixed(2)),
        observacoes: 'Painéis em pinus elliottii usinado tratado sob vácuo-pressão (CCA) contra brocas e cupins com 10% de perda por recortes.',
      },
      {
        id: `est-pilares-${Date.now()}-2`,
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
        observacoes: 'Montantes principais de sustentação fixados sobre a laje radier com sapatas metálicas galvanizadas.',
      },
      {
        id: `est-vigas-${Date.now()}-3`,
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
        observacoes: 'Terças e vigas estruturais com espaçamento otimizado para apoio direto de telhas termoacústicas.',
      },
      {
        id: `est-ferr-${Date.now()}-4`,
        codigo: '2.4',
        descricao: 'Conectores Metálicos, Barras Roscadas e Parafusos Estruturais Galvanizados',
        categoria: 'Estrutura & Cobertura',
        unidade: 'conjunto',
        quantidade: 1,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: Number((areaUtil * 30.00).toFixed(2)),
        desconto: Number((areaUtil * 3.00).toFixed(2)),
        valorLiquido: Number((areaUtil * 27.00).toFixed(2)),
        observacoes: 'Ferragens galvanizadas a fogo para junções nó a nó e ancoragem mecânica em radier.',
      },
    ];

    salvarItens([...itens, ...novosItensEstrutura]);
  };

  // Módulo 3: Cobertura Sanduíche Termoacústica PIR
  const gerarParametricoCobertura = () => {
    const { comprimento } = parametrosGeometricos;
    const areaTelhadoReal = Number((areaUtil * 1.28).toFixed(2));
    const metrosCumeeira = Number((comprimento * 1.10).toFixed(2));
    const qtdParafusos = Math.ceil(areaTelhadoReal * 4.5);

    const novosItensCobertura: ItemObra[] = [
      {
        id: `cob-telha-${Date.now()}-1`,
        codigo: '3.1',
        descricao: 'Telhas Sanduíche Termoacústicas Galvalume PIR 30mm Trapezoidais',
        categoria: 'Estrutura & Cobertura',
        unidade: 'm²',
        quantidade: areaTelhadoReal,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((areaTelhadoReal * 145.00).toFixed(2)),
        desconto: Number((areaTelhadoReal * 13.00).toFixed(2)),
        valorLiquido: Number((areaTelhadoReal * 132.00).toFixed(2)),
        observacoes: 'Otimização estrutural: dispensa caibros e ripas intermediárias, permitindo vãos livres de até 1.80m entre terças.',
      },
      {
        id: `cob-cumeeira-${Date.now()}-2`,
        codigo: '3.2',
        descricao: 'Cumeeiras e Rufos Termoacústicos Galvalume c/ Vedação EPDM',
        categoria: 'Estrutura & Cobertura',
        unidade: 'm',
        quantidade: metrosCumeeira,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((metrosCumeeira * 95.00).toFixed(2)),
        desconto: Number((metrosCumeeira * 9.50).toFixed(2)),
        valorLiquido: Number((metrosCumeeira * 85.50).toFixed(2)),
        observacoes: 'Remates e rufos de vedação para estanqueidade total contra ventos e chuva de granizo.',
      },
      {
        id: `cob-parafusos-${Date.now()}-3`,
        codigo: '3.3',
        descricao: 'Parafusos Autobrocantes 12-14 x 3" c/ Arruela de Vedação Vulcanizada',
        categoria: 'Estrutura & Cobertura',
        unidade: 'unidade',
        quantidade: qtdParafusos,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: Number((qtdParafusos * 2.10).toFixed(2)),
        desconto: Number((qtdParafusos * 0.20).toFixed(2)),
        valorLiquido: Number((qtdParafusos * 1.90).toFixed(2)),
        observacoes: 'Fixação direta nas terças de madeira com arruela de vedação resiliente aos raios UV.',
      },
    ];

    salvarItens([...itens, ...novosItensCobertura]);
  };

  // Módulo 4: Esquadrias e Insumos de Vedação
  const gerarParametricoEsquadrias = () => {
    const novosItensEsquadrias: ItemObra[] = [
      {
        id: `esq-portas-${Date.now()}-1`,
        codigo: '4.1',
        descricao: 'Kit Esquadrias em Alumínio Preto Linha Suprema + Vidros Temperados 8mm',
        categoria: 'Esquadrias',
        unidade: 'conjunto',
        quantidade: 1,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: 6850.00,
        desconto: 500.00,
        valorLiquido: 6350.00,
        observacoes: 'Inclui 1 porta balcão de correr (1,60x2,10m), 2 janelas de quarto (1,20x1,00m) e 1 maxim-ar de banheiro.',
      },
      {
        id: `esq-porta-ent-${Date.now()}-2`,
        codigo: '4.2',
        descricao: 'Porta de Entrada Pivotante em Madeira Maciça c/ Fechadura Rolete',
        categoria: 'Esquadrias',
        unidade: 'unidade',
        quantidade: 1,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: 1650.00,
        desconto: 120.00,
        valorLiquido: 1530.00,
        observacoes: 'Medida 0,90 x 2,10m tratada com verniz marítimo e vedação acústica inferior.',
      },
      {
        id: `esq-insumos-${Date.now()}-3`,
        codigo: '4.3',
        descricao: 'Insumos de Instalação: Espuma Expansiva PU, Pregos Galvanizados e Selante PU40',
        categoria: 'Instalações',
        unidade: 'conjunto',
        quantidade: 1,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: 480.00,
        desconto: 30.00,
        valorLiquido: 450.00,
        observacoes: 'Fixação elástica das esquadrias para absorver dilatação natural da madeira sem trincar vidros.',
      },
    ];

    salvarItens([...itens, ...novosItensEsquadrias]);
  };

  // Módulo 5: Gerar Obra Completa Paramétrica
  const gerarObraCompletaParametrica = () => {
    if (itens.length > 0) {
      if (!confirm('Deseja gerar a obra completa? Os novos módulos de engenharia serão adicionados ao orçamento.')) {
        return;
      }
    }
    gerarParametricoRadier();
    setTimeout(() => gerarParametricoEstrutura(), 50);
    setTimeout(() => gerarParametricoCobertura(), 100);
    setTimeout(() => gerarParametricoEsquadrias(), 150);
  };

  // Limpar / Zerar Tudo
  const handleZerarTudo = () => {
    if (confirm('Tem certeza que deseja zerar a tabela de itens? Todo o orçamento atual será apagado para iniciar um novo planejamento do zero.')) {
      salvarItens([]);
    }
  };

  // Carregar Modelo de Referência Oficial
  const handleCarregarExemploModelo = () => {
    const modeloReferencia: ItemObra[] = [
      {
        id: 'ref-1',
        codigo: '1.0',
        descricao: 'Fundação (Radier de Concreto Armado 25 MPa c/ Malha POP e Lona)',
        categoria: 'Fundação',
        unidade: 'm²',
        quantidade: 45.10,
        aplicarMargemPerda: true,
        status: 'Pronto',
        valorBruto: 5500.00,
        desconto: 218.90,
        valorLiquido: 5281.10,
        observacoes: 'Laje radier monolítica impermeabilizada com 10% de folga técnica executada.',
      },
      {
        id: 'ref-2',
        codigo: '2.0',
        descricao: 'Kit Estrutural Pinus Autoclavado CCA + Cobertura Sanduíche PIR 30mm',
        categoria: 'Estrutura & Cobertura',
        unidade: 'conjunto',
        quantidade: 1,
        aplicarMargemPerda: true,
        status: 'Em Cotação',
        valorBruto: 33500.00,
        desconto: 1863.00,
        valorLiquido: 31637.00,
        observacoes: 'Pilares e vigamento tratado CCA com telha termoacústica dispensando caibros intermediários.',
      },
      {
        id: 'ref-3',
        codigo: '3.0',
        descricao: 'Kit Esquadrias em Alumínio Preto Linha Suprema + Vidros 8mm',
        categoria: 'Esquadrias',
        unidade: 'conjunto',
        quantidade: 1,
        aplicarMargemPerda: false,
        status: 'Em Cotação',
        valorBruto: 7718.10,
        desconto: 538.10,
        valorLiquido: 7180.00,
        observacoes: 'Portas e janelas pretas com vidros temperados e vedação perimetral estanque.',
      },
    ];

    handleAtualizarArea(45.10);
    handleAtualizarMeta(40000);
    salvarItens(modeloReferencia);
  };

  // =========================================================================
  // HANDLERS DO MÓDULO IA: VISÃO E PROCESSAMENTO DA PLANTA BAIXA
  // =========================================================================

  // Helper para converter SVG para PNG Base64 nativo (para compatibilidade total com Gemini Vision)
  const converterSvgParaPngBase64 = (svgDataUri: string): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 820;
          canvas.height = 550;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#0A0F1D';
            ctx.fillRect(0, 0, 820, 550);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(svgDataUri);
          }
        };
        img.onerror = () => resolve(svgDataUri);
        img.src = svgDataUri;
      } catch {
        resolve(svgDataUri);
      }
    });
  };

  // Upload manual de arquivo pelo input
  const handleSelecionarArquivoPlanta = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivoPlanta(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagemPlantaUrl(result);
      setImagemPlantaBase64(result);
      setResultadoAnaliseIA(null);
    };
    reader.readAsDataURL(file);
  };

  // Carregar planta arquitetônica modelo com 1-click
  const handleCarregarPlantaModelo = async () => {
    setNomeArquivoPlanta('planta_arquitetonica_chale_45m2.png');
    setImagemPlantaUrl(PLANTA_EXEMPLO_SVG);
    const pngBase64 = await converterSvgParaPngBase64(PLANTA_EXEMPLO_SVG);
    setImagemPlantaBase64(pngBase64);
    setResultadoAnaliseIA(null);
  };

  // Executar processamento de IA / Visão Computacional
  const handleProcessarPlantaComIA = async () => {
    const imagemAlvo = imagemPlantaBase64 || imagemPlantaUrl;
    if (!imagemAlvo) {
      alert('Por favor, carregue uma imagem da planta baixa ou clique em "Carregar Planta Modelo" primeiro.');
      return;
    }

    setIsAnalisandoPlanta(true);
    setEtapaAnaliseIA('1/5: Escaneando geometria perimétrica e cotas arquitetônicas...');

    const timer1 = setTimeout(() => {
      setEtapaAnaliseIA('2/5: Identificando cômodos e isolando área molhada (Banheiro em Alvenaria)...');
    }, 900);

    const timer2 = setTimeout(() => {
      setEtapaAnaliseIA('3/5: Dimensionando Fundação Radier (10cm + 10% folga) e Malha POP Q138...');
    }, 1800);

    const timer3 = setTimeout(() => {
      setEtapaAnaliseIA('4/5: Calculando volumetria de Pinus CCA com margem técnica obrigatória de +10%...');
    }, 2700);

    const timer4 = setTimeout(() => {
      setEtapaAnaliseIA('5/5: Catalogando esquadrias, contramarcos e tubulações hidrossanitárias...');
    }, 3600);

    try {
      let payloadBase64 = imagemAlvo;
      let mime = 'image/png';
      
      if (imagemAlvo.startsWith('data:image/svg+xml')) {
        payloadBase64 = await converterSvgParaPngBase64(imagemAlvo);
        mime = 'image/png';
      } else if (imagemAlvo.startsWith('data:image/jpeg') || imagemAlvo.startsWith('data:image/jpg')) {
        mime = 'image/jpeg';
      } else if (imagemAlvo.startsWith('data:image/webp')) {
        mime = 'image/webp';
      } else if (imagemAlvo.startsWith('data:application/pdf')) {
        mime = 'application/pdf';
      }

      const response = await fetch('/api/analisar-planta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagemBase64: payloadBase64,
          mimeType: mime,
          areaEstimada: areaUtil,
        }),
      });

      const data: AnalisePlantaResponse = await response.json();

      if (!response.ok || !data.sucesso) {
        throw new Error(data.erro || 'Falha ao processar a planta com o modelo de inteligência artificial Gemini Vision.');
      }

      setResultadoAnaliseIA(data);
      setModalResultadoAberto(true);
    } catch (err: any) {
      console.error('Erro na análise da planta:', err);
      alert(err?.message || 'Ocorreu um erro ao processar a planta. Verifique sua chave GEMINI_API_KEY no arquivo .env.local.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      setIsAnalisandoPlanta(false);
      setEtapaAnaliseIA('');
    }
  };

  // Aplicar itens calculados pela IA na tabela
  const handleAplicarItensIA = (modo: 'substituir' | 'acrescentar') => {
    if (!resultadoAnaliseIA) return;

    const novosItensMapeados: ItemObra[] = resultadoAnaliseIA.itensGerados.map((it) => ({
      id: it.id,
      codigo: it.codigo,
      descricao: it.descricao,
      categoria: it.categoria,
      unidade: it.unidade,
      quantidade: it.quantidade,
      aplicarMargemPerda: it.aplicarMargemPerda,
      status: it.status,
      valorBruto: it.valorBruto,
      desconto: it.desconto,
      valorLiquido: it.valorLiquido,
      observacoes: it.observacoes,
    }));

    if (resultadoAnaliseIA.dadosPlanta.areaDetectadaM2) {
      handleAtualizarArea(resultadoAnaliseIA.dadosPlanta.areaDetectadaM2);
    }

    if (modo === 'substituir') {
      salvarItens(novosItensMapeados);
    } else {
      salvarItens([...itens, ...novosItensMapeados]);
    }

    setModalResultadoAberto(false);
  };

  // =========================================================================
  // CRUD MANUAL: MODAL, EDIÇÃO E EXCLUSÃO
  // =========================================================================

  const abrirFormNovo = () => {
    setItemEmEdicao(null);
    const proximoNum = `${(itens.length + 1).toFixed(1)}`;
    setFormCodigo(proximoNum);
    setFormDescricao('');
    setFormCategoria('Fundação');
    setFormUnidade('m²');
    setFormQuantidade(1);
    setFormMargemPerda(false);
    setFormStatus('Em Cotação');
    setFormValorBruto(0);
    setFormDesconto(0);
    setFormObservacoes('');
    setIsModalAberto(true);
  };

  const abrirFormEdicao = (item: ItemObra) => {
    setItemEmEdicao(item);
    setFormCodigo(item.codigo);
    setFormDescricao(item.descricao);
    setFormCategoria(item.categoria);
    setFormUnidade(item.unidade || 'm²');
    setFormQuantidade(item.quantidade);
    setFormMargemPerda(item.aplicarMargemPerda);
    setFormStatus(item.status);
    setFormValorBruto(item.valorBruto);
    setFormDesconto(item.desconto);
    setFormObservacoes(item.observacoes || '');
    setIsModalAberto(true);
  };

  const fecharModal = () => {
    setIsModalAberto(false);
    setItemEmEdicao(null);
  };

  const handleSalvarItem = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formDescricao.trim()) {
      alert('Por favor, informe a descrição do material ou serviço.');
      return;
    }

    const bruto = Math.max(0, Number(formValorBruto) || 0);
    const desc = Math.max(0, Number(formDesconto) || 0);
    const liquido = Math.max(0, bruto - desc);

    if (itemEmEdicao) {
      const atualizados = itens.map((it) => {
        if (it.id === itemEmEdicao.id) {
          return {
            ...it,
            codigo: formCodigo.trim() || it.codigo,
            descricao: formDescricao.trim(),
            categoria: formCategoria,
            unidade: formUnidade.trim() || 'un',
            quantidade: Number(formQuantidade) || 1,
            aplicarMargemPerda: formMargemPerda,
            status: formStatus,
            valorBruto: bruto,
            desconto: desc,
            valorLiquido: liquido,
            observacoes: formObservacoes.trim(),
          };
        }
        return it;
      });
      salvarItens(atualizados);
    } else {
      const novoItem: ItemObra = {
        id: `item-${Date.now()}`,
        codigo: formCodigo.trim() || `${(itens.length + 1).toFixed(1)}`,
        descricao: formDescricao.trim(),
        categoria: formCategoria,
        unidade: formUnidade.trim() || 'un',
        quantidade: Number(formQuantidade) || 1,
        aplicarMargemPerda: formMargemPerda,
        status: formStatus,
        valorBruto: bruto,
        desconto: desc,
        valorLiquido: liquido,
        observacoes: formObservacoes.trim(),
      };
      salvarItens([...itens, novoItem]);
    }

    fecharModal();
  };

  const handleExcluirItem = (id: string, descricao: string) => {
    if (confirm(`Remover "${descricao}" do orçamento?`)) {
      salvarItens(itens.filter((it) => it.id !== id));
    }
  };

  // Exportar para CSV
  const handleExportarCSV = () => {
    if (itens.length === 0) return;

    const cabecalho = ['Item', 'Descricao', 'Categoria', 'Quantidade', 'Unidade', 'Margem 10% Perda', 'Status', 'Valor Bruto (R$)', 'Desconto (R$)', 'Valor Liquido (R$)', 'Observacoes'];
    const linhas = itens.map((it) => [
      `"${it.codigo}"`,
      `"${it.descricao.replace(/"/g, '""')}"`,
      `"${it.categoria}"`,
      it.quantidade,
      `"${it.unidade}"`,
      it.aplicarMargemPerda ? 'Sim (+10%)' : 'Nao',
      `"${it.status}"`,
      it.valorBruto.toFixed(2),
      it.desconto.toFixed(2),
      it.valorLiquido.toFixed(2),
      `"${(it.observacoes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [cabecalho.join(';'), ...linhas.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `calculo_chale_${areaUtil}m2_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtragem
  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      const matchTexto =
        item.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
        item.codigo.toLowerCase().includes(termoBusca.toLowerCase()) ||
        (item.observacoes && item.observacoes.toLowerCase().includes(termoBusca.toLowerCase()));

      const matchCategoria = categoriaFiltro === 'Todas' || item.categoria === categoriaFiltro;
      const matchStatus = statusFiltro === 'Todos' || item.status === statusFiltro;

      return matchTexto && matchCategoria && matchStatus;
    });
  }, [itens, termoBusca, categoriaFiltro, statusFiltro]);

  const renderStatusBadge = (status: StatusItem) => {
    switch (status) {
      case 'Pronto':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-md border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pronto
          </span>
        );
      case 'Em Execução':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-300 text-xs font-semibold rounded-md border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            Em Execução
          </span>
        );
      case 'Em Cotação':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-md border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            Em Cotação
          </span>
        );
      case 'Planejado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 text-purple-300 text-xs font-semibold rounded-md border border-purple-500/20">
            <Layers className="w-3.5 h-3.5" />
            Planejado
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-slate-400">Iniciando Motor Paramétrico de Engenharia...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-slate-100 p-4 sm:p-6 md:p-10 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Glow Effects de Fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-125 h-125 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-150 h-150 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* ================================================================= */}
        {/* TOPBAR: PARÂMETROS GLOBAIS DA OBRA (ÁREA & META DINÂMICAS)         */}
        {/* ================================================================= */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-800/80 pb-6 gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                Motor Paramétrico de Engenharia
              </span>
              <span className="text-xs text-slate-400">• Chalés & Casas de Campo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Calculadora de Custos de Obra
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Dimensionamento em tempo real com margem técnica de 10% de perda em madeiramento e concreto.
            </p>
          </div>

          {/* Caixa de Parâmetros Principais (Área e Meta Editáveis) */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-lg backdrop-blur-md">
            
            {/* Input Área Útil */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <Home className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <label className="text-[10px] font-mono text-slate-400 block uppercase font-semibold">
                  Área Útil (m²)
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="5"
                  value={areaUtil}
                  onChange={(e) => handleAtualizarArea(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-transparent text-sm font-bold text-white font-mono focus:outline-none"
                  title="Altere a metragem quadrada para recalcular os módulos"
                />
              </div>
            </div>

            {/* Input Meta de Orçamento */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <label className="text-[10px] font-mono text-slate-400 block uppercase font-semibold">
                  Teto / Meta (R$)
                </label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={metaOrcamento}
                  onChange={(e) => handleAtualizarMeta(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-transparent text-sm font-bold text-amber-400 font-mono focus:outline-none"
                  title="Meta orçamentária máxima da obra"
                />
              </div>
            </div>

            {/* Ações de Estado */}
            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <button
                onClick={handleExportarCSV}
                disabled={itens.length === 0}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition disabled:opacity-30 cursor-pointer"
                title="Exportar Planilha CSV para Excel"
              >
                <Download className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={handleZerarTudo}
                className="p-2.5 bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-800 hover:border-rose-900/40 transition cursor-pointer"
                title="Zerar todos os itens (Tabela Limpa)"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleCarregarExemploModelo}
                className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-emerald-400 rounded-xl border border-slate-800 transition cursor-pointer"
                title="Carregar exemplo oficial do Chalé 45,10 m²"
              >
                Exemplo 45m²
              </button>
            </div>

          </div>
        </header>

        {/* ================================================================= */}
        {/* NOVO MÓDULO IA: LEITURA E ANÁLISE INTELIGENTE DE PLANTA BAIXA     */}
        {/* ================================================================= */}
        <section className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  Módulo de Visão Computacional & IA
                </span>
                <span className="text-xs text-slate-400">• Gemini Vision + NBRs de Engenharia</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Scan className="w-5 h-5 text-emerald-400" />
                Leitura Inteligente de Planta Baixa & Orçamento Automático
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Carregue a planta do chalé (PNG, JPG, PDF) para extrair geometria, isolar o banheiro em alvenaria convencional, calcular o Radier e dimensionar o madeiramento com +10% de perda.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCarregarPlantaModelo}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-cyan-400 rounded-xl border border-slate-800 transition cursor-pointer"
                title="Carregar planta arquitetônica de teste (45,10 m²)"
              >
                <Eye className="w-3.5 h-3.5" />
                Carregar Planta Modelo (45,10 m²)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
            
            {/* Área de Upload e Pré-Visualização da Planta */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleSelecionarArquivoPlanta}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition relative group ${
                  imagemPlantaUrl
                    ? 'border-emerald-500/40 bg-slate-950/70 hover:border-emerald-400'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60'
                }`}
              >
                {imagemPlantaUrl ? (
                  <div className="w-full space-y-3">
                    <div className="w-full h-48 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagemPlantaUrl}
                        alt="Preview da Planta Baixa"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <span className="text-xs bg-slate-900/90 text-white px-3 py-1.5 rounded-lg border border-slate-700 font-semibold flex items-center gap-1.5">
                          <FileUp className="w-3.5 h-3.5" />
                          Trocar Arquivo
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span className="truncate max-w-50 font-mono text-slate-300 font-medium">
                        {nomeArquivoPlanta || 'planta_selecionada.png'}
                      </span>
                      <span className="text-emerald-400 font-mono font-semibold">Pronta para leitura</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition duration-200">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-200">
                        Clique para selecionar a imagem da planta
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Suporta PNG, JPG, JPEG, WEBP ou PDF arquitetônico
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Ação: Processar com IA */}
              <button
                onClick={handleProcessarPlantaComIA}
                disabled={isAnalisandoPlanta || !imagemPlantaUrl}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-lg shadow-emerald-950/50 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
              >
                {isAnalisandoPlanta ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Processando Engenharia da Planta...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    <span>Processar Planta e Calcular Engenharia</span>
                  </>
                )}
              </button>
            </div>

            {/* Painel Lateral: Critérios Técnicos da Análise e Status */}
            <div className="lg:col-span-7 flex flex-col justify-between bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5">
              
              {isAnalisandoPlanta ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin flex items-center justify-center"></div>
                    <Cpu className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Analisando Planta Baixa com IA</h4>
                    <p className="text-xs text-emerald-400 font-mono mt-1 animate-pulse">
                      {etapaAnaliseIA}
                    </p>
                  </div>
                  <div className="w-full max-w-sm bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-[pulse_1s_ease-in-out_infinite] w-3/4"></div>
                  </div>
                </div>
              ) : resultadoAnaliseIA ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {resultadoAnaliseIA.motorUtilizado === 'gemini-vision' ? 'Gemini Vision Ativo' : 'Motor Paramétrico NBR Ativo'}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">
                        Planta Processada: {resultadoAnaliseIA.dadosPlanta.areaDetectadaM2.toFixed(2)} m² Detectados
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-400 block">Orçamento Gerado</span>
                      <span className="text-base font-extrabold text-emerald-400 font-mono">
                        {formatMoney(resultadoAnaliseIA.kpisEstimados.custoTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Badges de Cômodos e Áreas Críticas */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Área Molhada</span>
                      <span className="text-xs font-bold text-rose-400 block mt-0.5">
                        Banheiro em Alvenaria
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {resultadoAnaliseIA.dadosPlanta.paredeAlvenariaBanheiroM2} m² alvenaria
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Madeiramento Seco</span>
                      <span className="text-xs font-bold text-amber-400 block mt-0.5">
                        Pinus CCA (+10% perda)
                      </span>
                      <span className="text-[10px] text-slate-500">Paredes e vigamento</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Aberturas Catalogadas</span>
                      <span className="text-xs font-bold text-blue-400 block mt-0.5">
                        {resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.portasGiro + resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.portaSocial + resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.portaBalcao} Portas • {resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.janelasQuartoSala + resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.janelaMaximAr} Janelas
                      </span>
                      <span className="text-[10px] text-slate-500">Alumínio e madeira</span>
                    </div>
                  </div>

                  {/* Lista de Observações Construtivas Detectadas */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5 max-h-36 overflow-y-auto">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                      Diretrizes Técnicas de Engenharia Aplicadas:
                    </span>
                    {resultadoAnaliseIA.dadosPlanta.observacoesEngenharia.map((obs, idx) => (
                      <p key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{obs}</span>
                      </p>
                    ))}
                  </div>

                  {/* Ações de Aplicação do Orçamento */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      onClick={() => handleAplicarItensIA('substituir')}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md text-center"
                    >
                      Substituir Orçamento Atual ({resultadoAnaliseIA.itensGerados.length} Itens)
                    </button>
                    <button
                      onClick={() => handleAplicarItensIA('acrescentar')}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      + Acrescentar aos Existentes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                    Regras de Engenharia que a IA Aplicará:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-emerald-400 block mb-0.5">1. Fundação Radier</span>
                      <span className="text-slate-400 text-[11px] leading-tight block">
                        Laje 10cm + 10% de folga técnica, malha de aço POP Q138 (+15% transpasse) e lona 200 micras.
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-rose-400 block mb-0.5">2. Áreas Úmidas (Banheiro)</span>
                      <span className="text-slate-400 text-[11px] leading-tight block">
                        Isolamento das paredes do banheiro e box em <strong>alvenaria convencional</strong> para vedação contra umidade.
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-amber-400 block mb-0.5">3. Pinus CCA (+10% Perda)</span>
                      <span className="text-slate-400 text-[11px] leading-tight block">
                        Aplica obrigatoriamente 10% de margem técnica de perda por recortes nas tábuas macho-fêmea e vigas.
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-blue-400 block mb-0.5">4. Esquadrias & Tubulações</span>
                      <span className="text-slate-400 text-[11px] leading-tight block">
                        Contagem das aberturas desenhadas, fixação com espuma PU elástica e rede de esgoto/água PPR.
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        </section>

        {/* ================================================================= */}
        {/* PAINEL DE ENGENHARIA PARAMÉTRICA: BOTÕES INTELIGENTES             */}
        {/* ================================================================= */}
        <section className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Módulos de Cálculo Paramétrico Automático (Área: {areaUtil.toFixed(2)} m²)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Clique em um módulo para dimensionar materiais, espessuras e margens de 10% com base nas dimensões calculadas.
              </p>
            </div>

            <button
              onClick={gerarObraCompletaParametrica}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950/40 active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <Box className="w-3.5 h-3.5" />
              Gerar Obra Completa ({areaUtil} m²)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Módulo Radier */}
            <button
              onClick={gerarParametricoRadier}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition group text-left cursor-pointer"
            >
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block group-hover:text-emerald-300">
                  + Fundação Radier
                </span>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                  Concreto 10cm (+10% folga), malha POP e lona 200 micras.
                </span>
              </div>
            </button>

            {/* Módulo Madeira */}
            <button
              onClick={gerarParametricoEstrutura}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition group text-left cursor-pointer"
            >
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20">
                <Hammer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block group-hover:text-amber-300">
                  + Estrutura Madeira (+10%)
                </span>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                  Pinus CCA macho-fêmea, pilares 12x12 e vigamento.
                </span>
              </div>
            </button>

            {/* Módulo Cobertura */}
            <button
              onClick={gerarParametricoCobertura}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-blue-500/40 transition group text-left cursor-pointer"
            >
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block group-hover:text-blue-300">
                  + Cobertura Sanduíche
                </span>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                  Telhas PIR termoacústicas, parafusos c/ EPDM e rufos.
                </span>
              </div>
            </button>

            {/* Módulo Esquadrias */}
            <button
              onClick={gerarParametricoEsquadrias}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-purple-500/40 transition group text-left cursor-pointer"
            >
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 group-hover:bg-purple-500/20">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block group-hover:text-purple-300">
                  + Esquadrias & Vedação
                </span>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                  Portas, janelas em alumínio preto e espuma PU.
                </span>
              </div>
            </button>

          </div>
        </section>

        {/* ================================================================= */}
        {/* CARDS DE KPIS EM TEMPO REAL                                       */}
        {/* ================================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Custo Total */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden group hover:border-slate-700/80 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custo Total da Obra</span>
              <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-4 font-mono tracking-tight">
              {formatMoney(custoTotal)}
            </p>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>Bruto: {formatMoney(totalBruto)}</span>
              <span className="text-emerald-400 font-semibold font-mono">Líquido</span>
            </div>
          </div>

          {/* Custo por m² Dinâmico */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden group hover:border-slate-700/80 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custo por m²</span>
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Home className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400 mt-4 font-mono tracking-tight">
              {formatMoney(custoSqm)}/m²
            </p>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <span className="text-indigo-300 font-mono font-semibold">{areaUtil.toFixed(2)} m²</span>
              <span>área total calibrada</span>
            </p>
          </div>

          {/* Economia Negociada */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden group hover:border-slate-700/80 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Economia Negociada</span>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-4 font-mono tracking-tight">
              {formatMoney(economiaTotal)}
            </p>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descontos e engenharia de valor</span>
            </p>
          </div>

          {/* Meta de Orçamento */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden group hover:border-slate-700/80 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Meta Orçamentária</span>
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
                {formatMoney(metaOrcamento)}
              </p>
              <span className="text-xs font-mono text-slate-400">
                {percentualMeta.toFixed(1)}% atingido
              </span>
            </div>
            {/* Barra de Progresso da Meta */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  percentualMeta > 100 ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, percentualMeta)}%` }}
              ></div>
            </div>
          </div>

        </section>

        {/* ================================================================= */}
        {/* BARRA DE PESQUISA, FILTROS E AÇÃO DE NOVO ITEM                    */}
        {/* ================================================================= */}
        <section className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por material, código ou especificação técnica..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
            {termoBusca && (
              <button
                onClick={() => setTermoBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="Todas" className="bg-slate-900">Todas as Categorias</option>
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="Todos" className="bg-slate-900">Todos os Status</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st} className="bg-slate-900">{st}</option>
                ))}
              </select>
            </div>

            <button
              onClick={abrirFormNovo}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-95 cursor-pointer ml-auto md:ml-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Item Manual
            </button>
          </div>

        </section>

        {/* ================================================================= */}
        {/* TABELA DE MATERIAIS E ITENS ORÇAMENTÁRIOS                         */}
        {/* ================================================================= */}
        <section className="bg-slate-900/80 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Planilha Orçamentária Paramétrica
                <span className="text-xs font-normal text-slate-400 font-mono">
                  ({itensFiltrados.length} itens cadastrados)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Quantitativos e custos calculados com folgas de engenharia. Edite ou exclua qualquer linha diretamente.
              </p>
            </div>

            <div className="text-xs font-mono text-slate-400">
              Total Líquido: <span className="font-bold text-emerald-400 text-sm">{formatMoney(custoTotal)}</span>
            </div>
          </div>

          {itensFiltrados.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <p className="text-sm font-semibold text-slate-300">
                  {itens.length === 0 ? 'Tabela limpa. Nenhum item orçado ainda.' : 'Nenhum item encontrado com os filtros selecionados.'}
                </p>
                <p className="text-xs text-slate-500">
                  {itens.length === 0
                    ? `Carregue uma planta no Módulo de IA acima ou utilize os botões dos módulos de cálculo para a área de ${areaUtil.toFixed(2)} m².`
                    : 'Tente limpar a busca ou selecionar outra categoria.'}
                </p>
              </div>

              {itens.length === 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={gerarObraCompletaParametrica}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/40"
                  >
                    <Box className="w-4 h-4" />
                    Calcular Obra Completa para {areaUtil} m²
                  </button>
                  <button
                    onClick={handleCarregarExemploModelo}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                  >
                    Carregar Exemplo Modelo (45,10 m²)
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTermoBusca('');
                    setCategoriaFiltro('Todas');
                    setStatusFiltro('Todos');
                  }}
                  className="text-xs text-emerald-400 hover:underline cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300 border-collapse">
                <thead className="bg-slate-950/70 text-slate-400 uppercase text-[11px] font-mono tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Item</th>
                    <th className="py-3 px-4 font-semibold">Material / Etapa & Especificação</th>
                    <th className="py-3 px-4 font-semibold">Categoria</th>
                    <th className="py-3 px-4 font-semibold">Quantitativo / Folga</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Valor Bruto</th>
                    <th className="py-3 px-4 font-semibold text-right">Desconto</th>
                    <th className="py-3 px-4 font-semibold text-right">Valor Líquido</th>
                    <th className="py-3 px-4 font-semibold text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {itensFiltrados.map((item) => {
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/25 transition group">
                        
                        {/* Código do Item */}
                        <td className="py-3.5 px-4 font-mono text-slate-400 font-semibold align-top whitespace-nowrap">
                          #{item.codigo}
                        </td>

                        {/* Descrição e Especificações de Engenharia */}
                        <td className="py-3.5 px-4 align-top max-w-md">
                          <div className="font-semibold text-white group-hover:text-emerald-300 transition">
                            {item.descricao}
                          </div>
                          {item.observacoes && (
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {item.observacoes}
                            </p>
                          )}
                        </td>

                        {/* Categoria */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                            {item.categoria}
                          </span>
                        </td>

                        {/* Quantidade & Margem de 10% */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="font-mono text-slate-200 font-bold">
                            {item.quantidade} {item.unidade}
                          </div>
                          {item.aplicarMargemPerda ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-1">
                              <Percent className="w-3 h-3" />
                              Margem 10% inclusa
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 block mt-0.5">Sem perda</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          {renderStatusBadge(item.status)}
                        </td>

                        {/* Valor Bruto */}
                        <td className="py-3.5 px-4 text-right align-top font-mono text-slate-400 whitespace-nowrap">
                          {formatMoney(item.valorBruto)}
                        </td>

                        {/* Desconto */}
                        <td className="py-3.5 px-4 text-right align-top font-mono text-emerald-400 whitespace-nowrap">
                          {item.desconto > 0 ? `-${formatMoney(item.desconto)}` : 'R$ 0,00'}
                        </td>

                        {/* Valor Líquido */}
                        <td className="py-3.5 px-4 text-right align-top font-mono font-bold text-white whitespace-nowrap text-sm">
                          {formatMoney(item.valorLiquido)}
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-center align-top whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => abrirFormEdicao(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                              title="Editar item"
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleExcluirItem(item.id, item.descricao)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-900/50 transition cursor-pointer"
                              title="Excluir item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-950/80 border-t-2 border-slate-800 text-xs font-mono">
                  <tr>
                    <td colSpan={5} className="py-4 px-4 font-bold text-slate-300 uppercase tracking-wider">
                      Totais Calculados ({itensFiltrados.length} itens)
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-400">
                      {formatMoney(itensFiltrados.reduce((a, b) => a + b.valorBruto, 0))}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-400">
                      -{formatMoney(itensFiltrados.reduce((a, b) => a + b.desconto, 0))}
                    </td>
                    <td className="py-4 px-4 text-right font-black text-white text-sm">
                      {formatMoney(itensFiltrados.reduce((a, b) => a + b.valorLiquido, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* ================================================================= */}
        {/* MODAL / FORMULÁRIO PARA NOVO ITEM OU EDIÇÃO                       */}
        {/* ================================================================= */}
        {isModalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl relative my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Header do Modal */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {itemEmEdicao ? `Editar Item #${itemEmEdicao.codigo}` : 'Cadastrar Material / Serviço'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Preencha os dados e aplique a margem de perda técnica quando aplicável.
                    </p>
                  </div>
                </div>
                <button
                  onClick={fecharModal}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSalvarItem} className="p-5 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Código / Item
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 5.1"
                      value={formCodigo}
                      onChange={(e) => setFormCodigo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Categoria
                    </label>
                    <select
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value as CategoriaItem)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {CATEGORIAS.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Descrição do Material / Etapa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Telhas Sanduíche Trapezoidais Galvalume PIR 30mm"
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Quantidade, Unidade e Margem de Perda 10% */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formQuantidade}
                      onChange={(e) => setFormQuantidade(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Unidade de Medida
                    </label>
                    <input
                      type="text"
                      placeholder="m², m³, m, un, conjunto, kg"
                      value={formUnidade}
                      onChange={(e) => setFormUnidade(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={formMargemPerda}
                        onChange={(e) => setFormMargemPerda(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span>Aplicar <strong>+10% perda</strong></span>
                    </label>
                  </div>
                </div>

                {formMargemPerda && (
                  <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Margem técnica ativa: <strong>{(formQuantidade * 1.10).toFixed(2)} {formUnidade}</strong> calculados para aquisição real de obra.
                    </span>
                  </div>
                )}

                {/* Status, Valor Bruto e Desconto */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Status da Etapa
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as StatusItem)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Valor Bruto (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formValorBruto}
                      onChange={(e) => setFormValorBruto(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Desconto / Economia (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formDesconto}
                      onChange={(e) => setFormDesconto(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Resumo Líquido */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Valor Final Líquido:</span>
                  <span className="text-base font-bold font-mono text-white">
                    {formatMoney(Math.max(0, formValorBruto - formDesconto))}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Observações & Especificações Técnicas de Engenharia
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Normas técnicas, fornecedor, prazos ou especificações construtivas..."
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/40"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {itemEmEdicao ? 'Salvar Alterações' : 'Adicionar ao Orçamento'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
