import React from 'react';
import FinancialDetailScreen from './[id]';

export default function NewFinancialScreen() {
  // Renderizamos o componente de detalhes com o ID forçado como "new"
  return <FinancialDetailScreen forcedId="new" />;
} 