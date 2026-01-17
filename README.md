<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Finanças A+ | Gestão Financeira Inteligente

App de gestão financeira familiar com IA integrada (Google Gemini) e backend Supabase.

View your app in AI Studio: https://ai.studio/apps/drive/1Dg-jqkGIk3b6KrzWvOWMaRZKOxKZH8Un

## 🚀 Deploy na Vercel

### Pré-requisitos
- Conta na [Vercel](https://vercel.com)
- Conta no [Supabase](https://supabase.com)
- Chave da API do [Google Gemini](https://makersuite.google.com/app/apikey)

### Passos para Deploy

1. **Instalar dependências localmente:**
   ```bash
   npm install
   ```

2. **Fazer login na Vercel CLI:**
   ```bash
   vercel login
   ```

3. **Inicializar projeto na Vercel:**
   ```bash
   vercel
   ```
   Siga as instruções no terminal para criar/linkar o projeto.

4. **Configurar variáveis de ambiente na Vercel:**
   
   **Obrigatória:**
   ```bash
   vercel env add GEMINI_API_KEY production
   # Cole sua chave da API do Gemini quando solicitado
   ```
   
   **Opcionais (já tem valores de fallback):**
   ```bash
   vercel env add SUPABASE_URL production
   vercel env add SUPABASE_ANON_KEY production
   ```

5. **Fazer deploy para produção:**
   ```bash
   vercel --prod
   ```

### Variáveis de Ambiente

Crie um arquivo `.env.local` para desenvolvimento local:

```env
GEMINI_API_KEY=sua_chave_gemini_aqui
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

**Nota:** As credenciais do Supabase são opcionais - o app tem valores de fallback configurados. A chave do Gemini é obrigatória.

## 💻 Desenvolvimento Local

**Prerequisites:** Node.js 18+

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   Crie um arquivo `.env.local` na raiz do projeto com:
   ```env
   GEMINI_API_KEY=sua_chave_gemini_aqui
   ```

3. **Executar em modo desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Build para produção:**
   ```bash
   npm run build
   ```

5. **Preview do build:**
   ```bash
   npm run preview
   ```

## 📦 Estrutura do Projeto

- `App.tsx` - Componente principal
- `components/` - Componentes React
- `services/` - Serviços (Supabase, Gemini)
- `types.ts` - Definições TypeScript
- `vite.config.ts` - Configuração do Vite
- `vercel.json` - Configuração do Vercel

## 🔧 Tecnologias

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL + Auth)
- **IA:** Google Gemini API
- **Deploy:** Vercel
- **UI:** Tailwind CSS + Lucide Icons

## 📝 Notas

- O app usa autenticação via Magic Link (Supabase Auth)
- As transações e orçamentos são armazenados no Supabase
- A IA do Gemini é usada para análise de recibos e consultoria financeira
