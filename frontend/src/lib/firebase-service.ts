import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { firestore, storage } from './firebase';
import type { User, Analysis, Document, Report, Notification, Abonnement } from '@/types';

// User Service
export const userService = {
  async getUserById(uid: string): Promise<User | null> {
    try {
      const docRef = doc(firestore, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { uid: docSnap.id, ...docSnap.data() } as unknown as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  },
  
  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    try {
      const docRef = doc(firestore, 'users', uid);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },
  
  subscribeToUser(uid: string, callback: (user: User | null) => void) {
    const docRef = doc(firestore, 'users', uid);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ uid: docSnap.id, ...docSnap.data() } as unknown as User);
      } else {
        callback(null);
      }
    });
  },
};

// Analysis Service
export const analysisService = {
  async getAnalyses(userId: string, limitCount = 10): Promise<Analysis[]> {
    try {
      const q = query(
        collection(firestore, 'analyses'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Analysis));
    } catch (error) {
      console.error('Error getting analyses:', error);
      throw error;
    }
  },
  
  async getAnalysisById(id: string): Promise<Analysis | null> {
    try {
      const docRef = doc(firestore, 'analyses', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Analysis;
      }
      return null;
    } catch (error) {
      console.error('Error getting analysis:', error);
      throw error;
    }
  },
  
  async createAnalysis(data: Omit<Analysis, 'id' | 'createdAt' | 'updatedAt'>): Promise<Analysis> {
    try {
      const docRef = await addDoc(collection(firestore, 'analyses'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return { id: docRef.id, ...data, createdAt: new Date(), updatedAt: new Date() } as Analysis;
    } catch (error) {
      console.error('Error creating analysis:', error);
      throw error;
    }
  },
  
  async updateAnalysis(id: string, data: Partial<Analysis>): Promise<void> {
    try {
      const docRef = doc(firestore, 'analyses', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating analysis:', error);
      throw error;
    }
  },
  
  async deleteAnalysis(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'analyses', id));
    } catch (error) {
      console.error('Error deleting analysis:', error);
      throw error;
    }
  },
  
  subscribeToAnalyses(userId: string, callback: (analyses: Analysis[]) => void) {
    const q = query(
      collection(firestore, 'analyses'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const analyses = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Analysis));
      callback(analyses);
    });
  },
};

// Document Service
export const documentService = {
  async uploadDocument(file: File, analysisId: string): Promise<Document> {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `documents/${analysisId}/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const docData: Omit<Document, 'id'> = {
        nom: file.name,
        type: this.detectDocumentType(file.name),
        format: file.type.includes('pdf') ? 'pdf' : file.type.includes('excel') || file.type.includes('spreadsheet') ? 'excel' : 'csv',
        taille: file.size,
        url,
        uploadedAt: new Date(),
        statut: 'pending',
      };
      
      const docRef = await addDoc(collection(firestore, 'documents'), docData);
      return { id: docRef.id, ...docData } as Document;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },
  
  detectDocumentType(fileName: string): Document['type'] {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('bilan')) return 'bilan';
    if (lowerName.includes('compte') || lowerName.includes('resultat')) return 'compte_resultat';
    if (lowerName.includes('annexe')) return 'annexe';
    return 'autre';
  },
  
  async updateDocumentStatus(id: string, statut: Document['statut']): Promise<void> {
    try {
      const docRef = doc(firestore, 'documents', id);
      await updateDoc(docRef, { statut });
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  },
  
  async deleteDocument(id: string, url: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'documents', id));
      
      // Delete from storage
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },
};

// Report Service
export const reportService = {
  async createReport(data: Omit<Report, 'id' | 'createdAt'>): Promise<Report> {
    try {
      const docRef = await addDoc(collection(firestore, 'reports'), {
        ...data,
        createdAt: serverTimestamp(),
      });
      
      return { id: docRef.id, ...data, createdAt: new Date() } as Report;
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  },
  
  async getReports(userId: string): Promise<Report[]> {
    try {
      const q = query(
        collection(firestore, 'reports'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
    } catch (error) {
      console.error('Error getting reports:', error);
      throw error;
    }
  },
  
  async updateReportStatus(id: string, statut: Report['statut'], url?: string): Promise<void> {
    try {
      const docRef = doc(firestore, 'reports', id);
      const updateData: Partial<Report> = { statut };
      if (url) updateData.url = url;
      if (statut === 'completed') updateData.completedAt = new Date();
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating report status:', error);
      throw error;
    }
  },
};

// Notification Service
export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  },
  
  async markAsRead(id: string): Promise<void> {
    try {
      const docRef = doc(firestore, 'notifications', id);
      await updateDoc(docRef, { lu: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },
  
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', userId),
        where('lu', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const batch = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { lu: true })
      );
      
      await Promise.all(batch);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },
  
  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Notification));
      callback(notifications);
    });
  },
};

// Abonnement Service
export const abonnementService = {
  async getAbonnement(userId: string): Promise<Abonnement | null> {
    try {
      const docRef = doc(firestore, 'abonnements', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as unknown as Abonnement;
      }
      return null;
    } catch (error) {
      console.error('Error getting abonnement:', error);
      throw error;
    }
  },
  
  async updateAbonnement(userId: string, data: Partial<Abonnement>): Promise<void> {
    try {
      const docRef = doc(firestore, 'abonnements', userId);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error('Error updating abonnement:', error);
      throw error;
    }
  },
  
  subscribeToAbonnement(userId: string, callback: (abonnement: Abonnement | null) => void) {
    const docRef = doc(firestore, 'abonnements', userId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as unknown as Abonnement);
      } else {
        callback(null);
      }
    });
  },
};

// Conversation & Message Types
export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: Date;
  voiceBytes?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  analysisId?: string;
}

// Conversation Service
export const conversationService = {
  async createConversation(userId: string, title: string = 'Nouvelle conversation', analysisId?: string): Promise<Conversation> {
    try {
      const docData: any = {
        userId,
        title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Only include analysisId if it's defined
      if (analysisId !== undefined) {
        docData.analysisId = analysisId;
      }
      
      const docRef = await addDoc(collection(firestore, 'conversations'), docData);
      
      return {
        id: docRef.id,
        userId,
        title,
        analysisId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },
  
  async getConversations(userId: string, limitCount = 20): Promise<Conversation[]> {
    try {
      // Try with orderBy first (requires composite index)
      try {
        const q = query(
          collection(firestore, 'conversations'),
          where('userId', '==', userId),
          orderBy('updatedAt', 'desc'),
          limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
          updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt) : new Date(),
        } as Conversation));
      } catch (indexError) {
        // Fallback: fetch without orderBy and sort client-side
        if (String(indexError).toLowerCase().includes('index')) {
          console.warn('Firestore index missing, using client-side sorting fallback for conversations');
          const q = query(
            collection(firestore, 'conversations'),
            where('userId', '==', userId),
            limit(limitCount * 2)  // Fetch more to account for sorting
          );
          
          const querySnapshot = await getDocs(q);
          const conversations = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
            updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt) : new Date(),
          } as Conversation));
          
          // Sort client-side by updatedAt
          conversations.sort((a, b) => {
            const aTime = a.updatedAt.getTime();
            const bTime = b.updatedAt.getTime();
            return bTime - aTime;
          });
          
          return conversations.slice(0, limitCount);
        } else {
          throw indexError;
        }
      }
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  },
  
  async getConversationById(id: string): Promise<Conversation | null> {
    try {
      const docRef = doc(firestore, 'conversations', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt ? new Date(docSnap.data().createdAt) : new Date(),
          updatedAt: docSnap.data().updatedAt ? new Date(docSnap.data().updatedAt) : new Date(),
        } as Conversation;
      }
      return null;
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  },
  
  async updateConversation(id: string, data: Partial<Conversation>): Promise<void> {
    try {
      const docRef = doc(firestore, 'conversations', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  },
  
  async deleteConversation(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'conversations', id));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },
  
  subscribeToConversations(userId: string, callback: (conversations: Conversation[]) => void) {
    const q = query(
      collection(firestore, 'conversations'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const conversations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
        updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt) : new Date(),
      } as Conversation));
      callback(conversations);
    });
  },
  
  // Messages
  async addMessage(conversationId: string, message: Omit<Message, 'id'>): Promise<string> {
    try {
      const messagesCollection = collection(firestore, 'conversations', conversationId, 'messages');
      const docRef = await addDoc(messagesCollection, {
        ...message,
        createdAt: serverTimestamp(),
      });
      
      // Update conversation's updatedAt
      const convDocRef = doc(firestore, 'conversations', conversationId);
      await updateDoc(convDocRef, { updatedAt: serverTimestamp() });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  },
  
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const q = query(
        collection(firestore, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
      } as Message));
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  },
  
  subscribeToMessages(conversationId: string, callback: (messages: Message[]) => void) {
    const q = query(
      collection(firestore, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
      } as Message));
      callback(messages);
    });
  },
};
