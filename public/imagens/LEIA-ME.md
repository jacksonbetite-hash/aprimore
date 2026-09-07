# Imagens da página inicial

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
   retratos do quadro docente: anunciar como real o que é encenado é publicidade
   enganosa (CDC, art. 37). Trocada por uma captura verdadeira da interface, o
   selo sai junto.

Quem trocar o arquivo mantém o nome: `app/page.tsx` aponta direto para ele.
