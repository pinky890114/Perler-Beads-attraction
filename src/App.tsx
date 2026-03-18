import React, { useState, useEffect, useMemo } from 'react';
import { Search, Lock, Plus, Edit2, Trash2, X, Save, Unlock, Package, Palette, Clock } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';

// --- Types & Constants ---
type Status = '湊團中' | '製稿中' | '等待材料中' | '拼豆中' | '已寄出';

interface Commission {
  id: string;
  nickname: string;
  contact: string;
  project: string;
  date: string;
  amount: number;
  status: Status;
}

const STAGES: Status[] = ['湊團中', '製稿中', '等待材料中', '拼豆中', '已寄出'];

// --- Main Application Component ---
export default function App() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const isAdmin = !!user;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Commission>>({});

  // --- Firebase Listeners ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const unsubscribeDB = onSnapshot(collection(db, 'commissions'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commission));
      setCommissions(data);
    }, (error) => {
      console.error("Error fetching commissions:", error);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDB();
    };
  }, []);

  // --- Derived Data for Summary Boxes ---
  const summary = useMemo(() => {
    return commissions.reduce(
      (acc, curr) => {
        if (['湊團中', '製稿中', '等待材料中'].includes(curr.status)) acc.queued++;
        else if (curr.status === '拼豆中') acc.inProgress++;
        else if (curr.status === '已寄出') acc.completed++;
        return acc;
      },
      { queued: 0, inProgress: 0, completed: 0 }
    );
  }, [commissions]);

  // --- Handlers ---
  const handleOpenModal = (commission?: Commission) => {
    if (commission) {
      setEditingId(commission.id);
      setFormData(commission);
    } else {
      setEditingId(null);
      setFormData({
        id: '', nickname: '', contact: '', project: '', date: new Date().toISOString().split('T')[0], amount: 0, status: '湊團中'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.nickname) return alert('編號與暱稱不可為空！');

    try {
      // Use the provided ID as the document ID in Firestore
      await setDoc(doc(db, 'commissions', formData.id), formData);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving document: ", error);
      alert('儲存失敗，請確認您是否有管理員權限！');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('確定要刪除這筆委託嗎？')) {
      try {
        await deleteDoc(doc(db, 'commissions', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert('刪除失敗，請確認您是否有管理員權限！');
      }
    }
  };

  const handleQuickUpdateStatus = async (id: string, currentStatus: Status) => {
    const currentIndex = STAGES.indexOf(currentStatus);
    if (currentIndex < STAGES.length - 1) {
      const nextStatus = STAGES[currentIndex + 1];
      try {
        await updateDoc(doc(db, 'commissions', id), { status: nextStatus });
      } catch (error) {
        console.error("Error updating document: ", error);
        alert('更新失敗，請確認您是否有管理員權限！');
      }
    }
  };

  const toggleAdmin = async () => {
    if (isAdmin) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Error signing out: ", error);
      }
    } else {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (error: any) {
        console.error("Error signing in: ", error);
        if (error.code === 'auth/unauthorized-domain') {
          alert('登入失敗：請先將此網址加入 Firebase Authentication 的「已授權網域」中！');
        } else {
          alert('登入失敗！');
        }
      }
    }
    setSearchQuery('');
  };

  // --- Filtered Results for Client ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return commissions.filter(c => 
      c.id.toLowerCase().includes(query) || 
      c.nickname.toLowerCase().includes(query)
    );
  }, [commissions, searchQuery]);

  // --- UI Components ---
  const SummaryBoxes = () => (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center border border-[#F4EFEA]">
        <div className="bg-[#E8C5C5]/20 p-3 rounded-2xl mb-3">
          <Clock className="w-6 h-6 text-[#D4B895]" />
        </div>
        <div className="text-sm text-[#8CA6DB] font-medium mb-1">排單中</div>
        <div className="text-3xl font-bold text-[#5C4A3D]">{summary.queued}</div>
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center border border-[#F4EFEA]">
        <div className="bg-[#8CA6DB]/20 p-3 rounded-2xl mb-3">
          <Palette className="w-6 h-6 text-[#8CA6DB]" />
        </div>
        <div className="text-sm text-[#8CA6DB] font-medium mb-1">製作中</div>
        <div className="text-3xl font-bold text-[#5C4A3D]">{summary.inProgress}</div>
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center border border-[#F4EFEA]">
        <div className="bg-[#D4B895]/20 p-3 rounded-2xl mb-3">
          <Package className="w-6 h-6 text-[#D4B895]" />
        </div>
        <div className="text-sm text-[#8CA6DB] font-medium mb-1">已完稿</div>
        <div className="text-3xl font-bold text-[#5C4A3D]">{summary.completed}</div>
      </div>
    </div>
  );

  const ProgressBar = ({ currentStatus }: { currentStatus: Status }) => {
    const currentIndex = STAGES.indexOf(currentStatus);
    
    return (
      <div className="relative flex items-center justify-between w-full mt-8 mb-4 px-2 sm:px-6">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-[#F4EFEA] rounded-full z-0"></div>
        
        {/* Active Line */}
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-[#8CA6DB] rounded-full z-0 transition-all duration-500 ease-in-out"
          style={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
        ></div>

        {/* Circles */}
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={stage} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? 'bg-[#8CA6DB] border-2 border-[#8CA6DB]' :
                  isCurrent ? 'bg-white border-4 border-[#8CA6DB] shadow-[0_0_15px_rgba(140,166,219,0.8)] scale-125' :
                  'bg-white border-2 border-[#E8C5C5]'
                }`}
              >
                {isCompleted && <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"></div>}
                {isCurrent && <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#8CA6DB] rounded-full animate-pulse"></div>}
              </div>
              <span className={`absolute top-10 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors duration-300 ${
                isCurrent ? 'text-[#8CA6DB] font-bold' : 
                isCompleted ? 'text-[#5C4A3D]' : 
                'text-[#D4B895]'
              }`}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#5C4A3D] font-sans selection:bg-[#8CA6DB] selection:text-white pb-20">
      {/* Header */}
      <header className="pt-12 pb-8 px-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#5C4A3D] tracking-wide">
          <span className="text-[#8CA6DB]">✿</span> 拼豆進度追蹤 <span className="text-[#8CA6DB]">✿</span>
        </h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6">
        <SummaryBoxes />

        {/* --- Admin View --- */}
        {isAdmin ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#F4EFEA] animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#5C4A3D]">後台管理</h2>
              <button 
                onClick={() => handleOpenModal()}
                className="bg-[#8CA6DB] hover:bg-[#7A94C9] text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> 新增委託
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#F4EFEA] text-[#8CA6DB]">
                    <th className="p-3 font-medium">編號</th>
                    <th className="p-3 font-medium">暱稱</th>
                    <th className="p-3 font-medium">項目</th>
                    <th className="p-3 font-medium">狀態</th>
                    <th className="p-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-[#D4B895]">目前沒有任何委託資料</td>
                    </tr>
                  ) : (
                    commissions.map(c => (
                      <tr key={c.id} className="border-b border-[#F4EFEA] hover:bg-[#FDFBF7]/50 transition-colors">
                        <td className="p-3 font-medium">{c.id}</td>
                        <td className="p-3">{c.nickname}</td>
                        <td className="p-3">{c.project}</td>
                        <td className="p-3">
                          <span className="bg-[#E8C5C5]/20 text-[#5C4A3D] px-3 py-1 rounded-2xl text-sm">
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3 text-right flex justify-end gap-2">
                          {c.status !== '已寄出' && (
                            <button 
                              onClick={() => handleQuickUpdateStatus(c.id, c.status)}
                              className="p-2 bg-[#8CA6DB]/10 text-[#8CA6DB] hover:bg-[#8CA6DB] hover:text-white rounded-2xl transition-colors"
                              title="推進下一個狀態"
                            >
                              <Package className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenModal(c)}
                            className="p-2 bg-[#D4B895]/10 text-[#D4B895] hover:bg-[#D4B895] hover:text-white rounded-2xl transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(c.id)}
                            className="p-2 bg-red-50 text-red-400 hover:bg-red-400 hover:text-white rounded-2xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* --- Client View --- */
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#F4EFEA]">
              <h2 className="text-xl font-bold text-[#5C4A3D] mb-4 text-center">查詢您的委託進度</h2>
              <div className="relative max-w-md mx-auto">
                <input 
                  type="text" 
                  placeholder="請輸入編號或暱稱..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FDFBF7] border-2 border-[#F4EFEA] focus:border-[#8CA6DB] outline-none rounded-3xl py-3 pl-12 pr-4 text-[#5C4A3D] placeholder-[#D4B895] transition-colors"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8CA6DB] w-5 h-5" />
              </div>
            </div>

            {searchQuery.trim() !== '' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                {searchResults.length === 0 ? (
                  <div className="text-center text-[#D4B895] p-8 bg-white rounded-3xl border border-[#F4EFEA]">
                    找不到符合的委託資料，請確認編號或暱稱是否正確。
                  </div>
                ) : (
                  searchResults.map(c => (
                    <div key={c.id} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#F4EFEA]">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
                        <div>
                          <h3 className="text-2xl font-bold text-[#5C4A3D]">{c.nickname} 的委託</h3>
                          <p className="text-[#D4B895] mt-1">編號：{c.id}</p>
                        </div>
                        <div className="bg-[#FDFBF7] px-4 py-2 rounded-2xl border border-[#F4EFEA] text-sm space-y-1">
                          <p><span className="text-[#8CA6DB]">項目：</span>{c.project}</p>
                          <p><span className="text-[#8CA6DB]">日期：</span>{c.date}</p>
                          <p><span className="text-[#8CA6DB]">金額：</span>NT$ {c.amount}</p>
                        </div>
                      </div>
                      
                      <div className="pb-8">
                        <ProgressBar currentStatus={c.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer & Admin Toggle */}
      <footer className="fixed bottom-0 w-full p-4 flex justify-center items-center bg-gradient-to-t from-[#FDFBF7] to-transparent pointer-events-none">
        <button 
          onClick={toggleAdmin}
          className="pointer-events-auto p-3 bg-white rounded-full shadow-md text-[#D4B895] hover:text-[#8CA6DB] hover:scale-110 transition-all"
          title={isAdmin ? "登出後台" : "登入後台"}
        >
          {isAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
        </button>
      </footer>

      {/* --- Admin Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#5C4A3D]/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#5C4A3D]">{editingId ? '編輯委託' : '新增委託'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#D4B895] hover:text-[#5C4A3D] transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8CA6DB] mb-1 ml-2">編號</label>
                  <input required type="text" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={!!editingId} className="w-full bg-[#FDFBF7] border-2 border-[#F4EFEA] focus:border-[#8CA6DB] outline-none rounded-2xl px-4 py-2 text-[#5C4A3D] disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8CA6DB] mb-1 ml-2">暱稱</label>
                  <input required type="text" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} className="w-full bg-[#FDFBF7] border-2 border-[#F4EFEA] focus:border-[#8CA6DB] outline-none rounded-2xl px-4 py-2 text-[#5C4A3D]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8CA6DB] mb-1 ml-2">聯絡方式</label>
                <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="w-full bg-[#FDFBF7] border-2 border-[#F4EFEA] focus:border-[#8CA6DB] outline-none rounded-2xl px-4 py-2 text-[#5C4A3D]" />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8CA6DB] mb-1 ml-2">委託項目</label>
                <input required type="text" value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} className="w-full bg-[#FDFBF7] border-2 border-[#F4EFEA] focus:border-[#8CA6DB] outline-none rounded-2xl px-4 py-2 text-[#5C4A3D]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8CA6DB] mb-1 ml-2">日期</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-[#FDFBF7] border-2 border-[#F4EFEA] focus:border-[#8CA6DB] outline-none rounded-2xl px-4 py-2 text-[#5C4A3D]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8CA6DB] mb-1 ml-2">金額</label>
                  <input required type="number" min="0" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full bg-[#FDFBF7] border-2 border-[#F4EFEA] focus:border-[#8CA6DB] outline-none rounded-2xl px-4 py-2 text-[#5C4A3D]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8CA6DB] mb-1 ml-2">進度狀態</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Status})} className="w-full bg-[#FDFBF7] border-2 border-[#F4EFEA] focus:border-[#8CA6DB] outline-none rounded-2xl px-4 py-2 text-[#5C4A3D] appearance-none">
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full bg-[#8CA6DB] hover:bg-[#7A94C9] text-white font-medium py-3 rounded-2xl mt-6 flex justify-center items-center gap-2 transition-colors">
                <Save className="w-5 h-5" /> 儲存委託
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
