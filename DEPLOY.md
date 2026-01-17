# Guia Rápido de Deploy - Vercel

## Comandos Necessários

Execute estes comandos na ordem para fazer o deploy:

### 1. Login na Vercel
```bash
vercel login
```
Isso abrirá o navegador para autenticação.

### 2. Inicializar Projeto
```bash
vercel
```
Escolha as opções:
- Set up and deploy? **Y**
- Which scope? (selecione sua conta/equipe)
- Link to existing project? **N** (ou Y se já tiver projeto)
- Project name? (deixe padrão ou escolha um nome)
- Directory? **./** (pressione Enter)
- Override settings? **N**

### 3. Adicionar Variáveis de Ambiente

**GEMINI_API_KEY (OBRIGATÓRIA):**
```bash
vercel env add GEMINI_API_KEY production
```
Quando solicitado, cole sua chave da API do Gemini e pressione Enter.

**SUPABASE_URL (OPCIONAL):**
```bash
vercel env add SUPABASE_URL production
```
Cole a URL do seu projeto Supabase (ex: https://xxxxx.supabase.co)

**SUPABASE_ANON_KEY (OPCIONAL):**
```bash
vercel env add SUPABASE_ANON_KEY production
```
Cole a chave anon do Supabase.

**Nota:** Você também pode adicionar para `preview` e `development`:
```bash
vercel env add GEMINI_API_KEY preview
vercel env add GEMINI_API_KEY development
```

### 4. Deploy para Produção
```bash
vercel --prod
```

### 5. Verificar Deploy
Após o deploy, você receberá uma URL. Acesse e teste o app!

## Verificar Variáveis Configuradas

Para ver todas as variáveis de ambiente configuradas:
```bash
vercel env ls
```

## Atualizar Variável Existente

Se precisar atualizar uma variável:
```bash
vercel env rm GEMINI_API_KEY production
vercel env add GEMINI_API_KEY production
```

## Links Úteis

- Dashboard Vercel: https://vercel.com/dashboard
- Documentação Vercel: https://vercel.com/docs
- Supabase Dashboard: https://supabase.com/dashboard
