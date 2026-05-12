import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

interface Terms {
  id: string;
  kind: string;
  version: string;
  contentMd: string;
  effectiveAt: string;
}

const publicApi = axios.create({ baseURL: '/api/v1' });

// Renderiza markdown muito simples (headings + paragraphs). Para
// HTML rico, integrar uma lib como `marked`/`remark` se necessário.
function renderMarkdown(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      if (line.startsWith('### ')) return `<h3 class="text-base font-semibold mt-4 mb-1">${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h2 class="text-lg font-semibold mt-5 mb-2">${line.slice(3)}</h2>`;
      if (line.startsWith('# ')) return `<h1 class="text-2xl font-bold mt-2 mb-3">${line.slice(2)}</h1>`;
      if (line.startsWith('- ')) return `<li class="ml-5 list-disc">${line.slice(2)}</li>`;
      if (line.trim() === '') return '<br/>';
      return `<p class="text-sm leading-relaxed">${line}</p>`;
    })
    .join('\n');
}

export function TermsPage() {
  const { kind } = useParams<{ kind: string }>();

  const q = useQuery<Terms>({
    queryKey: ['terms', kind],
    queryFn: async () => (await publicApi.get(`/lgpd/public/${kind}`)).data.data.terms,
    enabled: kind === 'terms_of_use' || kind === 'privacy_policy',
  });

  if (q.isError || !['terms_of_use', 'privacy_policy'].includes(kind ?? '')) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <p className="text-red-600">Termo não encontrado.</p>
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white">
      <p className="text-xs text-muted-foreground mb-2">
        Versão {q.data?.version} · em vigor desde{' '}
        {new Date(q.data!.effectiveAt).toLocaleDateString('pt-BR')}
      </p>
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(q.data!.contentMd) }} />
    </div>
  );
}

export default TermsPage;
