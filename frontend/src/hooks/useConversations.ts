'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { conversationService, Conversation, Message } from '@/lib/firebase-service';

export function useConversations(user: User | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = conversationService.subscribeToConversations(
      user.uid,
      (conversationsData) => {
        setConversations(conversationsData);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const createConversation = async (title?: string, analysisId?: string) => {
    if (!user) return null;
    return await conversationService.createConversation(user.uid, title, analysisId);
  };

  const deleteConversation = async (id: string) => {
    await conversationService.deleteConversation(id);
  };

  const updateConversation = async (id: string, data: Partial<Conversation>) => {
    await conversationService.updateConversation(id, data);
  };

  return {
    conversations,
    loading,
    error,
    createConversation,
    deleteConversation,
    updateConversation,
  };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = conversationService.subscribeToMessages(
      conversationId,
      (messagesData) => {
        setMessages(messagesData);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId]);

  const addMessage = async (message: Omit<Message, 'id'>) => {
    if (!conversationId) return null;
    return await conversationService.addMessage(conversationId, message);
  };

  return {
    messages,
    loading,
    error,
    addMessage,
  };
}
