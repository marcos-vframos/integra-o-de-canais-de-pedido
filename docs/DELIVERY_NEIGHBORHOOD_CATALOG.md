# Cadastro de bairros e taxas

130 registros transcritos de `bairros_pindamonhangaba.pdf`, fornecido pelo proprietário em 22/10/2026. Nomes e coordenadas foram preservados, inclusive grafias que precisam de revisão (por exemplo, “Jardim any”, “Vale das Acaciaas”). O documento se apresenta como oficial, mas não traz identificação de órgão, método ou referência cartográfica verificável. Os pontos não devem ser tratados como limites oficiais nem como endereços exatos de entregas.

Os 42 polígonos GeoPixel/ForestGIS já presentes continuam disponíveis como referência de bairros maiores. Não representam os limites individuais de todos os loteamentos da lista.

## Classificação inicial

A legenda utiliza quatro classes operacionais: urbana, rural, central e distrito. Distrito é uma divisão administrativa que pode conter área urbana e rural. Assim, a classe “distrito” identifica localidades associadas a Moreira César, sem substituir o zoneamento legal. “Central” identifica o Centro da sede. As demais classificações são uma aproximação operacional inicial, com revisão por item no gestor. `classificationStatus: provisional` significa que a classificação individual não foi confirmada; `reference` indica correspondência com referência consultada; `manager` registra a decisão do gestor.

Referências consultadas:

- CATI, Conselho Municipal de Desenvolvimento Rural de Pindamonhangaba: https://www.cati.sp.gov.br/portal/projetos-e-programas/conselho-municipal-de-desenvolvimento-rural?cod=422 — relaciona núcleos rurais Ribeirão Grande, Piracuama, Cruz Pequena, Pinga, Mandú, Bom Sucesso, Pinhão/Borba/Una e Campinas, entre outros. A página contém composição de conselho de 2017; não é um mapa atual de zoneamento.
- Plano Municipal de Saúde 2022–2025, Prefeitura: https://ecrie.com.br/sistema/conteudos/arquivo/a_70_0_1_27092022100943.pdf — referência histórica das regiões de atendimento e localidades de Moreira César. Regiões de saúde não delimitam distrito legal.
- Prefeitura, pré-cadastro habitacional rural 2026: https://pindamonhangaba.sp.gov.br/pre-cadastro-habitacional-rural-2026 — referência complementar para Taipas. Conteúdo encontrado no índice de busca; acesso direto retornou 403.
- Prefeitura, história: https://pindamonhangaba.sp.gov.br/cidade/historia — formação do distrito de Moreira César. Conteúdo no índice de busca; acesso direto retornou 403.
- Mapa municipal para revisão cadastral: https://pindamonhangaba.geopixel.com.br/geopixelcidades/login.html

Não foi obtida uma camada legal atual de zoneamento que confirme todos os 130 pontos. As classificações provisórias permanecem explicitamente sinalizadas para revisão, sem alegação de certificação oficial.

## Distâncias e valores

Faixas: até 3 km; >3 a 5; >5 a 7; >7 a 9; >9 a 11; >11 a 13; >13 a 15; >15 a 17; >17 a 19; >19 a 21; acima de 21 km. Percurso pelas vias entre a origem salva e o ponto de referência do bairro, calculado pelo serviço de rotas. Sem resposta válida, o item fica como “Trajeto não calculado”. Ver ROAD_ROUTING.md.

O ponto inicial reaproveita a referência existente no sistema (-22.9238, -45.4740); não foi confirmado como a localização exata do estabelecimento. O gestor define e confirma a origem pelo mapa ou coordenadas, salva em `landing_content / delivery_origin`. Todos os pontos e faixas são recalculados a partir da origem salva.

Taxa NULL significa pendente. Zero explícito significa taxa gratuita deliberadamente cadastrada. Os novos registros são criados com NULL; valores preexistentes são preservados. Checkout bloqueia região pendente, inclusive quando selecionada por coordenadas. Preços e descrição são persistidos via RPC autorizada, sem depender de armazenamento local.
