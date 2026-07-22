'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  DocumentData,
  Query
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export function useFirestore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addDocument = async (collectionName: string, data: DocumentData) => {
    try {
      setLoading(true);
      setError(null);
      const docRef = await addDoc(collection(firestore, collectionName), data);
      return docRef.id;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDocument = async (collectionName: string, docId: string) => {
    try {
      setLoading(true);
      setError(null);
      const docRef = doc(firestore, collectionName, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCollection = async (collectionName: string) => {
    try {
      setLoading(true);
      setError(null);
      const querySnapshot = await getDocs(collection(firestore, collectionName));
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return documents;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (collectionName: string, docId: string, data: DocumentData) => {
    try {
      setLoading(true);
      setError(null);
      const docRef = doc(firestore, collectionName, docId);
      await updateDoc(docRef, data);
      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (collectionName: string, docId: string) => {
    try {
      setLoading(true);
      setError(null);
      const docRef = doc(firestore, collectionName, docId);
      await deleteDoc(docRef);
      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const queryCollection = async (collectionName: string, constraints: any[]) => {
    try {
      setLoading(true);
      setError(null);
      const q = query(collection(firestore, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return documents;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const subscribeToCollection = (collectionName: string, callback: (documents: any[]) => void) => {
    const q = collection(firestore, collectionName);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(documents);
    });
    return unsubscribe;
  };

  return {
    loading,
    error,
    addDocument,
    getDocument,
    getCollection,
    updateDocument,
    deleteDocument,
    queryCollection,
    subscribeToCollection,
  };
}
