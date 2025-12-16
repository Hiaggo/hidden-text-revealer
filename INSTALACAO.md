# Como Instalar a Extensão Hidden Text Revealer

## Passo a Passo:

### 1. Extrair os Arquivos
- Extraia o arquivo ZIP para uma pasta (exemplo: `C:\extensoes\hidden-text-revealer`)
- **IMPORTANTE**: Certifique-se de que todos os arquivos estão dentro da mesma pasta

### 2. Abrir o Chrome
- Abra o Google Chrome
- Digite na barra de endereço: `chrome://extensions/`
- Pressione Enter

### 3. Ativar o Modo de Desenvolvedor
- No canto superior direito, ative a opção **"Modo de programador"** ou **"Developer mode"**

### 4. Carregar a Extensão
- Clique no botão **"Carregar extensão sem compactação"** ou **"Load unpacked"**
- Selecione a pasta onde extraiu os arquivos (a pasta que contém o arquivo `manifest.json`)
- Clique em **"Selecionar pasta"**

### 5. Pronto!
- A extensão aparecerá na lista
- Clique no ícone de extensões (quebra-cabeça) na barra de ferramentas
- Fixe a extensão Hidden Text Revealer para fácil acesso

## Estrutura dos Arquivos:

A pasta deve conter estes arquivos:
```
hidden-text-revealer/
├── manifest.json     ← OBRIGATÓRIO
├── content.js        ← OBRIGATÓRIO
├── content.css       ← OBRIGATÓRIO
├── popup.html        ← OBRIGATÓRIO
├── popup.js          ← OBRIGATÓRIO
└── icon.png          ← OBRIGATÓRIO
```

## Como Usar:

1. Visite qualquer página web
2. Clique no ícone da extensão 🔍
3. Clique em **"Reveal Hidden Text"**
4. O texto oculto será destacado em amarelo
5. Para voltar ao normal, clique em **"Hide Revealed Text"**

## O que a Extensão Detecta:

✅ Fontes muito pequenas (< 2px)
✅ Texto com cor igual ao fundo
✅ Texto transparente
✅ Elementos com `visibility: hidden`
✅ Elementos com `display: none`
✅ Texto escondido com `text-indent`

## Solução de Problemas:

**Erro: "Ficheiro de manifesto está em falta ou é ilegível"**
- Verifique se extraiu TODOS os arquivos do ZIP
- Certifique-se de selecionar a pasta correta (que contém manifest.json)
- Não selecione o arquivo ZIP, selecione a pasta extraída

**A extensão não funciona:**
- Atualize a página (F5) após instalar
- Verifique se a extensão está ativada em chrome://extensions/

**Texto oculto não é detectado:**
- Tente atualizar a página
- Alguns métodos muito sofisticados podem não ser detectados

## Privacidade:

✅ A extensão NÃO coleta dados
✅ Funciona completamente offline
✅ Não envia informações para servidores externos
✅ Código aberto - você pode ver tudo o que faz

## Suporte:

Se tiver problemas, verifique:
1. Todos os arquivos foram extraídos?
2. O Chrome está atualizado?
3. O modo de desenvolvedor está ativado?
