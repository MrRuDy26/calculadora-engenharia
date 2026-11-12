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
  RefreshCw,
  Lock
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

export default function DashboardPage() {
  // Parâmetros Globais do Projeto
  // Parâmetros Globais do Projeto (Iniciam 100% Zerados até a IA ler a planta ou usuário preencher)
  const [areaUtil, setAreaUtil] = useState<number>(0);
  const [metaOrcamento, setMetaOrcamento] = useState<number>(0);
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

  // =========================================================================
  // FASE 2: ESTADOS DE DECISÃO CONSTRUTIVA DO ENGENHEIRO (PAINEL DINÂMICO)
  // =========================================================================
  const [escolhaFundacao, setEscolhaFundacao] = useState<string>('');
  const [escolhaEstruturaSeca, setEscolhaEstruturaSeca] = useState<string>('');
  const [escolhaEstruturaMolhada, setEscolhaEstruturaMolhada] = useState<string>('');
  const [escolhaPiso, setEscolhaPiso] = useState<string>('');
  const [isGerandoOrcamento, setIsGerandoOrcamento] = useState(false);

  const todasEscolhasFeitas = Boolean(
    escolhaFundacao && escolhaEstruturaSeca && escolhaEstruturaMolhada && escolhaPiso
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Carregamento inicial do LocalStorage
  useEffect(() => {
    try {
      const areaSalva = localStorage.getItem(STORAGE_AREA_KEY);
      const metaSalva = localStorage.getItem(STORAGE_META_KEY);
      const itensSalvos = localStorage.getItem(STORAGE_ITENS_KEY);

      if (areaSalva !== null) setAreaUtil(parseFloat(areaSalva) || 0);
      if (metaSalva !== null) setMetaOrcamento(parseFloat(metaSalva) || 0);
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
    const val = Math.max(0, novaArea || 0);
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
    if (areaUtil <= 0) {
      return { largura: 0, comprimento: 0, perimetro: 0, peDireito: 2.70 };
    }
    const largura = Math.sqrt(areaUtil / 1.5);
    const comprimento = 1.5 * largura;
    const perimetro = 2 * (largura + comprimento);
    const peDireito = 2.70;
    return { largura, comprimento, perimetro, peDireito };
  }, [areaUtil]);

  // Módulo 1: Radier (Fundação)
  const gerarParametricoRadier = () => {
    if (areaUtil <= 0) {
      alert('Defina uma Área Útil (m²) maior que zero ou faça o upload da planta com IA para calcular a fundação.');
      return;
    }
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
    if (areaUtil <= 0) {
      alert('Defina uma Área Útil (m²) maior que zero ou faça o upload da planta com IA para calcular a estrutura.');
      return;
    }
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
    if (areaUtil <= 0) {
      alert('Defina uma Área Útil (m²) maior que zero ou faça o upload da planta com IA para calcular a cobertura.');
      return;
    }
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
    if (areaUtil <= 0) {
      alert('Defina uma Área Útil (m²) maior que zero ou faça o upload da planta com IA para calcular as esquadrias.');
      return;
    }
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
    if (areaUtil <= 0) {
      alert('Defina uma Área Útil (m²) maior que zero ou faça o upload da planta com IA para gerar a obra completa.');
      return;
    }
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

  // Limpar / Zerar Tudo (Tabela, Área, Meta, Planta e LocalStorage)
  const handleZerarTudo = () => {
    if (confirm('Tem certeza que deseja zerar tudo? Todo o orçamento atual, área útil e planta carregada serão limpos.')) {
      salvarItens([]);
      handleAtualizarArea(0);
      handleAtualizarMeta(0);
      setImagemPlantaUrl(null);
      setImagemPlantaBase64(null);
      setNomeArquivoPlanta('');
      setResultadoAnaliseIA(null);
      setEscolhaFundacao('');
      setEscolhaEstruturaSeca('');
      setEscolhaEstruturaMolhada('');
      setEscolhaPiso('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      try {
        localStorage.removeItem(STORAGE_ITENS_KEY);
        localStorage.removeItem(STORAGE_AREA_KEY);
        localStorage.removeItem(STORAGE_META_KEY);
      } catch (e) {
        console.error('Erro ao limpar LocalStorage:', e);
      }
    }
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



  // Executar processamento de IA / Visão Computacional
  const handleProcessarPlantaComIA = async () => {
    const imagemAlvo = imagemPlantaBase64 || imagemPlantaUrl;
    if (!imagemAlvo) {
      alert('Por favor, carregue uma imagem (PNG, JPG) ou PDF da planta baixa para processar com a IA.');
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

      let data: AnalisePlantaResponse;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error('O servidor backend retornou uma resposta inválida ou vazia. Verifique o console do terminal para mais detalhes.');
      }

      if (!response.ok || !data.sucesso) {
        throw new Error(data.erro || 'Falha ao processar a planta com o modelo de inteligência artificial Gemini Vision.');
      }

      // 2. Atualiza automaticamente o estado areaUtil com a área lida pela IA (ex: 60m²)
      const areaDetectadaIA =
        Number(data.areaTotalDetectada) ||
        Number(data.dadosPlanta?.areaTotalDetectada) ||
        Number(data.dadosPlanta?.areaDetectadaM2);

      if (areaDetectadaIA && areaDetectadaIA > 0) {
        handleAtualizarArea(areaDetectadaIA);
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

    const areaDetectadaIA =
      Number(resultadoAnaliseIA.areaTotalDetectada) ||
      Number(resultadoAnaliseIA.dadosPlanta.areaTotalDetectada) ||
      Number(resultadoAnaliseIA.dadosPlanta.areaDetectadaM2);

    if (areaDetectadaIA && areaDetectadaIA > 0) {
      handleAtualizarArea(areaDetectadaIA);
    }

    if (modo === 'substituir') {
      salvarItens(novosItensMapeados);
    } else {
      salvarItens([...itens, ...novosItensMapeados]);
    }

    setModalResultadoAberto(false);
  };

  // =========================================================================
  // FASE 3: MOTOR DE CÁLCULO BASEADO EM GEOMETRIA E ESCOLHAS (/api/orcamento)
  // =========================================================================
  const handleGerarOrcamentoDecisoes = async () => {
    if (!todasEscolhasFeitas) {
      alert('Por favor, selecione todas as 4 opções construtivas (Fundação, Estrutura Seca, Banheiro e Piso) antes de gerar o orçamento.');
      return;
    }

    if (areaUtil <= 0) {
      alert('Defina a Área Útil (m²) no cabeçalho ou faça o upload da planta para que a IA extraia as dimensões.');
      return;
    }

    setIsGerandoOrcamento(true);
    try {
      const totalPortas =
        Number(resultadoAnaliseIA?.dadosPlanta?.esquadriasDetectadas?.totalPortas) ||
        ((Number(resultadoAnaliseIA?.dadosPlanta?.esquadriasDetectadas?.portasGiro) || 0) +
          (Number(resultadoAnaliseIA?.dadosPlanta?.esquadriasDetectadas?.portaSocial) || 0) +
          (Number(resultadoAnaliseIA?.dadosPlanta?.esquadriasDetectadas?.portaBalcao) || 0)) ||
        3;

      const totalJanelas =
        Number(resultadoAnaliseIA?.dadosPlanta?.esquadriasDetectadas?.totalJanelas) ||
        ((Number(resultadoAnaliseIA?.dadosPlanta?.esquadriasDetectadas?.janelasQuartoSala) || 0) +
          (Number(resultadoAnaliseIA?.dadosPlanta?.esquadriasDetectadas?.janelaMaximAr) || 0)) ||
        3;

      const res = await fetch('/api/orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geometria: {
            areaTotal: areaUtil,
            perimetro: resultadoAnaliseIA?.dadosPlanta?.perimetroEstimadoM || parametrosGeometricos.perimetro,
            areaBanheiro: resultadoAnaliseIA?.dadosPlanta?.areaBanheiroM2,
            paredeBanheiro: resultadoAnaliseIA?.dadosPlanta?.paredeAlvenariaBanheiroM2,
            esquadrias: {
              ...resultadoAnaliseIA?.dadosPlanta?.esquadriasDetectadas,
              totalPortas,
              totalJanelas,
            },
            comodos: resultadoAnaliseIA?.dadosPlanta?.comodosDetectados,
          },
          escolhas: {
            fundacao: escolhaFundacao,
            estruturaSeca: escolhaEstruturaSeca,
            estruturaMolhada: escolhaEstruturaMolhada,
            piso: escolhaPiso,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.sucesso) {
        throw new Error(data.erro || 'Falha ao processar orçamento paramétrico.');
      }

      salvarItens(data.itens);

      // Scroll suave até a tabela de orçamento
      setTimeout(() => {
        const el = document.getElementById('secao-tabela-orcamento');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      console.error('Erro ao gerar orçamento por decisões:', err);
      alert(err?.message || 'Erro ao gerar o orçamento.');
    } finally {
      setIsGerandoOrcamento(false);
    }
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
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                Motor Paramétrico de Engenharia
              </span>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md">
                {areaUtil > 0 ? `Área Calibrada: ${areaUtil.toFixed(2)} m²` : 'Aguardando Planta (0 m²)'}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">• Dimensionamento em Tempo Real</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Calculadora de Custos de Obra — <span className="text-emerald-400 font-mono">{areaUtil > 0 ? `${areaUtil.toFixed(2)} m²` : 'Aguardando Planta'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {areaUtil > 0
                ? `Todos os parâmetros estruturais, radier e quantitativos estão calibrados dinamicamente para ${areaUtil.toFixed(2)} m².`
                : 'Envie a planta baixa pela IA ou defina a área útil para iniciar o dimensionamento e cálculo de custos.'}
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
                  min="0"
                  placeholder="0"
                  value={areaUtil === 0 ? '' : areaUtil}
                  onChange={(e) => handleAtualizarArea(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-transparent text-sm font-bold text-white font-mono focus:outline-none placeholder:text-slate-600"
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
                  placeholder="0"
                  value={metaOrcamento === 0 ? '' : metaOrcamento}
                  onChange={(e) => handleAtualizarMeta(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-transparent text-sm font-bold text-amber-400 font-mono focus:outline-none placeholder:text-slate-600"
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
                title="Zerar Tudo (Limpar Itens, Área e Planta)"
              >
                <Trash2 className="w-4 h-4" />
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
                Leitura e Extração de Geometria da Planta Baixa
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Carregue a planta para extrair a geometria e inicie a orçamentação.
              </p>
            </div>

            {imagemPlantaUrl && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-mono font-medium flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5" />
                  Planta Selecionada
                </span>
                <button
                  onClick={() => {
                    setImagemPlantaUrl(null);
                    setImagemPlantaBase64(null);
                    setNomeArquivoPlanta('');
                    setResultadoAnaliseIA(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 text-xs transition cursor-pointer"
                  title="Remover planta"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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

            {/* Painel Lateral: Extração Neutra de Geometria (Fase 1) */}
            <div className="lg:col-span-7 flex flex-col justify-between bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5">
              
              {isAnalisandoPlanta ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin flex items-center justify-center"></div>
                    <Cpu className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Extraindo Geometria Espacial da Planta com IA</h4>
                    <p className="text-xs text-emerald-400 font-mono mt-1 animate-pulse">
                      {etapaAnaliseIA || 'Processando cotas métricas, divisórias e aberturas...'}
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
                        Fase 1: Geometria Espacial Extraída
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                        Planta Processada: {resultadoAnaliseIA.dadosPlanta.areaDetectadaM2.toFixed(2)} m² Detectados
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-400 block">Perímetro Total</span>
                      <span className="text-sm font-extrabold text-indigo-400 font-mono">
                        {resultadoAnaliseIA.dadosPlanta.perimetroEstimadoM?.toFixed(2) || '—'} m
                      </span>
                    </div>
                  </div>

                  {/* Cards de Geometria Pura (Sem Atrelar Material) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Área Molhada</span>
                      <span className="text-xs font-bold text-rose-400 block mt-0.5">
                        Banheiro: {resultadoAnaliseIA.dadosPlanta.areaBanheiroM2?.toFixed(2) || '4.50'} m²
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {resultadoAnaliseIA.dadosPlanta.paredeAlvenariaBanheiroM2 || 16} m² de paredes
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Aberturas Catalogadas</span>
                      <span className="text-xs font-bold text-blue-400 block mt-0.5">
                        {(resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.portasGiro || 0) +
                          (resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.portaSocial || 0) +
                          (resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.portaBalcao || 0) ||
                          resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.totalPortas || 0} Portas, {(resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.janelasQuartoSala || 0) +
                          (resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.janelaMaximAr || 0) ||
                          resultadoAnaliseIA.dadosPlanta.esquadriasDetectadas.totalJanelas || 0} Janelas
                      </span>
                      <span className="text-[10px] text-slate-500">Vãos de esquadrias</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Área Seca Estimada</span>
                      <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                        {Math.max(0, areaUtil - (resultadoAnaliseIA.dadosPlanta.areaBanheiroM2 || 4.5)).toFixed(2)} m²
                      </span>
                      <span className="text-[10px] text-slate-500">Quarto, sala e convívio</span>
                    </div>
                  </div>

                  {/* Cômodos Identificados de Forma Neutra */}
                  {resultadoAnaliseIA.dadosPlanta.comodosDetectados && resultadoAnaliseIA.dadosPlanta.comodosDetectados.length > 0 && (
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1.5">
                        Compartimentação e Cômodos Detectados:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {resultadoAnaliseIA.dadosPlanta.comodosDetectados.map((comodo, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-slate-800/90 text-slate-200 text-xs rounded-lg border border-slate-700/80 font-medium"
                          >
                            {comodo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Banner de Direcionamento para Fase 2 */}
                  <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <span className="text-xs text-indigo-300 font-medium">
                      Geometria capturada com sucesso. Prossiga para o Painel de Escolha do Usuário abaixo.
                    </span>
                    <a
                      href="#painel-decisoes"
                      className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg transition shrink-0"
                    >
                      Ir para Decisões ↓
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                    <Scan className="w-4 h-4 text-emerald-400" />
                    Extração Neutra de Geometria Arquitetônica
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ao processar a planta baixa, a IA extrai estritamente as medidas físicas reais do projeto, sem engessar materiais ou impor escolhas prévias:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-emerald-400 block mb-0.5">1. Metragens & Cotas</span>
                      <span className="text-slate-400 text-[11px] leading-tight block">
                        Cálculo da área útil real (m²) e perímetro externo total em metros lineares.
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-blue-400 block mb-0.5">2. Cômodos & Divisórias</span>
                      <span className="text-slate-400 text-[11px] leading-tight block">
                        Mapeamento de ambientes integrados, quartos e isolamento da área molhada do banheiro.
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-purple-400 block mb-0.5">3. Portas & Janelas</span>
                      <span className="text-slate-400 text-[11px] leading-tight block">
                        Contagem exata de esquadrias, vãos de iluminação e ventilação.
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-amber-400 block mb-0.5">4. Liberdade Construtiva</span>
                      <span className="text-slate-400 text-[11px] leading-tight block">
                        Você decide os sistemas de fundação, estrutura e pisos no painel interativo.
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        </section>

        {/* ================================================================= */}
        {/* FASE 2: PAINEL DE ESCOLHA DO USUÁRIO & DECISÕES CONSTRUTIVAS     */}
        {/* ================================================================= */}
        <section id="painel-decisoes" className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md">
                  Fase 2: Escolha dos Métodos de Engenharia
                </span>
                {areaUtil > 0 && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                    Área Base: {areaUtil.toFixed(2)} m²
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Painel de Decisões Construtivas (Escolha do Engenheiro)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Selecione as diretrizes construtivas do chalé. O motor de cálculo utilizará a geometria e essas 4 decisões para calcular quantitativos reais.
              </p>
            </div>

            {/* Indicador de Seleção */}
            <div className="text-left sm:text-right">
              <span className="text-xs font-mono text-slate-400 block">Progresso das Decisões</span>
              <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md inline-block mt-0.5 ${
                todasEscolhasFeitas
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {[escolhaFundacao, escolhaEstruturaSeca, escolhaEstruturaMolhada, escolhaPiso].filter(Boolean).length} de 4 Decididas
              </span>
            </div>
          </div>

          {/* Grid com os 4 Dropdowns (Selects Obrigatórios) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
            
            {/* 1. Fundação */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
                <span>1. Fundação</span>
                {escolhaFundacao && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </label>
              <select
                value={escolhaFundacao}
                onChange={(e) => setEscolhaFundacao(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Radier de Concreto">Radier de Concreto</option>
                <option value="Baldrame com Sapatas Isoladas">Baldrame com Sapatas Isoladas</option>
                <option value="Estacas/Pilares de Madeira">Estacas/Pilares de Madeira</option>
              </select>
              <p className="text-[11px] text-slate-500 leading-tight">
                Define a base estrutural, escavação e ancoragem mecânica.
              </p>
            </div>

            {/* 2. Estrutura (Áreas Secas) */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
                <span>2. Estrutura (Áreas Secas)</span>
                {escolhaEstruturaSeca && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </label>
              <select
                value={escolhaEstruturaSeca}
                onChange={(e) => setEscolhaEstruturaSeca(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Madeira Pinus Autoclavado CCA (+10% perda)">Madeira Pinus Autoclavado CCA (+10% perda)</option>
                <option value="Alvenaria Convencional Estrutural">Alvenaria Convencional Estrutural</option>
                <option value="Wood Frame">Wood Frame</option>
              </select>
              <p className="text-[11px] text-slate-500 leading-tight">
                Painéis de vedação, pilares e vigamento de amarração.
              </p>
            </div>

            {/* 3. Estrutura (Áreas Molhadas - Banheiros) */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
                <span>3. Banheiro (Área Molhada)</span>
                {escolhaEstruturaMolhada && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </label>
              <select
                value={escolhaEstruturaMolhada}
                onChange={(e) => setEscolhaEstruturaMolhada(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Alvenaria Convencional">Alvenaria Convencional</option>
                <option value="Drywall RU (Umidade)">Drywall RU (Umidade)</option>
              </select>
              <p className="text-[11px] text-slate-500 leading-tight">
                Proteção contra umidade, vapor e impermeabilização do box.
              </p>
            </div>

            {/* 4. Piso / Revestimento */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
                <span>4. Piso / Revestimento</span>
                {escolhaPiso && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </label>
              <select
                value={escolhaPiso}
                onChange={(e) => setEscolhaPiso(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Assoalho de Madeira Maciça">Assoalho de Madeira Maciça</option>
                <option value="Contrapiso + Piso Cerâmico">Contrapiso + Piso Cerâmico</option>
                <option value="Porcelanato">Porcelanato</option>
              </select>
              <p className="text-[11px] text-slate-500 leading-tight">
                Regularização de base, acabamento de piso e rejuntes.
              </p>
            </div>

          </div>

          {/* FASE 3: BOTÃO DE GERAÇÃO BASEADO NAS ESCOLHAS */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs">
              {!todasEscolhasFeitas ? (
                <span className="flex items-center gap-1.5 text-amber-400 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Selecione as 4 opções acima para habilitar o cálculo.
                </span>
              ) : areaUtil <= 0 ? (
                <span className="flex items-center gap-1.5 text-amber-400 font-mono">
                  <Lock className="w-4 h-4 shrink-0" />
                  Defina a Área Útil no topo ou processe a planta com IA para calcular.
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Decisões completas! Pronto para orçar para {areaUtil.toFixed(2)} m².
                </span>
              )}
            </div>

            <button
              onClick={handleGerarOrcamentoDecisoes}
              disabled={!todasEscolhasFeitas || isGerandoOrcamento || areaUtil <= 0}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-xs sm:text-sm font-bold rounded-xl transition shadow-xl cursor-pointer ${
                todasEscolhasFeitas && areaUtil > 0 && !isGerandoOrcamento
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
              }`}
            >
              {isGerandoOrcamento ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Gerando Quantitativos no Backend (/api/orcamento)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>Gerar Quantitativos Baseado nas Escolhas</span>
                </>
              )}
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
              {areaUtil > 0 ? `${formatMoney(custoSqm)}/m²` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              {areaUtil > 0 ? (
                <>
                  <span className="text-indigo-300 font-mono font-semibold">{areaUtil.toFixed(2)} m²</span>
                  <span>área ativa ({formatMoney(custoTotal)} ÷ {areaUtil.toFixed(2)} m²)</span>
                </>
              ) : (
                <span className="text-amber-400/80 font-mono">Aguardando Planta / Área (0 m²)</span>
              )}
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
                {metaOrcamento > 0 ? formatMoney(metaOrcamento) : 'R$ 0,00'}
              </p>
              <span className="text-xs font-mono text-slate-400">
                {metaOrcamento > 0 ? `${percentualMeta.toFixed(1)}% atingido` : 'Sem teto definido'}
              </span>
            </div>
            {/* Barra de Progresso da Meta */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  percentualMeta > 100 ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${metaOrcamento > 0 ? Math.min(100, percentualMeta) : 0}%` }}
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
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  {areaUtil > 0 ? (
                    <button
                      onClick={gerarObraCompletaParametrica}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/40"
                    >
                      <Box className="w-4 h-4" />
                      Gerar Orçamento Baseado nas Decisões
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400 text-center">
                      Nenhum item adicionado. Envie a planta baixa pela IA acima ou defina a área para gerar o orçamento paramétrico.
                    </p>
                  )}
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
