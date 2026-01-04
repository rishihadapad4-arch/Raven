import React, { useState, useEffect, useRef } from 'react';
import { User, Community, Message, ViewType, OperativePosition } from './types';
import { 
  RavenCrestIcon, MessageIcon, ShieldIcon, ProfileIcon, 
  PlusIcon, BackIcon, SendIcon, CopyIcon, SettingsIcon, CameraIcon, PencilIcon
} from './components/Icons';
import CommunityCard from './components/CommunityCard';
import AIInsightsPanel from './components/AIInsightsPanel';
import { RAVEN_DB } from './services/firebaseService';
import { 
  auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged 
} from './firebase.js';

// --- Helper Components ---

const PositionTag: React.FC<{ position: OperativePosition }> = ({ position }) => {
  const colors = {
    Commander: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    Sentinel: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Architect: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Operative: 'bg-zinc-800 text-zinc-400 border-zinc-700'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors[position]}`}>
      {position}
    </span>
  );
};

const App: React.FC = () => {
  // --- AUTH & GLOBAL STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('landing');
  const [houses, setHouses] = useState<Community[]>([]);
  const [activeHouse, setActiveHouse] = useState<Community | null>(null);
  const [activeDMUser, setActiveDMUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isMembersVisible, setIsMembersVisible] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Auth Observer ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        const userData = await RAVEN_DB.getUser(firebaseUser.uid);
        if (userData) {
          setCurrentUser(userData);
          if (!userData.displayName || !userData.avatar) {
            setView('setup');
          } else {
            setView('dashboard');
          }
        } else {
          // New User
          const newUser: User = {
            id: firebaseUser.uid,
            username: firebaseUser.email?.split('@')[0] || 'operative',
            displayName: '',
            avatar: '',
            bio: '',
            joinedAt: Date.now(),
            createdAt: Date.now(),
            commsCode: `RAVEN-${Math.floor(1000 + Math.random() * 9000)}`,
            position: 'Operative',
            houseIds: [],
            contactIds: []
          };
          await RAVEN_DB.saveUser(newUser);
          setCurrentUser(newUser);
          setView('setup');
        }
      } else {
        setCurrentUser(null);
        setView('landing');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Real-time Data Subscriptions ---
  useEffect(() => {
    if (currentUser) {
      const unsubscribeHouses = RAVEN_DB.getHouses((data) => setHouses(data));
      return () => unsubscribeHouses();
    }
  }, [currentUser]);

  useEffect(() => {
    let unsubscribeMsgs: (() => void) | undefined;
    if (view === 'house' && activeHouse) {
      unsubscribeMsgs = RAVEN_DB.subscribeToMessages(activeHouse.id, (data) => setMessages(data));
    } else if (view === 'dm' && activeDMUser && currentUser) {
      const roomId = RAVEN_DB.getDMRoomId(currentUser.id, activeDMUser.id);
      unsubscribeMsgs = RAVEN_DB.subscribeToMessages(roomId, (data) => setMessages(data));
    }
    return () => unsubscribeMsgs?.();
  }, [activeHouse, activeDMUser, view, currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Auth Actions ---

  const handleGoogleAuth = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      alert("Auth failed: " + (err as Error).message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      alert("Auth failed: " + (err as Error).message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setView('landing');
    setActiveHouse(null);
    setActiveDMUser(null);
  };

  // --- Profile Actions ---

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const updateData = {
      displayName: formData.get('displayName') as string,
      bio: formData.get('bio') as string,
    };
    await RAVEN_DB.updateUserProfile(currentUser.id, updateData);
    setCurrentUser({ ...currentUser, ...updateData });
    setView('dashboard');
    setIsLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setIsLoading(true);
        const url = await RAVEN_DB.uploadAvatar(currentUser.id, base64);
        await RAVEN_DB.updateUserProfile(currentUser.id, { avatar: url });
        setCurrentUser({ ...currentUser, avatar: url });
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (activeHouse || activeDMUser) && currentUser) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const url = await RAVEN_DB.uploadAvatar(currentUser.id, base64); // reuse upload logic
        sendImageMessage(url);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- App Logic ---

  const sendMessage = async (content: string) => {
    if (!currentUser || !content.trim()) return;
    let channelId = activeHouse ? activeHouse.id : (activeDMUser ? RAVEN_DB.getDMRoomId(currentUser.id, activeDMUser.id) : "");
    if (!channelId) return;

    const msg: Message = {
      id: 'm_' + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatar,
      content,
      timestamp: Date.now(),
      houseId: channelId
    };
    await RAVEN_DB.addMessage(msg);
  };

  const sendImageMessage = async (imageUrl: string) => {
    if (!currentUser) return;
    let channelId = activeHouse ? activeHouse.id : (activeDMUser ? RAVEN_DB.getDMRoomId(currentUser.id, activeDMUser.id) : "");
    if (!channelId) return;

    const msg: Message = {
      id: 'm_' + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatar,
      content: '',
      image: imageUrl,
      timestamp: Date.now(),
      houseId: channelId
    };
    await RAVEN_DB.addMessage(msg);
  };

  const createHouse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    const formData = new FormData(e.currentTarget);
    const newHouse: Community = {
      id: 'h_' + Date.now(),
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
      inviteCode: RAVEN_DB.generateInviteCode(),
      ownerId: currentUser.id,
      membersCount: 1,
      activityScore: 100,
      tags: ['Private'],
      isPrivate: true,
      participants: []
    };
    await RAVEN_DB.saveHouse(newHouse);
    const updatedUser = { ...currentUser, houseIds: [...currentUser.houseIds, newHouse.id] };
    setCurrentUser(updatedUser);
    await RAVEN_DB.updateUserProfile(currentUser.id, { houseIds: updatedUser.houseIds });
    setIsCreateModalOpen(false);
    setActiveHouse(newHouse);
    setView('house');
  };

  const joinHouse = async (code: string) => {
    const house = houses.find(h => h.inviteCode === code.trim().toUpperCase());
    if (house && currentUser) {
      if (currentUser.houseIds.includes(house.id)) return alert("Already a member.");
      await RAVEN_DB.joinHouse(house.id, currentUser.id);
      const updatedUser = { ...currentUser, houseIds: [...currentUser.houseIds, house.id] };
      setCurrentUser(updatedUser);
      await RAVEN_DB.updateUserProfile(currentUser.id, { houseIds: updatedUser.houseIds });
      setIsJoinModalOpen(false);
      setActiveHouse(house);
      setView('house');
    } else {
      alert("Invalid Invite Code.");
    }
  };

  // --- Views ---

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#050505]">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs">Accessing Raven Network...</p>
      </div>
    );
  }

  const renderChat = (title: string, subtitle: string, type: 'house' | 'dm') => (
    <div className="flex-1 flex overflow-hidden animate-in">
      <div className="flex-1 flex flex-col bg-[#080808]">
        <header className="h-20 border-b border-zinc-900 px-8 flex items-center justify-between glass-panel sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button className="md:hidden" onClick={() => setView('dashboard')}><BackIcon /></button>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight">{title}</h2>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{subtitle}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {type === 'house' && activeHouse && (
              <div className="hidden lg:flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Invite Code</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-indigo-400">{activeHouse.inviteCode}</code>
                  </div>
                </div>
              </div>
            )}
            <button className="p-2 text-zinc-600 hover:text-white" onClick={() => setIsMembersVisible(!isMembersVisible)}>
              <ProfileIcon />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
          {messages.map((msg, i) => {
            const prevMsg = messages[i-1];
            const isNewGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
            return (
              <div key={msg.id} className={`flex gap-4 ${isNewGroup ? 'mt-6' : 'mt-1'}`}>
                <div className="w-10">
                  {isNewGroup && <img src={msg.senderAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed='+msg.senderId} className="w-10 h-10 rounded-xl object-cover" alt="" />}
                </div>
                <div className="flex-1">
                  {isNewGroup && (
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-black text-sm text-white">{msg.senderName}</span>
                      <span className="text-[10px] text-zinc-600 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  <div className="text-zinc-300 text-[15px] leading-relaxed">
                    {msg.content && <p>{msg.content}</p>}
                    {msg.image && <img src={msg.image} className="mt-2 rounded-2xl max-w-sm border border-zinc-800 shadow-xl" alt="" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        <div className="p-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 flex items-center gap-4 px-6 focus-within:border-indigo-500/50 transition-all">
            <label className="text-zinc-600 hover:text-white cursor-pointer transition-colors">
              <PlusIcon />
              <input type="file" className="hidden" accept="image/*" onChange={handleChatImageUpload} />
            </label>
            <input 
              onKeyDown={(e) => { if (e.key === 'Enter') { sendMessage(e.currentTarget.value); e.currentTarget.value = ''; } }}
              placeholder={`Transmit to ${title}...`}
              className="flex-1 bg-transparent py-4 text-sm focus:outline-none placeholder-zinc-700" 
            />
            <button className="text-indigo-500 hover:scale-110 transition-transform"><SendIcon /></button>
          </div>
        </div>
      </div>

      {isMembersVisible && type === 'house' && activeHouse && (
        <aside className="w-80 bg-zinc-950 border-l border-zinc-900 overflow-y-auto hidden lg:flex flex-col animate-in no-scrollbar">
          <div className="p-8 border-b border-zinc-900">
             <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em] mb-4">Records</h3>
             <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
               <span>Signal: <span className="text-emerald-500 uppercase">Online</span></span>
               <span>{activeHouse.membersCount} Operatives</span>
             </div>
          </div>
          <div className="p-6 space-y-4">
             {/* List members here from subcollection in production */}
             <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Active Scan Active</p>
          </div>
        </aside>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050505] text-white">
      {/* SIDE NAV */}
      {view !== 'landing' && view !== 'auth' && view !== 'setup' && (
        <nav className="w-20 md:w-24 bg-zinc-950 border-r border-zinc-900 flex flex-col items-center py-6 gap-6">
          <div 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`} 
            onClick={() => setView('dashboard')}
          >
            <RavenCrestIcon className="w-8 h-8" />
          </div>
          <div className="w-10 h-px bg-zinc-900" />
          {houses.filter(h => currentUser?.houseIds.includes(h.id)).map(house => (
            <div 
              key={house.id} 
              onClick={() => { setActiveHouse(house); setView('house'); }}
              className={`w-14 h-14 rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-105 border-2 ${view === 'house' && activeHouse?.id === house.id ? 'border-indigo-500' : 'border-transparent'}`}
            >
              <img src={house.imageUrl} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
          <button onClick={() => setIsCreateModalOpen(true)} className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-indigo-500 hover:bg-zinc-800"><PlusIcon /></button>
          <div className="mt-auto flex flex-col gap-6">
            <button onClick={() => setView('moderation')} className="text-zinc-600 hover:text-white"><ShieldIcon /></button>
            <button onClick={() => setView('profile')} className={`text-zinc-600 hover:text-white ${view === 'profile' && 'text-white'}`}><ProfileIcon /></button>
            <button onClick={handleLogout} className="text-zinc-800 hover:text-rose-500"><BackIcon /></button>
          </div>
        </nav>
      )}

      {/* MAIN VIEW */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {view === 'landing' && (
          <div className="h-screen flex flex-col items-center justify-center p-6 text-center animate-in">
            <RavenCrestIcon className="w-32 h-32 mb-8" />
            <h1 className="text-7xl font-black tracking-tighter mb-4">RAVEN</h1>
            <p className="text-zinc-400 text-xl max-w-lg mb-12 uppercase tracking-widest font-bold">Secure Private Communities</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mb-12">
               <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
                  <h3 className="font-black text-indigo-400 mb-2 uppercase text-xs tracking-[0.2em]">Privacy</h3>
                  <p className="text-sm text-zinc-500">End-to-end encryption for every transmission within your domain.</p>
               </div>
               <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
                  <h3 className="font-black text-emerald-400 mb-2 uppercase text-xs tracking-[0.2em]">Intelligence</h3>
                  <p className="text-sm text-zinc-500">Automated Gemini AI insights for community moderation and scaling.</p>
               </div>
               <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
                  <h3 className="font-black text-amber-400 mb-2 uppercase text-xs tracking-[0.2em]">Control</h3>
                  <p className="text-sm text-zinc-500">Full administrative sovereignty over invitation codes and clearance levels.</p>
               </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setView('auth')} className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20 uppercase tracking-widest">Get Started</button>
              <button onClick={() => setView('auth')} className="px-12 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl font-bold transition-all uppercase tracking-widest">Login</button>
            </div>
          </div>
        )}

        {view === 'auth' && (
          <div className="h-screen flex items-center justify-center p-6 animate-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl">
              <button onClick={() => setView('landing')} className="mb-6 text-zinc-500 hover:text-white"><BackIcon /></button>
              <h2 className="text-3xl font-black mb-10 uppercase tracking-tighter">Access Portal</h2>
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Operative Email" 
                  className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500" 
                />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passphrase" 
                  className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500" 
                />
                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold uppercase tracking-widest">
                  {authMode === 'login' ? 'Authenticate' : 'Register Operative'}
                </button>
                <div className="text-center text-xs text-zinc-500 font-bold uppercase cursor-pointer" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
                  {authMode === 'login' ? "New operative? Register link" : "Already verified? Login link"}
                </div>
                <div className="relative py-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div><div className="relative flex justify-center text-xs uppercase font-black text-zinc-600 bg-zinc-900 px-4">OR</div></div>
                <button type="button" onClick={handleGoogleAuth} className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" /> Continue with Google
                </button>
              </form>
            </div>
          </div>
        )}

        {view === 'setup' && (
          <div className="h-screen flex items-center justify-center p-6 animate-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10">
              <h2 className="text-3xl font-black mb-2 text-indigo-400 uppercase tracking-tighter">Identity Record</h2>
              <p className="text-zinc-500 mb-10 uppercase text-[10px] font-black tracking-widest">Profile initialization required for network entry.</p>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-full bg-zinc-800 overflow-hidden border-4 border-zinc-900 shadow-xl">
                      {currentUser?.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600"><CameraIcon /></div>}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full cursor-pointer hover:bg-indigo-700">
                      <CameraIcon />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                </div>
                <input name="displayName" required placeholder="Display Name (e.g. Ghost Protocol)" className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500" />
                <textarea name="bio" placeholder="Strategic Objective (Bio)" className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 h-24 resize-none" />
                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold uppercase tracking-widest">Authorize Profile</button>
              </form>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-12 animate-in no-scrollbar">
            <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
              <div>
                <h1 className="text-5xl font-black tracking-tighter mb-2 uppercase">Command Center</h1>
                <p className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Active Operative: {currentUser?.displayName}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setIsJoinModalOpen(true)} className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all">Join House</button>
                <button onClick={() => setIsCreateModalOpen(true)} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all">Create House</button>
              </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {houses.filter(h => currentUser?.houseIds.includes(h.id)).map(house => (
                <CommunityCard key={house.id} community={house} onSelect={(c) => { setActiveHouse(c); setView('house'); }} />
              ))}
              {currentUser?.houseIds.length === 0 && (
                <div className="col-span-full py-20 bg-zinc-900/10 border border-zinc-900 border-dashed rounded-[3rem] text-center">
                  <RavenCrestIcon className="w-20 h-20 mx-auto mb-6 text-zinc-800 opacity-20" />
                  <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Awaiting Initial Community Establishment</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'house' && activeHouse && renderChat(activeHouse.name, `${activeHouse.membersCount} Operatives`, 'house')}

        {view === 'profile' && currentUser && (
          <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full animate-in no-scrollbar">
            <header className="flex justify-between items-center mb-12">
               <h1 className="text-4xl font-black tracking-tighter uppercase">Operative Data</h1>
               <button onClick={() => setView('edit_profile')} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-indigo-400 transition-all"><PencilIcon /></button>
            </header>
            <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-12">
               <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                  <div className="w-40 h-40 rounded-full border-4 border-indigo-500/20 overflow-hidden shadow-2xl">
                     <img src={currentUser.avatar} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                     <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                        <h2 className="text-4xl font-black">{currentUser.displayName}</h2>
                        <PositionTag position={currentUser.position} />
                     </div>
                     <p className="text-indigo-400 font-mono text-sm mb-6 uppercase tracking-widest">ID: {currentUser.commsCode}</p>
                     <p className="text-zinc-400 leading-relaxed mb-8">{currentUser.bio || "No mission brief provided."}</p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-black/50 rounded-2xl border border-zinc-800">
                           <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Clearance</span>
                           <span className="text-xl font-bold uppercase">LEVEL 4</span>
                        </div>
                        <div className="p-4 bg-black/50 rounded-2xl border border-zinc-800">
                           <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Active Houses</span>
                           <span className="text-xl font-bold">{currentUser.houseIds.length}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {view === 'edit_profile' && currentUser && (
          <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full animate-in no-scrollbar">
            <header className="flex items-center gap-4 mb-12">
               <button onClick={() => setView('profile')}><BackIcon /></button>
               <h1 className="text-4xl font-black tracking-tighter uppercase">Edit Record</h1>
            </header>
            <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-12 shadow-2xl">
              <form onSubmit={handleProfileUpdate} className="space-y-8">
                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <img src={currentUser.avatar} className="w-32 h-32 rounded-full object-cover border-4 border-zinc-800" alt="" />
                    <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full cursor-pointer hover:bg-indigo-700 shadow-xl">
                      <CameraIcon />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Operative Alias</label>
                   <input name="displayName" defaultValue={currentUser.displayName} className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Operational Directives</label>
                   <textarea name="bio" defaultValue={currentUser.bio} className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 h-32 resize-none" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setView('profile')} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-bold uppercase tracking-widest">Abort</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-2xl font-bold uppercase tracking-widest">Update Data</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {view === 'moderation' && (
          <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full animate-in no-scrollbar">
            <h1 className="text-4xl font-black tracking-tighter mb-4 text-indigo-400 uppercase">Intelligence</h1>
            <p className="text-zinc-600 mb-12 uppercase text-[10px] font-black tracking-widest">Real-time Gemini Analysis Enabled</p>
            <AIInsightsPanel selectedCommunity={activeHouse || houses[0]} />
          </div>
        )}
      </main>

      {/* MODALS */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-6">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 animate-in">
            <h2 className="text-3xl font-black mb-8 uppercase tracking-tighter">Establish House</h2>
            <form onSubmit={createHouse} className="space-y-6">
              <input name="name" required placeholder="House Designation" className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500" />
              <textarea name="description" required placeholder="Strategic Objective" className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 h-32 resize-none" />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-bold uppercase tracking-widest">Abort</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-2xl font-bold uppercase tracking-widest">Initialize</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-6">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 animate-in">
            <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">Request Entry</h2>
            <p className="text-zinc-500 mb-8 uppercase text-[10px] font-black tracking-widest">Verification of encrypted house frequency required.</p>
            <input 
              id="invite-input"
              placeholder="RAVEN-XXXX" 
              className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 text-center font-mono text-xl uppercase mb-6" 
            />
            <div className="flex gap-4">
              <button onClick={() => setIsJoinModalOpen(false)} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-bold uppercase tracking-widest">Abort</button>
              <button onClick={() => joinHouse((document.getElementById('invite-input') as HTMLInputElement).value)} className="flex-1 py-4 bg-indigo-600 rounded-2xl font-bold uppercase tracking-widest">Authenticate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;