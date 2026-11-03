# Imagens da página inicial e da vitrine do portal

Sete arquivos, e a mesma regra para todos: **imagem encenada, sintética ou de
banco leva `.selo-ilustrativo` na página até ser substituída por conteúdo real
com licença e cessão.** Anunciar como real o que é encenado é publicidade
enganosa (CDC, art. 37). Não existe terceira opção em que o selo saia e a figura
fique.

| Arquivo | Onde aparece | Selo |
|---|---|---|
| `app-no-celular.jpg` | home da plataforma (`app/page.tsx`) | "Tela ilustrativa do aplicativo" |
| `aula-no-celular.jpg` | seção do método no portal do professor (`app/PaginaPortal.tsx`) | "Tela ilustrativa do aplicativo" |
| `estudo-em-grupo.jpg` | abertura do portal do professor | "Imagem ilustrativa" |
| `estudio-do-professor.jpg` | banner do catálogo, só quando o curso em destaque não tem capa (`app/catalogo/Destaque.tsx`) | "Imagem ilustrativa" |
| `mulher-no-arquivo.jpg` | banner do catálogo **da plataforma**, sempre (`app/catalogo/page.tsx`) | "Imagem ilustrativa" |
| `equipe-colaborando.jpg` | abertura da página pública da universidade corporativa (`app/PaginaEmpresa.tsx`) | "Imagem ilustrativa" |
| `treinamento-no-celular.jpg` | seção de multiplataforma da mesma página | "Tela ilustrativa do aplicativo" |

---

## app-no-celular.jpg

A foto da seção "Tudo o que você precisa, em um lugar só": um celular na mão,
com uma aula aberta no aplicativo. 765×1374.

O original é `midia/Celular.png`, entregue pelo dono do projeto. O arquivo que
vai ao ar é a versão JPEG dele — o PNG tem 2 MB, e a página inicial não carrega
2 MB por uma figura. Para regerar depois de trocar o original:

```
node -e "require('sharp')('midia/Celular.png').jpeg({quality:86,mozjpeg:true}).toFile('public/imagens/app-no-celular.jpg')"
```

**Antes de publicar, dois pontos têm de ser resolvidos:**

1. **Procedência e licença.** A imagem é uma composição, não uma fotografia de
   uso real do produto. Registre aqui de onde ela veio e sob qual licença, como
   está feito em `public/retratos/LEIA-ME.md`. Se a pessoa retratada for real, é
   preciso cessão de uso de imagem.
2. **A tela dentro da foto é simulada** — a aula, a professora e o nome
   "Prof.ª Helena Souza" são inventados, e a barra de navegação está em inglês,
   com duas palavras truncadas ("Coureep", "Prcflie"). Por isso a figura leva o
   selo `.selo-ilustrativo` na página, mesma regra dos depoimentos e dos
   retratos do quadro docente. Trocada por uma captura verdadeira da interface,
   o selo sai junto.

Quem trocar o arquivo mantém o nome: `app/page.tsx` aponta direto para ele.

---

## aula-no-celular.jpg e estudo-em-grupo.jpg

**Procedência: as duas vieram no layout entregue pelo dono do projeto em
09/09/2026** (o "code.html" do pedido, que as carregava de
`lh3.googleusercontent.com/aida-public/…`). São imagens **geradas por
computador**, não fotografias. Estão servidas daqui, e não do endereço original,
pelo mesmo motivo dos retratos: endereço de terceiro sai do ar sem aviso, e a
abertura do portal abriria com um quadro vazio (ver `public/retratos/LEIA-ME.md`).

`aula-no-celular.jpg` (768×1376) é a **mesma classe de figura** que a
`app-no-celular.jpg`: imagem de produto, e por isso pode ser padrão em todo
portal — o aplicativo é o mesmo para o aluno de qualquer professor. As duas
ressalvas valem igual:

- a tela dentro do aparelho é **simulada** — a aula ("Responsabilidade Civil:
  Dano e Nexo Causal"), o curso e a professora ("Prof.ª Dra. Beatriz Oliveira")
  são inventados, e há letra deformada em vários rótulos;
- ela carrega a marca **da plataforma** (o logotipo roxo do Aprimore o Saber),
  o que dentro do portal de um professor de outra cor lê como marca de terceiro
  na casa dele. Uma captura real da interface, no tema do portal, resolve as
  duas coisas de uma vez — é a **fase 1b** do
  `docs/plano-vitrine-do-professor.md` (`scripts/gerar-vitrine.mjs`).

`estudo-em-grupo.jpg` (1376×768) é o caso mais delicado: **é imagem de pessoa.**
Pela regra do §2 daquele plano, imagem de pessoa é do professor e não vem de
fábrica — sob a marca dele, um rosto de banco vira endosso que ninguém deu. Ela
está no ar por decisão explícita do dono do projeto (é a **decisão D3**, tomada
no sentido "sim, com selo"), e enquanto for assim:

- a figura leva `.selo-ilustrativo` com o texto "Imagem ilustrativa", visível,
  logo abaixo da foto;
- **nada no texto ao redor afirma que aquelas pessoas são alunas deste
  professor.** O layout de referência trazia ali "Comunidade Ativa & Debates
  Reais — troque dúvidas com Jackson e colegas"; isso NÃO foi copiado, porque
  descreve uma funcionalidade que não existe e transformaria a foto em prova
  social falsa. O que ocupa aquele canto é o selo com a foto e o nome do
  professor — que é real e cadastrado por ele;
- as pessoas retratadas são sintéticas (repare nos títulos ilegíveis dos livros
  sobre a mesa), então não há cessão de uso de imagem a obter — mas há **licença
  a apurar**: registre aqui os termos de uso do gerador antes de publicar.

Duas imagens do mesmo layout **não** foram adotadas: as capas de curso
("Direito Penal Descomplicado" e "Prática Processual Penal"). Elas trazem o nome
de outro professor gravado na arte ("Prof. Felipe Mendes") e um selo "AO VIVO"
de um recurso que a plataforma não tem. Capa de curso é conteúdo, não layout:
sai de um quadro do vídeo ou do arquivo que o próprio professor envia
(`lib/capa-video.ts`, `app/professor/cursos/`).

---

## estudio-do-professor.jpg

**Procedência: veio no layout do catálogo em vitrine entregue pelo dono do
projeto em 09/09/2026** (o "code.html" daquele pedido, que a carregava de
`lh3.googleusercontent.com/aida-public/…`), como fundo do banner "Curso em
Destaque". 512×279, imagem **gerada por computador** — um estúdio de gravação
com telas de aula ao fundo e uma pessoa ao púlpito.

**Ela é reserva, não padrão.** O banner do catálogo mostra a CAPA do curso em
destaque; esta imagem só aparece no portal cujo curso em destaque ainda não tem
capa nenhuma — e, quando aparece, leva o selo `.selo-ilustrativo` no canto, que
some sozinho assim que existe capa. É a mesma regra do `estudo-em-grupo.jpg`, e
pelo mesmo motivo: sob a marca de um professor, uma figura de estúdio pode ser
lida como foto do estúdio DELE.

Duas coisas a resolver antes de publicar, iguais às das outras:

1. **Licença do gerador**, a registrar aqui.
2. **É imagem de pessoa** — sintética (repare no texto ilegível das telas ao
   fundo), então não há cessão a obter; se um dia for trocada por fotografia
   real, a cessão passa a ser obrigatória.

O arquivo está servido daqui, e não do endereço original, pela razão de sempre:
endereço de terceiro sai do ar sem aviso.

A imagem do celular do mesmo layout **não** foi adotada: a que já está no
repositório (`aula-no-celular.jpg`, 768×1376) mostra a mesma coisa com quase
cinco vezes mais resolução, e trocar uma pela outra pioraria a figura.

---

## mulher-no-arquivo.jpg

**Procedência: Adobe Stock, arquivo 504138423, LICENCIADO em 10/09/2026** pela
conta Adobe do dono do projeto (coleção gratuita da Stock; a licença é
perpétua e cobre uso comercial em web — os termos são os da Adobe Stock, e o
comprovante fica na conta que licenciou). Título no banco: *"Portrait of a
beautiful woman in a white blouse stands in the library archives and poses for
the camera with a serious face."* É **fotografia**, não imagem gerada — o que a
separa de todas as outras deste diretório.

1920×1080, recortada do original 5848×3891 (`sharp`, 126 kB). O recorte não é
centrado de propósito: ele corta a direita do original para a figura cair a
~70% da largura, fora da coluna de texto do banner — com ela no meio, o rosto
fica atrás dos botões. Para regerar a partir do original licenciado:

```
node -e "require('sharp')('AdobeStock_504138423.jpeg')
  .extract({left:0, top:500, width:4343, height:2443})
  .resize({width:1920}).jpeg({quality:80,mozjpeg:true})
  .toFile('public/imagens/mulher-no-arquivo.jpg')"
```

A proporção 16:9 também é escolha: o banner é bem mais largo que isso
(`min-height: clamp(380px, 46vw, 520px)`), então o navegador corta em cima e
embaixo com `object-fit: cover` e a figura sobra nas duas pontas em vez de
faltar. Trocar por uma imagem mais larga que 16:9 estoura o enquadramento no
celular, onde a faixa visível é a do meio.

**Ela é padrão, não reserva** — e é a única deste diretório que sempre aparece.
O banner do catálogo da plataforma passa a abrir com ela em vez da capa do curso
em destaque: a abertura da casa é institucional, e a capa do curso sai de um
quadro do vídeo (640×360, com a legenda queimada na imagem), feita para o
cartão. A capa continua no cartão, intacta; só o fundo do banner mudou. **No
portal de um professor esta arte NÃO entra** — lá a abertura é do curso dele,
com a capa que ele enviou (`fundo` só é passado quando `portalId === 0`, em
`app/catalogo/page.tsx`).

**A mulher retratada não é professora da plataforma, e o texto ao redor não diz
que é** — o banner nomeia o professor do curso em outra linha, com o nome
cadastrado. Por ser foto de banco encenada, ela leva `.selo-ilustrativo`
("Imagem ilustrativa") no canto do banner, pela regra do topo deste arquivo. A
cessão de uso de imagem da modelo é a que a Adobe Stock já obteve (*model
release* incluído no arquivo licenciado); **é vedado** usá-la de modo que
sugira endosso da pessoa retratada ao produto — por isso o selo, e por isso
nenhuma legenda a apresenta como aluna, professora ou depoente.

---

## equipe-colaborando.jpg e treinamento-no-celular.jpg

**Procedência: as duas vieram no layout da página pública da universidade
corporativa entregue pelo dono do projeto em 10/09/2026** (o "code.html" do
pedido "Aprimore Empresas", que as carregava de
`lh3.googleusercontent.com/aida-public/…` e `…/aida/…`). Os endereços originais
entregam uma miniatura de 512px; o sufixo `=s0` devolve o original, e foi o que
se guardou: 1376×768 e 768×1376, imagens **geradas por computador**. Servidas
daqui, e não de lá, pelo motivo de sempre: endereço de terceiro sai do ar sem
aviso.

`equipe-colaborando.jpg` é **imagem de pessoa**, sintética (os rótulos dos
gráficos nas telas e os títulos dos livros ao fundo são ilegíveis). Vale o
mesmo do `estudo-em-grupo.jpg`: selo "Imagem ilustrativa" visível logo abaixo,
e nada no texto ao redor afirma que aquelas pessoas são colaboradoras DESTA
empresa. O selo "+N colaboradores ativos" sobre a foto é a contagem real de
contas do portal, e some quando é zero — o layout trazia "+8.400", que não é
número de ninguém. Licença do gerador a registrar antes de publicar.

`treinamento-no-celular.jpg` é a mesma classe do `aula-no-celular.jpg`: tela
**simulada** (a aula "Responsabilidade Civil: Dano e Nexo Causal" e a
"Prof. Dra. Beatriz Oliveira" são inventadas, e há letra deformada nos
rótulos) com a marca **da plataforma** dentro do aparelho — que no portal de
uma empresa com outra cor lê como marca de terceiro. Leva o selo "Tela
ilustrativa do aplicativo"; uma captura real da interface no tema do portal
resolve as duas coisas e tira o selo.
