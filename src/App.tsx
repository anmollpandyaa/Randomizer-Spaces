/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Auth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc, 
  Timestamp,
  Firestore,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  Plus, 
  Trash2, 
  Dice5, 
  LayoutGrid, 
  FolderPlus, 
  ChevronRight, 
  LogOut, 
  User as UserIcon,
  X,
  Layers,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Space {
  id: string;
  title: string;
  ownerId: string;
  createdAt: Timestamp;
}

interface Collection {
  id: string;
  title: string;
  spaceId: string;
  ownerId: string;
  createdAt: Timestamp;
}

interface Item {
  id: string;
  name: string;
  collectionId: string;
  ownerId: string;
  createdAt: Timestamp;
}

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-black text-white hover:bg-zinc-800",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100",
    outline: "border border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const Input = ({ 
  value, 
  onChange, 
  placeholder, 
  className = "",
  autoFocus = false
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) => (
  <input
    autoFocus={autoFocus}
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-4 py-2 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all ${className}`}
  />
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [isAddingSpace, setIsAddingSpace] = useState(false);
  const [newSpaceTitle, setNewSpaceTitle] = useState('');
  
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');

  const [pickingCollectionId, setPickingCollectionId] = useState<string | null>(null);
  const [pickedItem, setPickedItem] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const spacesQuery = query(
      collection(db, 'spaces'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubSpaces = onSnapshot(spacesQuery, (snapshot) => {
      const s = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Space));
      setSpaces(s);
      if (s.length > 0 && !activeSpaceId) {
        setActiveSpaceId(s[0].id);
      }
    });

    const collectionsQuery = query(
      collection(db, 'collections'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );
    const unsubCollections = onSnapshot(collectionsQuery, (snapshot) => {
      setCollections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collection)));
    });

    const itemsQuery = query(
      collection(db, 'items'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );
    const unsubItems = onSnapshot(itemsQuery, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item)));
    });

    return () => {
      unsubSpaces();
      unsubCollections();
      unsubItems();
    };
  }, [user]);

  // Handlers
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const addSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceTitle.trim() || !user) return;
    try {
      const docRef = await addDoc(collection(db, 'spaces'), {
        title: newSpaceTitle,
        ownerId: user.uid,
        createdAt: Timestamp.now()
      });
      setNewSpaceTitle('');
      setIsAddingSpace(false);
      setActiveSpaceId(docRef.id);
    } catch (error) {
      console.error("Failed to add space", error);
    }
  };

  const addCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionTitle.trim() || !user || !activeSpaceId) return;
    try {
      await addDoc(collection(db, 'collections'), {
        title: newCollectionTitle,
        spaceId: activeSpaceId,
        ownerId: user.uid,
        createdAt: Timestamp.now()
      });
      setNewCollectionTitle('');
      setIsAddingCollection(false);
    } catch (error) {
      console.error("Failed to add collection", error);
    }
  };

  const addItem = async (collectionId: string, name: string) => {
    if (!name.trim() || !user) return;
    try {
      await addDoc(collection(db, 'items'), {
        name,
        collectionId,
        ownerId: user.uid,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Failed to add item", error);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (error) {
      console.error("Failed to delete item", error);
    }
  };

  const deleteCollection = async (id: string) => {
    if (!window.confirm("Delete this collection and all its items?")) return;
    try {
      // Delete items first
      const collectionItems = items.filter(i => i.collectionId === id);
      for (const item of collectionItems) {
        await deleteDoc(doc(db, 'items', item.id));
      }
      await deleteDoc(doc(db, 'collections', id));
    } catch (error) {
      console.error("Failed to delete collection", error);
    }
  };

  const deleteSpace = async (id: string) => {
    if (!window.confirm("Delete this space and all its collections?")) return;
    try {
      const spaceCollections = collections.filter(c => c.spaceId === id);
      for (const col of spaceCollections) {
        const colItems = items.filter(i => i.collectionId === col.id);
        for (const item of colItems) {
          await deleteDoc(doc(db, 'items', item.id));
        }
        await deleteDoc(doc(db, 'collections', col.id));
      }
      await deleteDoc(doc(db, 'spaces', id));
      if (activeSpaceId === id) {
        setActiveSpaceId(spaces.find(s => s.id !== id)?.id || null);
      }
    } catch (error) {
      console.error("Failed to delete space", error);
    }
  };

  const pickRandom = (collectionId: string) => {
    const collectionItems = items.filter(i => i.collectionId === collectionId);
    if (collectionItems.length === 0) return;

    setIsPicking(true);
    setPickingCollectionId(collectionId);
    setPickedItem(null);

    // Animation simulation
    let count = 0;
    const maxCount = 15;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * collectionItems.length);
      setPickedItem(collectionItems[randomIndex].name);
      count++;
      if (count >= maxCount) {
        clearInterval(interval);
        setIsPicking(false);
      }
    }, 100);
  };

  const activeSpace = spaces.find(s => s.id === activeSpaceId);
  const activeCollections = collections.filter(c => c.spaceId === activeSpaceId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8 text-zinc-400" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Dice5 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Randomizer Spaces</h1>
            <p className="text-zinc-500">Organize your collections into spaces and make decisions effortlessly.</p>
          </div>
          
          <Card className="p-8">
            <Button onClick={handleLogin} className="w-full py-4 text-lg">
              <UserIcon className="w-5 h-5" />
              Sign in with Google
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar - Spaces */}
      <aside className="w-full md:w-72 bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Dice5 className="w-6 h-6" />
            <span>Randomizer</span>
          </div>
          <Button variant="ghost" className="p-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Spaces</span>
            <button 
              onClick={() => setIsAddingSpace(true)}
              className="p-1 hover:bg-zinc-100 rounded-md text-zinc-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {isAddingSpace && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={addSpace}
                className="px-2 mb-4"
              >
                <Input 
                  autoFocus
                  value={newSpaceTitle}
                  onChange={(e) => setNewSpaceTitle(e.target.value)}
                  placeholder="Space name..."
                  className="text-sm mb-2"
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 py-1.5 text-xs">Add</Button>
                  <Button variant="ghost" onClick={() => setIsAddingSpace(false)} className="py-1.5 text-xs">Cancel</Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {spaces.map(space => (
            <div key={space.id} className="group relative">
              <button
                onClick={() => setActiveSpaceId(space.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeSpaceId === space.id 
                    ? "bg-black text-white shadow-md" 
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <Layers className={`w-4 h-4 ${activeSpaceId === space.id ? "text-white" : "text-zinc-400"}`} />
                <span className="truncate">{space.title}</span>
                {activeSpaceId === space.id && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </button>
              <button 
                onClick={() => deleteSpace(space.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-zinc-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {spaces.length === 0 && !isAddingSpace && (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-zinc-400 italic">No spaces yet. Create one to organize your collections.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ""} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-4 h-4 text-zinc-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.displayName}</p>
              <p className="text-xs text-zinc-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen p-6 md:p-10 overflow-y-auto">
        {activeSpace ? (
          <div className="max-w-6xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                  <Layers className="w-4 h-4" />
                  <span>Space</span>
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-zinc-900">{activeSpace.title}</h2>
              </div>
              <Button onClick={() => setIsAddingCollection(true)}>
                <FolderPlus className="w-4 h-4" />
                New Collection
              </Button>
            </header>

            <AnimatePresence>
              {isAddingCollection && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm"
                >
                  <Card className="max-w-md w-full p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">Create Collection</h3>
                      <button onClick={() => setIsAddingCollection(false)} className="text-zinc-400 hover:text-zinc-900">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={addCollection} className="space-y-4">
                      <Input 
                        autoFocus
                        value={newCollectionTitle}
                        onChange={(e) => setNewCollectionTitle(e.target.value)}
                        placeholder="e.g. Shirts, Snacks, Movies..."
                      />
                      <div className="flex gap-3">
                        <Button type="submit" className="flex-1">Create</Button>
                        <Button variant="ghost" onClick={() => setIsAddingCollection(false)} className="flex-1">Cancel</Button>
                      </div>
                    </form>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {activeCollections.map(collection => (
                <CollectionCard 
                  key={collection.id}
                  collection={collection}
                  items={items.filter(i => i.collectionId === collection.id)}
                  onAddItem={(name) => addItem(collection.id, name)}
                  onDeleteItem={deleteItem}
                  onDeleteCollection={() => deleteCollection(collection.id)}
                  onPick={() => pickRandom(collection.id)}
                  isPicking={isPicking && pickingCollectionId === collection.id}
                  pickedItem={pickingCollectionId === collection.id ? pickedItem : null}
                />
              ))}

              {activeCollections.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                    <LayoutGrid className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-zinc-900">No collections in this space</h3>
                    <p className="text-zinc-500">Create your first collection to start adding items.</p>
                  </div>
                  <Button variant="outline" onClick={() => setIsAddingCollection(true)}>
                    Add Collection
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto text-zinc-300">
                <Layers className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-zinc-900">Select a Space</h3>
                <p className="text-zinc-500">Choose a space from the sidebar or create a new one to get started.</p>
              </div>
              <Button onClick={() => setIsAddingSpace(true)}>
                Create New Space
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Picking Modal */}
      <AnimatePresence>
        {pickingCollectionId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-lg w-full bg-white rounded-3xl p-10 text-center space-y-8 shadow-2xl relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-zinc-100 rounded-full blur-3xl -z-10 opacity-50" />

              <div className="space-y-2">
                <p className="text-zinc-400 font-medium uppercase tracking-widest text-xs">Choosing from</p>
                <h3 className="text-2xl font-bold">{collections.find(c => c.id === pickingCollectionId)?.title}</h3>
              </div>

              <div className="h-40 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pickedItem || 'empty'}
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    className={`text-5xl md:text-6xl font-black tracking-tighter ${isPicking ? "text-zinc-300" : "text-black"}`}
                  >
                    {pickedItem || "..."}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="pt-4">
                {isPicking ? (
                  <div className="flex items-center justify-center gap-2 text-zinc-400 italic">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </motion.div>
                    <span>Picking...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button onClick={() => pickRandom(pickingCollectionId)} className="w-full py-4 text-lg">
                      <Dice5 className="w-5 h-5" />
                      Try Again
                    </Button>
                    <Button variant="ghost" onClick={() => setPickingCollectionId(null)} className="w-full">
                      Done
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CollectionCardProps {
  key?: React.Key;
  collection: Collection;
  items: Item[];
  onAddItem: (name: string) => void | Promise<void>;
  onDeleteItem: (id: string) => void | Promise<void>;
  onDeleteCollection: () => void | Promise<void>;
  onPick: () => void;
  isPicking: boolean;
  pickedItem: string | null;
}

function CollectionCard({ 
  collection, 
  items, 
  onAddItem, 
  onDeleteItem, 
  onDeleteCollection,
  onPick,
  isPicking,
  pickedItem
}: CollectionCardProps) {
  const [newItemName, setNewItemName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onAddItem(newItemName);
      setNewItemName('');
    }
  };

  return (
    <Card className="flex flex-col h-[450px]">
      <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center shadow-sm">
            <LayoutGrid className="w-5 h-5 text-zinc-600" />
          </div>
          <h3 className="font-bold text-lg text-zinc-900">{collection.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onPick}
            disabled={items.length === 0}
            className="p-2 hover:bg-black hover:text-white rounded-lg transition-all disabled:opacity-30 text-zinc-600"
            title="Pick Random"
          >
            <Dice5 className="w-5 h-5" />
          </button>
          <button 
            onClick={onDeleteCollection}
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-zinc-400"
            title="Delete Collection"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {items.map(item => (
          <motion.div 
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={item.id} 
            className="group flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-transparent hover:border-zinc-200 transition-all"
          >
            <span className="text-sm font-medium text-zinc-700">{item.name}</span>
            <button 
              onClick={() => onDeleteItem(item.id)}
              className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all text-zinc-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
        {items.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-10">
            <p className="text-sm text-zinc-400 italic">No items yet</p>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-zinc-100 bg-zinc-50/30">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input 
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add item..."
            className="text-sm"
          />
          <Button type="submit" className="px-3">
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
