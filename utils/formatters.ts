/**
 * Formata um valor numérico como moeda (R$)
 * @param value Valor numérico a ser formatado
 * @returns String formatada como moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata uma data como string no formato brasileiro (DD/MM/YYYY)
 * @param date Data a ser formatada
 * @returns String formatada como data brasileira
 */
export const formatDate = (date: Date | number): string => {
  const dateObj = typeof date === 'number' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR');
};

/**
 * Formata uma data como string no formato brasileiro com hora (DD/MM/YYYY HH:MM)
 * @param date Data a ser formatada
 * @returns String formatada como data e hora brasileira
 */
export const formatDateTime = (date: Date | number): string => {
  const dateObj = typeof date === 'number' ? new Date(date) : date;
  return `${dateObj.toLocaleDateString('pt-BR')} ${dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}; 