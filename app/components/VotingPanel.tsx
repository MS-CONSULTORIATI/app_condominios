import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth-store';
import { voteOnTopic, getTopicVotingStatus } from '@/lib/firebase';

// Cores
const PRIMARY_COLOR = '#6A51AE';
const LIGHT_GRAY = '#f5f5f5';
const GRAY = '#808080';
const DARK_GRAY = '#424242';
const GREEN = '#4CAF50';
const RED = '#F44336';
const YELLOW = '#FFC107';

interface VotingPanelProps {
  topicId: string;
  onVoteSubmit?: () => void;
}

const VotingPanel = ({ topicId, onVoteSubmit }: VotingPanelProps) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votingStatus, setVotingStatus] = useState<any>(null);

  const fetchVotingStatus = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const status = await getTopicVotingStatus(topicId, user.id);
      setVotingStatus(status);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados da votação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVotingStatus();
  }, [topicId, user]);

  const handleVote = async (vote: 'yes' | 'no' | 'abstain') => {
    if (!user?.id) return;
    
    try {
      setSubmitting(true);
      setError(null);
      await voteOnTopic(topicId, user.id, vote);
      await fetchVotingStatus();
      if (onVoteSubmit) onVoteSubmit();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar o voto');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Carregando dados da votação...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={24} color={RED} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!votingStatus?.isVotingEnabled) {
    return null; // Não mostrar nada se a votação não estiver habilitada
  }

  const renderVotingButtons = () => {
    if (!votingStatus.isVotingOpen) {
      return null;
    }

    if (votingStatus.userHasVoted) {
      return (
        <View style={styles.alreadyVotedContainer}>
          <MaterialIcons name="check-circle" size={24} color={GREEN} />
          <Text style={styles.alreadyVotedText}>
            Você votou: {votingStatus.userVote === 'yes' ? 'Sim' : 
                          votingStatus.userVote === 'no' ? 'Não' : 'Abstenção'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.votingButtonsContainer}>
        <Text style={styles.votingPrompt}>Vote nesta pauta:</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.voteButton, styles.yesButton]}
            onPress={() => handleVote('yes')}
            disabled={submitting}
          >
            <MaterialIcons name="thumb-up" size={18} color="white" />
            <Text style={styles.voteButtonText}>Sim</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.voteButton, styles.noButton]}
            onPress={() => handleVote('no')}
            disabled={submitting}
          >
            <MaterialIcons name="thumb-down" size={18} color="white" />
            <Text style={styles.voteButtonText}>Não</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.voteButton, styles.abstainButton]}
            onPress={() => handleVote('abstain')}
            disabled={submitting}
          >
            <MaterialIcons name="remove-circle-outline" size={18} color="white" />
            <Text style={styles.voteButtonText}>Abster</Text>
          </TouchableOpacity>
        </View>
        
        {submitting && (
          <View style={styles.submittingContainer}>
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            <Text style={styles.submittingText}>Processando seu voto...</Text>
          </View>
        )}
      </View>
    );
  };

  // Calcular percentuais para exibição dos resultados
  const { votes, totalVotes } = votingStatus;
  const yesPercentage = totalVotes > 0 ? Math.round((votes.yes / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? Math.round((votes.no / totalVotes) * 100) : 0;
  const abstainPercentage = totalVotes > 0 ? Math.round((votes.abstain / totalVotes) * 100) : 0;

  // Formatar data de término da votação
  let endDateFormatted = 'Sem data definida';
  if (votingStatus.votingEndDate) {
    endDateFormatted = format(
      new Date(votingStatus.votingEndDate),
      "'Até' dd 'de' MMMM 'às' HH:mm",
      { locale: ptBR }
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="how-to-vote" size={22} color={PRIMARY_COLOR} />
        <Text style={styles.title}>Votação</Text>
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {votingStatus.isVotingOpen 
            ? 'Votação em andamento' 
            : 'Votação encerrada'}
        </Text>
        <Text style={styles.deadlineText}>{endDateFormatted}</Text>
      </View>
      
      {renderVotingButtons()}
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          Resultados {!votingStatus.isVotingOpen ? 'finais' : 'parciais'}:
        </Text>
        
        <View style={styles.resultBar}>
          <View style={[styles.barSegment, styles.yesSegment, { flex: yesPercentage || 0.01 }]} />
          <View style={[styles.barSegment, styles.noSegment, { flex: noPercentage || 0.01 }]} />
          <View style={[styles.barSegment, styles.abstainSegment, { flex: abstainPercentage || 0.01 }]} />
        </View>
        
        <View style={styles.voteCountsContainer}>
          <View style={styles.voteCountItem}>
            <View style={[styles.colorIndicator, styles.yesIndicator]} />
            <Text style={styles.voteCountText}>Sim: {votes.yes} ({yesPercentage}%)</Text>
          </View>
          
          <View style={styles.voteCountItem}>
            <View style={[styles.colorIndicator, styles.noIndicator]} />
            <Text style={styles.voteCountText}>Não: {votes.no} ({noPercentage}%)</Text>
          </View>
          
          <View style={styles.voteCountItem}>
            <View style={[styles.colorIndicator, styles.abstainIndicator]} />
            <Text style={styles.voteCountText}>Abstenções: {votes.abstain} ({abstainPercentage}%)</Text>
          </View>
        </View>
        
        <Text style={styles.totalVotesText}>
          Total de votos: {totalVotes}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: DARK_GRAY,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
    color: PRIMARY_COLOR,
  },
  deadlineText: {
    fontSize: 14,
    color: GRAY,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: GRAY,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: RED,
    marginLeft: 8,
    flex: 1,
  },
  alreadyVotedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  alreadyVotedText: {
    marginLeft: 8,
    color: '#2E7D32',
    fontWeight: '500',
  },
  votingButtonsContainer: {
    marginBottom: 16,
  },
  votingPrompt: {
    fontSize: 15,
    marginBottom: 8,
    color: DARK_GRAY,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
  },
  yesButton: {
    backgroundColor: GREEN,
  },
  noButton: {
    backgroundColor: RED,
  },
  abstainButton: {
    backgroundColor: YELLOW,
  },
  voteButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 6,
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submittingText: {
    marginLeft: 8,
    color: GRAY,
  },
  resultsContainer: {
    paddingTop: 12,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
    color: DARK_GRAY,
  },
  resultBar: {
    height: 20,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  barSegment: {
    height: '100%',
  },
  yesSegment: {
    backgroundColor: GREEN,
  },
  noSegment: {
    backgroundColor: RED,
  },
  abstainSegment: {
    backgroundColor: YELLOW,
  },
  voteCountsContainer: {
    marginTop: 8,
  },
  voteCountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  yesIndicator: {
    backgroundColor: GREEN,
  },
  noIndicator: {
    backgroundColor: RED,
  },
  abstainIndicator: {
    backgroundColor: YELLOW,
  },
  voteCountText: {
    fontSize: 14,
    color: DARK_GRAY,
  },
  totalVotesText: {
    fontSize: 14,
    marginTop: 8,
    color: GRAY,
    textAlign: 'right',
  },
});

export default VotingPanel; 