/**
 * Formata um valor numérico para formato de moeda (R$)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata uma data timestamp para formato brasileiro DD/MM/YYYY
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

/**
 * Formata uma data timestamp para formato completo DD/MM/YYYY HH:MM
 */
export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export function formatRelativeTime(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Menos de 1 minuto
  if (seconds < 60) {
    return 'agora mesmo';
  }
  
  // Menos de 1 hora
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? 'há 1 minuto' : `há ${minutes} minutos`;
  }
  
  // Menos de 1 dia
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? 'há 1 hora' : `há ${hours} horas`;
  }
  
  // Menos de 1 semana
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? 'há 1 dia' : `há ${days} dias`;
  }
  
  // Menos de 1 mês
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return weeks === 1 ? 'há 1 semana' : `há ${weeks} semanas`;
  }
  
  // Menos de 1 ano
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? 'há 1 mês' : `há ${months} meses`;
  }
  
  // Mais de 1 ano
  const years = Math.floor(days / 365);
  return years === 1 ? 'há 1 ano' : `há ${years} anos`;
} 