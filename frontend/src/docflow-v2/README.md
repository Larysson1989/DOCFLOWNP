# DOC.FLOW v2 — Módulo Isolado

> ⚠️ **SISTEMA ISOLADO** — Este diretório não interfere com o sistema **Ação 3% IFPF** em produção.

## Estrutura

```
/src/docflow-v2
  /components     → DFHeader, DFSidebar, DFModuleGrid, DFModulePlaceholder, ProjectSelector
  /pages          → DFDashboard
  /hooks          → useDocflowV2
  /services       → geminiService.ts (resumirPDF, traduzirPDF, extrairInformacoes)
  /store          → docflowStore.ts
  /utils          → pdfUtils.ts
  /types          → index.ts
  /styles         → design-tokens.css, global.css (prefixo df-)
  DocflowV2App.tsx → Root component
  index.ts         → Public exports
```

## Variáveis de Ambiente

O módulo **reutiliza** a chave já configurada no projeto:

```env
# Existente no projeto (reutilizado)
VITE_GEMINI_API_KEY=sua_chave_aqui

# Novas variáveis opcionais para DOC.FLOW v2
DOCFLOW_V2_GEMINI_MODEL=gemini-1.5-pro
DOCFLOW_V2_MAX_TOKENS=8192
```

## Integração mínima no App.tsx existente

### 1. Importar
```tsx
import { DocflowV2App } from './docflow-v2';
import { ProjectSelector } from './docflow-v2/components/ProjectSelector';
```

### 2. Adicionar rota pós-login
```tsx
if (selectedMode === 'docflow-v2') {
  return <DocflowV2App userEmail={loginEmail} onLogout={handleLogout} />;
}
```

### 3. Usar ProjectSelector no login
```tsx
<ProjectSelector
  onSelect={mode => setSelectedMode(mode)}
  userEmail={loginEmail}
/>
```

## Design System

- Prefixo CSS: `df-` (ex: `.df-card`, `.df-btn-primary`)
- Variáveis: `--df-*` (ex: `--df-primary`, `--df-accent`)
- Paleta:
  - Primary: `#5B4FE8`
  - Accent: `#00C2CB`
  - Background: `#F8F9FB`
  - Surface: `#FFFFFF`

## Módulos planejados

| Módulo | Status | Fase |
|--------|--------|------|
| Organizar PDF | 🔧 Em desenvolvimento | Fase 2 |
| Otimizar | 🔧 Em desenvolvimento | Fase 2 |
| Converter | 🔧 Em desenvolvimento | Fase 3 |
| Editar | 🔧 Em desenvolvimento | Fase 3 |
| Segurança | 🔧 Em desenvolvimento | Fase 4 |
| IA Gemini | 🔧 Em desenvolvimento | Fase 4 |

## Regras de isolamento

1. ❌ Nunca importar de `../App.tsx` ou `../AppDemaisAtividades.tsx`
2. ❌ Nunca alterar `index.css` do projeto existente
3. ✅ Todos os estilos em `/styles/` com prefixo `df-`
4. ✅ Todas as variáveis CSS com prefixo `--df-`
5. ✅ Imports de serviços externos somente de `@google/genai` (já instalado)
