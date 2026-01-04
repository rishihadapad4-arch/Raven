import { User, Community, Message, Friend } from '../types';
import { 
  db, storage, 
  doc, getDoc, setDoc, updateDoc, collection, addDoc, onSnapshot, query, where, orderBy,
  ref, uploadString, getDownloadURL 
} from '../firebase.js';

export const RAVEN_DB = {
  // User Management
  getUser: async (uid: string): Promise<User | null> => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as User) : null;
  },

  saveUser: async (user: User) => {
    await setDoc(doc(db, "users", user.id), user);
  },

  updateUserProfile: async (uid: string, data: Partial<User>) => {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, data);
  },

  uploadAvatar: async (uid: string, base64: string): Promise<string> => {
    const storageRef = ref(storage, `avatars/${uid}_${Date.now()}`);
    await uploadString(storageRef, base64, 'data_url');
    return await getDownloadURL(storageRef);
  },

  // House/Community Management
  getHouses: (callback: (houses: Community[]) => void) => {
    const q = query(collection(db, "houses"));
    return onSnapshot(q, (snapshot) => {
      const houses = snapshot.docs.map(doc => doc.data() as Community);
      callback(houses);
    });
  },

  saveHouse: async (house: Community) => {
    await setDoc(doc(db, "houses", house.id), house);
    // Also create house member entry
    await setDoc(doc(db, "houseMembers", `${house.id}_${house.ownerId}`), {
      houseId: house.id,
      userId: house.ownerId,
      joinedAt: Date.now()
    });
  },

  joinHouse: async (houseId: string, userId: string) => {
    await setDoc(doc(db, "houseMembers", `${houseId}_${userId}`), {
      houseId,
      userId,
      joinedAt: Date.now()
    });
    // Increment member count (simplified)
    const houseRef = doc(db, "houses", houseId);
    const houseSnap = await getDoc(houseRef);
    if (houseSnap.exists()) {
      await updateDoc(houseRef, {
        membersCount: (houseSnap.data().membersCount || 0) + 1
      });
    }
  },

  // Messaging
  subscribeToMessages: (channelId: string, callback: (messages: Message[]) => void) => {
    const q = query(
      collection(db, "messages"),
      where("houseId", "==", channelId),
      orderBy("timestamp", "asc")
    );
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => doc.data() as Message);
      callback(messages);
    });
  },

  addMessage: async (msg: Message) => {
    await addDoc(collection(db, "messages"), msg);
  },

  generateInviteCode: () => {
    return 'RAVEN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  getDMRoomId: (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_dm_');
  }
};