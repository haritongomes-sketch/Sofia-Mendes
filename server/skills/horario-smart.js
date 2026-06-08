/**
 * Skill: Saudação e tom adaptado ao horário e dia
 * Sofia adapta o início das mensagens com base no horário de Brasília.
 * Também injeta contexto de urgência quando necessário.
 */

function getSaudacao() {
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false });
  const h = parseInt(hora);

  if (h >= 5  && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  if (h >= 18 && h < 23) return 'Boa noite';
  return 'Olá';
}

function getDia() {
  return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' });
}

function getContextoHorario() {
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false });
  const h = parseInt(hora);
  const dia = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' });

  // Contextos específicos para Sofia usar naturalmente
  if (dia === 'segunda-feira' && h < 10) {
    return 'CONTEXTO: É segunda-feira de manhã — a semana começa. Tom de "novo começo", energia positiva.';
  }
  if (dia === 'sexta-feira' && h > 15) {
    return 'CONTEXTO: É sexta à tarde — fim de semana chegando. Tom mais leve e descontraído, mas ainda profissional.';
  }
  if (h >= 12 && h <= 13) {
    return 'CONTEXTO: É horário de almoço — a pessoa pode estar com mais tempo. Tom mais tranquilo.';
  }
  if (h >= 20) {
    return 'CONTEXTO: É noite — a pessoa pode estar relaxando. Tom mais suave, não fale de reuniões neste momento, apenas mantenha a conversa aquecida.';
  }
  return '';
}

function ehHorarioBomParaMensagem() {
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false });
  const h = parseInt(hora);
  const dia = new Date().getDay(); // 0=dom
  // Melhor para enviar proativamente: seg-sex 8h-20h
  return dia >= 1 && dia <= 5 && h >= 8 && h < 20;
}

module.exports = { getSaudacao, getDia, getContextoHorario, ehHorarioBomParaMensagem };
