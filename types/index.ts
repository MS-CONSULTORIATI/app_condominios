export interface User {
  id: string;
  name: string;
  email: string;
  role: 'resident' | 'manager' | 'admin' | 'visitor' | 'doorman';
  apartment?: string;
  block?: string;
  unit?: string;
  phone?: string;
  cpf?: string; // CPF do usuário
  street?: string; // Rua (01, 02, 03, 04)
  house?: string; // Número da casa
  profileImage?: string;
  photoURL?: string; // Added for compatibility
  createdAt: number;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  createdBy: string | User;
  status: 'active' | 'archived';
  priority: 'low' | 'medium' | 'high';
  images?: string[];
  documents?: { name: string; uri: string }[];
  isVotingEnabled?: boolean;
  votingEndDate?: number;
  votes?: {
    yes: number;
    no: number;
    abstain: number;
  };
  votedBy?: { 
    userId: string;
    vote: 'yes' | 'no' | 'abstain';
    votedAt: number;
  }[];
  comments?: TopicComment[];
}

export interface TopicComment {
  id: string;
  text: string;
  createdAt: number;
  createdBy: string;
  userName: string;
  userRole: string;
  userUnit?: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'resolved';
  createdBy: string | User;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string | User;
  assignedTo?: string | User;
  images?: string[];
  documents?: { name: string; uri: string }[];
  viewCount?: number;
  comments?: ProblemComment[];
  statusComment?: StatusComment; // Comentário do síndico
}

export interface StatusComment {
  comment: string;
  updatedAt: number;
  updatedBy: string;
}

export interface ProblemComment {
  id: string;
  text: string;
  createdAt: number;
  createdBy: string;
  userName: string;
  userRole: string;
  userUnit?: string;
  replyTo?: string; // ID do comentário ao qual está respondendo
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  createdBy: string | User;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
  votes?: number;
  votedBy?: string[];
  viewCount?: number;
  documents?: { name: string; uri: string }[];
  images?: string[];
  approvedAt?: number;
  rejectedAt?: number;
  comments?: SuggestionComment[];
  statusComment?: StatusComment; // Comentário do síndico
}

export interface SuggestionComment {
  id: string;
  text: string;
  createdAt: number;
  createdBy: string;
  userName: string;
  userRole: string; // Papel do usuário (resident, manager, admin)
  userUnit?: string;
  replyTo?: string; // ID do comentário ao qual está respondendo
}

export interface Resident {
  id: string;
  name: string;
  email: string;
  phone: string;
  apartment: string;
  block: string;
  isOwner: boolean;
  moveInDate: number;
  createdAt: number;
  profileImage?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'topic' | 'problem' | 'suggestion' | 'system';
  read: boolean;
  createdAt: number;
  relatedItemId?: string;
}

export interface FirebaseNotification {
  id: string;
  title: string;
  message: string;
  type: 'topic' | 'problem' | 'suggestion' | 'system' | 'financial' | 'advertisement' | 'lostandfound' | 'social' | 'package';
  relatedItemId?: string;
  targetUserId?: string; // ID do usuário específico para quem a notificação é direcionada
  createdAt: number;
  read: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  date: number;
  location: string;
  status: 'scheduled' | 'canceled' | 'completed';
  createdAt: number;
  createdBy: string | User;
  attendees?: string[] | User[];
  confirmedAttendees?: string[] | User[];
  topics?: string[] | Topic[];
  images?: string[];
  documents?: { name: string; uri: string }[];
}

export interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'other';
  breed?: string;
  age?: number;
  color?: string;
  photoURL?: string;
  description?: string;
  ownerName: string;
  ownerUnit: string;
  ownerId: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Debtor {
  id: string;
  residentName: string;
  unit: string; // Apartamento/Casa
  amount: number; // Valor da dívida
  dueDate: number; // Data de vencimento
  description?: string; // Descrição ou motivo (ex: "Taxa condominial mês 01/2023")
  months?: number; // Quantidade de meses em atraso
  status: 'pending' | 'negotiating' | 'resolved'; // Status da inadimplência
  paymentPlan?: string; // Plano de pagamento, se houver
  createdAt: number;
  updatedAt?: number;
  createdBy: string; // ID do usuário que criou o registro
}

export interface Advertisement {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  photoURL?: string;
  photos?: string[];
  status: 'available' | 'sold';
  createdAt: number;
  createdBy: string;
  ownerName: string;
  ownerUnit: string;
  ownerContact?: string;
  house?: string; // Casa do proprietário
  likes: string[]; // Array de IDs de usuários que deram like
  views: string[]; // Array de IDs de usuários que visualizaram
  viewCount: number; // Contagem total de visualizações
  isAuction: boolean; // Indica se é um leilão
  auctionEndDate?: number; // Data de término do leilão
  currentBid?: number; // Valor atual do lance mais alto
  bids?: {
    userId: string;
    userName: string;
    amount: number;
    createdAt: number;
  }[]; // Histórico de lances
  comments?: Comment[]; // Comentários no anúncio
}

export interface Comment {
  id: string;
  text: string;
  createdAt: number;
  createdBy: string;
  userName: string;
  userUnit?: string;
  isOwnerResponse: boolean; // Indica se é resposta do dono do anúncio
  replyTo?: string; // ID do comentário ao qual está respondendo (se for uma resposta)
}

export interface ServiceProvider {
  id: string;
  name: string;
  serviceType: string;
  description: string;
  phone: string;
  whatsapp: string;
  photo?: string;
  photos?: string[];
  ratings?: ServiceProviderRating[];
  avgRating?: number;
  reviewCount?: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string | User;
  updatedBy?: string | User;
}

export interface ServiceProviderRating {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1-5 stars
  comment?: string;
  photos?: string[];
  createdAt: number;
}

export interface Financial {
  id: string;
  description: string;
  type: 'income' | 'expense';  // receita ou despesa
  amount: number;
  category: string;
  date: number;
  dueDate?: number;
  status: 'paid' | 'pending' | 'overdue';
  attachments?: { name: string; uri: string }[];
  notes?: string;
  createdAt: number;
  createdBy: string | User;
}

export interface LostAndFoundItem {
  id: string;
  title: string;
  description: string;
  category: 'lost' | 'found';
  location: string;
  date: number; // Data em que foi perdido/encontrado
  phone: string; // Telefone de contato (WhatsApp)
  status: 'active' | 'resolved';
  images?: string[];
  createdAt: number;
  createdBy: string | User;
  updatedAt?: number;
}

export interface News {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  publishDate: number;
  status: 'draft' | 'published' | 'archived';
  featured?: boolean;
  visible?: boolean;
  coverImage?: string;
  images?: string[];
  documents?: { name: string; uri: string }[];
  viewCount?: number;
  viewedBy?: string[];
  likes?: string[]; // Array of user IDs who liked the news
  likeCount?: number; // Total count of likes
  comments?: NewsComment[]; // Array of comments
  createdAt: number;
  createdBy: string | User;
  updatedAt?: number;
  updatedBy?: string | User;
}

export interface NewsComment {
  id: string;
  text: string;
  createdAt: number;
  createdBy: string;
  userName: string;
  userRole?: string;
  userUnit?: string;
  userAvatar?: string;
}

export interface SocialPost {
  id: string;
  content: string;
  images?: string[];
  createdAt: number;
  createdBy: string;
  userName: string;
  userAvatar?: string;
  userUnit?: string;
  likes: string[]; // Array de IDs de usuários que deram like
  likeCount: number;
  comments: SocialComment[];
  commentCount: number;
  mentions?: string[]; // Array de IDs de usuários mencionados
  isEdited?: boolean;
  editedAt?: number;
}

export interface SocialComment {
  id: string;
  text: string;
  createdAt: number;
  createdBy: string;
  userName: string;
  userAvatar?: string;
  userUnit?: string;
  likes: string[]; // Array de IDs de usuários que deram like no comentário
  likeCount: number;
  mentions?: string[]; // Array de IDs de usuários mencionados no comentário
  replyTo?: string; // ID do comentário ao qual está respondendo
  replies?: SocialComment[]; // Respostas a este comentário
}

export interface Package {
  id: string;
  recipientId: string; // ID do usuário que vai receber
  recipientName: string;
  recipientUnit: string;
  recipientPhone?: string;
  senderName?: string; // Nome do remetente/empresa
  description: string;
  observations?: string;
  photos?: string[];
  status: 'pending' | 'delivered' | 'returned';
  createdAt: number;
  createdBy: string; // ID do porteiro
  createdByName: string; // Nome do porteiro
  deliveredAt?: number;
  deliveredBy?: string; // ID do porteiro que entregou
  deliveredByName?: string; // Nome do porteiro que entregou
  signature?: string; // Assinatura digital do recebedor
  signedBy?: string; // Nome de quem assinou
  returnedAt?: number;
  returnReason?: string;
  updatedAt?: number;
}

export interface PackageSignature {
  packageId: string;
  signature: string; // Base64 da assinatura
  signedBy: string; // Nome de quem assinou
  signedAt: number;
  deliveredBy: string; // ID do porteiro
}