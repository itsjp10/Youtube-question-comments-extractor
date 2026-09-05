import type { FAQ } from '../types';
import { FAQCard } from './FAQCard';
import { EmptyState } from './EmptyState';

interface FAQListProps {
  faqs: FAQ[];
  relevantComments: number;
}

export function FAQList({ faqs, relevantComments }: FAQListProps) {
  if (faqs.length === 0) {
    return (
      <EmptyState
        title="No se detectaron preguntas frecuentes"
        description={
          relevantComments > 0
            ? 'Se encontraron comentarios con dudas, pero no suficientes coincidencias para agruparlas en FAQs.'
            : 'Los comentarios de este video no contienen preguntas ni problemas identificables.'
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <FAQCard key={faq.id} faq={faq} defaultExpanded={index === 0} />
      ))}
    </div>
  );
}
