#!/usr/bin/env python3
import hashlib, pathlib, subprocess, zipfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'export_artifacts'; OUT.mkdir(exist_ok=True)
SHA=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
NAMES=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
BLOCK={'.env','.env.local','.env.production','.env.development'}
FILES=[ROOT/n for n in NAMES if n and n not in BLOCK and not n.startswith('export_artifacts/') and (ROOT/n).is_file()]
TEXT_EXT={'.ts','.tsx','.js','.jsx','.css','.json','.md','.html','.toml','.yaml','.yml','.txt','.mjs','.cjs'}
GROUPS={
 'LOJA_ONLINE':['src/pages/LojaPublica.tsx','src/components/CustomizeModal.tsx','src/components/CustomerAuthDrawer.tsx','src/components/StorePromotionCarousel.tsx','src/components/OrderReceiptModal.tsx','src/components/DeliveryMapPicker.tsx','src/lib/orderCustomization.ts','src/lib/geoDistance.ts','src/types/loyolas.ts','src/App.tsx'],
 'GESTAO':['src/pages/Gestao.tsx','src/pages/Config.tsx','src/components/TabPedido.tsx','src/components/TabPedidosOnline.tsx','src/components/TabCardapio.tsx','src/components/TabEstoque.tsx','src/components/TabCaixa.tsx','src/components/TabClientes.tsx','src/components/TabMotoboys.tsx','src/components/DeliveryFeeZones.tsx','src/components/CustomizeModal.tsx','src/lib/orderCustomization.ts','src/types/loyolas.ts','src/App.tsx'],
 'ADM_LANDING':['src/pages/AdmLanding.tsx','src/pages/Index.tsx','src/components/Hero.tsx','src/components/Header.tsx','src/components/Marquee.tsx','src/components/MarqueeEditor.tsx','src/components/SeasonalCampaignAdmin.tsx','src/components/SeasonalCampaignOverlay.tsx','src/components/AdobeColorPicker.tsx','src/components/ImageUploadField.tsx','src/context/LandingContentContext.tsx','src/App.tsx']}
DESCRIPTIONS={
 'LOJA_ONLINE':'Loja /loja: cardapio, personalizacao, carrinho, vouchers, checkout, frete, CRM, recibo.',
 'GESTAO':'Gestor /gestao e /config: PDV, estoque, caixa, pedidos, motoboys, campanhas e configuracoes.',
 'ADM_LANDING':'ADM /adm-landing: Hero, paletas, barra movel, imagens, campanhas, CMS; landing publica /.'}
def concat(names):
 out=['CODIGO FONTE PARA CONSULTA - nao executavel como TXT','Git snapshot '+SHA]
 for name in names:
  p=ROOT/name
  if not p.is_file() or p.stat().st_size>1000000: continue
  try: content=p.read_text(encoding='utf-8')
  except UnicodeError: continue
  out.extend(['\n\n'+'='*95,'FILE PATH: '+name,'='*95,content])
 return '\n'.join(out)
def write_readme(name):
 lines=['# README - '+name, 'Snapshot: '+SHA, '',
  DESCRIPTIONS.get(name,'Projeto integrado React/Vite/TypeScript/Tailwind + PocketBase.'),'',
  '## Executar',
  '1. Node.js 22 instalado; extraia o ZIP.',
  '2. Copie .env.example para .env e configure VITE_POCKETBASE_URL para PocketBase HTTPS proprio.',
  '3. Execute npm install; npm run dev; navegue para a rota desejada.',
  '4. Para producao: npm run lint; npm run build; publique dist com fallback SPA.',
  '5. Instale as migrations e hooks do diretorio pocketbase no servidor PocketBase separado.',
  '## Observacoes',
  'Este pacote mantem os componentes compartilhados e outras rotas para preservar dependencias. NAO eh app isolado multitenant.',
  'O TXT eh uma copia concatenada de fontes selecionadas e nao substitui os arquivos estruturados.',
  'Arquivo .env legado omitido da exportacao por seguranca.',
  'Auditar autenticacao, regras de PocketBase, pagamentos, estoque e fluxos fiscais antes de producao.',
  'Emissao de NF requer integracao fiscal real. npm test e placeholder.',
 ]
 return '\n'.join(lines)+'\n'
for key,files in GROUPS.items():
 readme=write_readme(key)
 (OUT/('README_'+key+'.md')).write_text(readme,encoding='utf-8')
 text=concat(files)
 (OUT/('CODIGO_'+key+'.txt')).write_text(text,encoding='utf-8')
 with zipfile.ZipFile(OUT/(key+'_FONTE_COMPLETA.zip'),'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for fp in FILES:z.write(fp,fp.relative_to(ROOT).as_posix())
  z.writestr('README_MODULO.md',readme)
  z.writestr('CODIGO_MODULO_CONCATENADO.txt',text)
  z.writestr('SNAPSHOT_GIT.txt',SHA+'\n')
all_text=[p.relative_to(ROOT).as_posix() for p in FILES if p.suffix.lower() in TEXT_EXT or p.name in ['.env.example','.gitignore']]
(OUT/'CODIGO_COMPLETO_CONCATENADO.txt').write_text(concat(all_text),encoding='utf-8')
readme=write_readme('PROJETO_COMPLETO')
(OUT/'README_PROJETO_COMPLETO.md').write_text(readme,encoding='utf-8')
with zipfile.ZipFile(OUT/'PROJETO_COMPLETO_FONTE.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for fp in FILES:z.write(fp,fp.relative_to(ROOT).as_posix())
 z.writestr('README_EXPORTACAO.md',readme)
 z.writestr('SNAPSHOT_GIT.txt',SHA+'\n')
with (OUT/'SHA256SUMS.txt').open('w') as fp:
 for p in sorted(OUT.iterdir()):
  if p.name!='SHA256SUMS.txt':fp.write(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n')
print('revision',SHA)
for p in sorted(OUT.iterdir()):print(p.name,p.stat().st_size)
