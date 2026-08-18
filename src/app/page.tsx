"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, User, Bell, Users, Home, Plus, X, ChevronRight, ChevronDown, Loader2, Settings, Check, Tag, List } from "lucide-react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import { getAdminSession } from "@/lib/auth";

type Category = {
  id: string;
  name: string;
  type: 'main' | 'sub';
  parent_id: string | null;
};

type OptionItem = {
  label: string;
  has_input?: boolean;
};

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  order_index: number;
  category_name?: string | null;
  options?: OptionItem[] | string[] | string | null;
  is_multiple?: boolean | null;
};

function parseFieldOptions(rawOptions: any): OptionItem[] {
  if (!rawOptions) return [];
  if (Array.isArray(rawOptions)) {
    return rawOptions.map(item => {
      if (typeof item === 'object' && item !== null && 'label' in item) {
        return { label: String(item.label), has_input: Boolean(item.has_input) };
      }
      const str = String(item).trim();
      if (str.endsWith(':with_input')) {
        return { label: str.replace(':with_input', '').trim(), has_input: true };
      }
      return { label: str, has_input: false };
    });
  }
  if (typeof rawOptions === 'string') {
    try {
      const parsed = JSON.parse(rawOptions);
      if (Array.isArray(parsed)) return parseFieldOptions(parsed);
    } catch {
      return rawOptions.split(',').map(s => {
        const trimmed = s.trim();
        if (trimmed.endsWith(':with_input')) {
          return { label: trimmed.replace(':with_input', '').trim(), has_input: true };
        }
        return { label: trimmed, has_input: false };
      }).filter(o => o.label.length > 0);
    }
  }
  return [];
}

const CustomDatePicker = ({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (val: string) => void;
}) => {
  const parts = (value || "").split("-");
  const selectedYear = parts[0] || "";
  const selectedMonth = parts[1] || "";
  const selectedDay = parts[2] || "";

  const years = Array.from({ length: 70 }, (_, i) => (2026 - i).toString());
  const months = [
    { num: '01', name: 'Jan' },
    { num: '02', name: 'Feb' },
    { num: '03', name: 'Mar' },
    { num: '04', name: 'Apr' },
    { num: '05', name: 'May' },
    { num: '06', name: 'Jun' },
    { num: '07', name: 'Jul' },
    { num: '08', name: 'Aug' },
    { num: '09', name: 'Sep' },
    { num: '10', name: 'Oct' },
    { num: '11', name: 'Nov' },
    { num: '12', name: 'Dec' },
  ];
  const days = Array.from({ length: 31 }, (_, i) => (i + 1 < 10 ? `0${i + 1}` : `${i + 1}`));

  const handleSelectYear = (y: string) => {
    onChange(`${y}-${selectedMonth || ''}-${selectedDay || ''}`);
  };

  const handleSelectMonth = (m: string) => {
    onChange(`${selectedYear || ''}-${m}-${selectedDay || ''}`);
  };

  const handleSelectDay = (d: string) => {
    onChange(`${selectedYear || ''}-${selectedMonth || ''}-${d}`);
  };

  return (
    <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200">
      {/* 1. Year Selector */}
      <div>
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
          1. Select Year {selectedYear && <span className="text-[#2B2B2B] font-bold">({selectedYear})</span>}
        </label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {years.map(y => (
            <button
              type="button"
              key={y}
              onClick={() => handleSelectYear(y)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                selectedYear === y 
                  ? 'bg-[#2B2B2B] text-white border-[#2B2B2B] shadow-md scale-105' 
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Month Selector */}
      {selectedYear && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-1 border-t border-gray-200/60">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
            2. Select Month {selectedMonth && <span className="text-[#2B2B2B] font-bold">({months.find(m=>m.num===selectedMonth)?.name})</span>}
          </label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {months.map(m => (
              <button
                type="button"
                key={m.num}
                onClick={() => handleSelectMonth(m.num)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                  selectedMonth === m.num 
                    ? 'bg-[#2B2B2B] text-white border-[#2B2B2B] shadow-md scale-105' 
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Day Selector */}
      {selectedYear && selectedMonth && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-1 border-t border-gray-200/60">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
            3. Select Day {selectedDay && <span className="text-[#2B2B2B] font-bold">({selectedDay})</span>}
          </label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {days.map(d => (
              <button
                type="button"
                key={d}
                onClick={() => handleSelectDay(d)}
                className={`w-10 h-10 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center justify-center ${
                  selectedDay === d 
                    ? 'bg-[#2B2B2B] text-white border-[#2B2B2B] shadow-md scale-105' 
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function HomeDashboard() {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  // Data State
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbFormFields, setDbFormFields] = useState<FormField[]>([]);
  
  // Form State
  const [selectedMainCat, setSelectedMainCat] = useState<Category | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<Category | null>(null);
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, string>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counts, setCounts] = useState({ total: 0, active: 0, pending: 0, approved: 0 });
  const [showSuccess, setShowSuccess] = useState(false);
  const [recentEntrepreneurs, setRecentEntrepreneurs] = useState<any[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      router.push("/login");
      return;
    }
    fetchCounts();
    fetchConfigData();
    fetchRecent();
  }, []);

  const fetchCounts = async () => {
    try {
      const { data, error } = await supabase.from('entrepreneurs').select('status');
      if (!error && data) {
        setCounts({
          total: data.length,
          active: data.filter(e => e.status === 'Active').length,
          pending: data.filter(e => e.status === 'Pending').length,
          approved: data.filter(e => e.status === 'Approved').length
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecent = async () => {
    try {
      const { data, error } = await supabase
        .from('entrepreneurs')
        .select('*')
        .neq('status', 'Pending')
        .order('created_at', { ascending: false })
        .limit(6);
      if (!error && data) setRecentEntrepreneurs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConfigData = async () => {
    try {
      const [catsRes, fieldsRes] = await Promise.all([
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase.from('form_fields').select('*').order('order_index', { ascending: true })
      ]);
      if (!catsRes.error) setDbCategories(catsRes.data || []);
      if (!fieldsRes.error) setDbFormFields(fieldsRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setStep(1);
      setSelectedMainCat(null);
      setSelectedSubCat(null);
      setDynamicFormData({});
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const nameValue = 
      dynamicFormData['Entrepreneur Name'] || 
      dynamicFormData['Name'] || 
      dynamicFormData['Full Name'] ||
      Object.values(dynamicFormData)[0] || 
      'Unknown';

    const ageValue = 
      dynamicFormData['Age'] || 
      dynamicFormData['age'] || 
      null;

    try {
      const { error } = await supabase.from('entrepreneurs').insert([{
        name: nameValue,
        age: ageValue ? parseInt(ageValue) : null,
        main_category: selectedMainCat?.name || null,
        sub_category: selectedSubCat?.name || null,
        status: 'Pending',
        dynamic_data: dynamicFormData
      }]);
      
      if (error) throw error;
      
      setShowSuccess(true);
      fetchCounts();
      fetchRecent();
      setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 2000);
    } catch (err: any) {
      alert("Error saving: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mainCategoriesList = dbCategories.filter(c => c.type === 'main');
  const subCategoriesList = selectedMainCat 
    ? dbCategories.filter(c => c.type === 'sub' && c.parent_id === selectedMainCat.id)
    : [];

  const visibleFormFields = dbFormFields.filter(field => {
    if (!field.category_name || field.category_name === 'all') return true;
    const allowedCats = field.category_name.split(',').map(s => s.trim().toLowerCase());
    const isMainMatch = selectedMainCat && allowedCats.includes(selectedMainCat.name.toLowerCase());
    const isSubMatch = selectedSubCat && allowedCats.includes(selectedSubCat.name.toLowerCase());
    return isMainMatch || isSubMatch;
  });

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-poppins relative">
      {/* Desktop Left Sidebar */}
      <Sidebar onOpenNewModal={() => setIsDrawerOpen(true)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Desktop Header with "+ New Entrepreneur" button */}
        <DesktopHeader 
          title="Dashboard" 
          subtitle="Sri Lankan Entrepreneurs Database" 
          onOpenNewModal={() => setIsDrawerOpen(true)}
        />

        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between p-6 bg-white border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900">ISDOM</h1>
              <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wider">
                ADMIN
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-gray-900 transition-colors">
              <User className="w-5 h-5" />
            </button>
            <button className="text-gray-400 hover:text-gray-900 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dashboard Body Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-32 md:pb-12">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Entrepreneurs Hero Card */}
            <div className="bg-[#2B2B2B] rounded-[2rem] p-6 text-white relative overflow-hidden shadow-lg transform transition-transform hover:scale-[1.01] duration-300">
              <div className="relative z-10">
                <p className="text-xs text-gray-300 mb-1 font-light uppercase tracking-wider">Total Entrepreneurs</p>
                <h2 className="text-4xl font-bold tracking-tight">{counts.total}</h2>
              </div>
              
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center">
                <svg width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute right-10 opacity-30">
                  <path d="M0 20C20 20 20 10 40 10C60 10 60 30 80 30C100 30 100 20 120 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div className="w-12 h-12 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center relative z-10 border border-white/10">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Categories Stat Card */}
            <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Categories</p>
                <h3 className="text-3xl font-bold text-gray-900">{mainCategoriesList.length}</h3>
                <p className="text-xs text-gray-500 mt-1 font-medium">Main categories setup</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100">
                <Tag className="w-6 h-6" />
              </div>
            </div>

            {/* Custom Fields Stat Card */}
            <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Form Fields</p>
                <h3 className="text-3xl font-bold text-gray-900">{dbFormFields.length}</h3>
                <p className="text-xs text-gray-500 mt-1 font-medium">Custom inputs active</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100">
                <List className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Recent Added Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 px-1">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Recent Added</h3>
                <p className="text-xs text-gray-500 hidden md:block">Latest registered entrepreneur entries</p>
              </div>
              <Link href="/entrepreneurs" className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                View All →
              </Link>
            </div>
            
            {recentEntrepreneurs.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                <p className="text-sm text-gray-400">No recent entrepreneurs found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentEntrepreneurs.map((e) => {
                  const fields = e.dynamic_data ? Object.entries(e.dynamic_data as Record<string,string>) : [];
                  const initials = (e.name || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                  const isExpanded = expandedCardId === e.id;

                  return (
                    <div 
                      key={e.id} 
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
                      onClick={() => setExpandedCardId(isExpanded ? null : e.id)}
                    >
                      <div className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#2B2B2B] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                          {initials}
                        </div>

                        <div className="flex-1 min-w-0 flex items-start justify-between">
                          <div>
                            <p className="font-bold text-gray-900 text-sm truncate">{e.name || 'Unknown'}</p>
                            {(e.main_category || e.sub_category) && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {e.main_category}{e.sub_category ? ` · ${e.sub_category}` : ''}
                              </p>
                            )}
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 mt-1 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      <div 
                        className={`grid transition-all duration-300 ease-in-out bg-gray-50/60 ${
                          isExpanded ? 'grid-rows-[1fr] opacity-100 border-t border-gray-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <div className="overflow-hidden">
                          {fields.length > 0 ? (
                            <div className="p-4 grid grid-cols-2 gap-3">
                              {fields.map(([key, val]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{key}</span>
                                  <span className="text-xs font-semibold text-gray-900 truncate">{val}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-xs text-gray-500 text-center">No extra details available.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Mobile Floating Action Button */}
        <div className="md:hidden fixed bottom-24 right-6 z-40">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="w-14 h-14 bg-[#2B2B2B] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-8 py-4 flex items-center justify-around z-40 shadow-lg">
          <Link href="/" className="flex flex-col items-center justify-center text-gray-900">
            <Home className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Home</span>
          </Link>

          <Link href="/entrepreneurs" className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-900">
            <Users className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Entrepreneurs</span>
          </Link>

          <Link href="/settings" className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-900">
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </nav>
      </div>

      {/* Add Entrepreneur Drawer (Mobile) / Modal (Desktop) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          {/* Drawer / Modal Box */}
          <div 
            className={`relative w-full bg-white rounded-t-3xl md:rounded-3xl shadow-2xl z-10 transform transition-all duration-300 ease-out overflow-hidden flex flex-col ${
              step === 3 
                ? 'max-w-4xl lg:max-w-5xl xl:max-w-6xl h-[92vh] max-h-[850px]' 
                : 'max-w-md md:max-w-xl h-[65vh]'
            }`}
          >
            <div className="p-6 md:p-8 h-full flex flex-col relative">
              {/* Drawer Handle (Mobile) */}
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 md:hidden" />
              
              {/* Success Overlay */}
              {showSuccess && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-3xl animate-in fade-in duration-300">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
                  <p className="text-sm text-gray-500">Entrepreneur details saved successfully.</p>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                    {step === 1 ? "Select Main Category" : step === 2 ? "Select Sub Category" : "Add Entrepreneur Details"}
                  </h3>
                  {step === 3 && (
                    <p className="text-xs text-gray-400 mt-0.5">Please fill out all required details below</p>
                  )}
                </div>
                <button onClick={handleClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar pb-6 px-1">
                {step === 1 ? (
                  <div className="space-y-3">
                    {mainCategoriesList.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-sm text-gray-500 mb-3">No categories found.</p>
                        <Link href="/settings" className="text-[#2B2B2B] text-sm font-bold underline">Go to Settings to add one</Link>
                      </div>
                    ) : (
                      mainCategoriesList.map((cat) => {
                        const hasSub = dbCategories.some(c => c.type === 'sub' && c.parent_id === cat.id);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedMainCat(cat);
                              setSelectedSubCat(null);
                              setStep(hasSub ? 2 : 3);
                            }}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-300 text-gray-900 transition-colors bg-white hover:bg-gray-50 cursor-pointer shadow-xs"
                          >
                            <span className="font-semibold">{cat.name}</span>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </button>
                        )
                      })
                    )}
                  </div>
                ) : step === 2 ? (
                  <div className="space-y-3">
                    <button 
                      onClick={() => setStep(1)} 
                      className="text-sm text-gray-500 mb-2 hover:text-gray-900 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                       ← Back to Main Category
                    </button>
                    <div className="bg-gray-50 px-4 py-2 rounded-lg mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {selectedMainCat?.name}
                    </div>
                    
                    {subCategoriesList.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">No sub categories added for this main category yet.</p>
                      </div>
                    ) : (
                      subCategoriesList.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubCat(sub);
                            setStep(3);
                          }}
                          className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-300 text-gray-900 transition-colors bg-white hover:bg-gray-50 cursor-pointer shadow-xs"
                        >
                          <span className="font-semibold">{sub.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5 p-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <button 
                        onClick={() => {
                           const hasSub = selectedMainCat && dbCategories.some(c => c.type === 'sub' && c.parent_id === selectedMainCat.id);
                           setStep(hasSub ? 2 : 1);
                        }} 
                        className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
                      >
                         {selectedMainCat && dbCategories.some(c => c.type === 'sub' && c.parent_id === selectedMainCat.id) ? "← Change Sub Category" : "← Change Category"}
                      </button>
                      
                      <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700">
                        <span>{selectedMainCat?.name}</span>
                        {selectedSubCat && (
                          <>
                            <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                            <span>{selectedSubCat.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                      {visibleFormFields.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                          <p className="text-sm text-gray-500 mb-3">No form fields configured for this category.</p>
                          <Link href="/settings" className="text-[#2B2B2B] text-sm font-bold underline">Go to Settings to build your form</Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          {visibleFormFields.map(field => {
                            const isFullWidth = field.type === 'textarea' || (field.type === 'select' && field.is_multiple);

                            return (
                              <div key={field.id} className={`space-y-1.5 ${isFullWidth ? 'md:col-span-2' : 'md:col-span-1'}`}>
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                                  {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>

                                {field.type === 'textarea' ? (
                                  <textarea 
                                    value={dynamicFormData[field.label] || ''}
                                    onChange={(e) => setDynamicFormData({...dynamicFormData, [field.label]: e.target.value})}
                                    placeholder={`Enter ${field.label}`} 
                                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#2B2B2B] focus:bg-white transition-all min-h-[90px] text-sm"
                                    required={field.required}
                                  />
                                ) : field.type === 'select' ? (
                                  (() => {
                                    const optionsList: OptionItem[] = parseFieldOptions(field.options);
                                    const rawVal = dynamicFormData[field.label];

                                    if (field.is_multiple) {
                                      const rawList: string[] = rawVal 
                                        ? (Array.isArray(rawVal) ? (rawVal as string[]) : String(rawVal).split(',').map((s: string) => s.trim()).filter(Boolean))
                                        : [];

                                      const selectedMap: Record<string, string> = {};
                                      rawList.forEach(item => {
                                        const colonIdx = item.indexOf(': ');
                                        if (colonIdx !== -1) {
                                          selectedMap[item.substring(0, colonIdx).trim()] = item.substring(colonIdx + 2).trim();
                                        } else {
                                          selectedMap[item.trim()] = '';
                                        }
                                      });

                                      const toggleOption = (optLabel: string) => {
                                        setDynamicFormData(prev => {
                                          const prevRaw = prev[field.label];
                                          const curList: string[] = prevRaw
                                            ? (Array.isArray(prevRaw) ? (prevRaw as string[]) : String(prevRaw).split(',').map((s: string) => s.trim()).filter(Boolean))
                                            : [];
                                          
                                          const isAlreadySelected = curList.some(item => item.startsWith(optLabel + ': ') || item === optLabel);
                                          let updated: string[];
                                          if (isAlreadySelected) {
                                            updated = curList.filter(item => !(item.startsWith(optLabel + ': ') || item === optLabel));
                                          } else {
                                            updated = [...curList, optLabel];
                                          }
                                          return { ...prev, [field.label]: updated.join(', ') };
                                        });
                                      };

                                      const updateOptionAnswer = (optLabel: string, text: string) => {
                                        setDynamicFormData(prev => {
                                          const prevRaw = prev[field.label];
                                          const curList: string[] = prevRaw
                                            ? (Array.isArray(prevRaw) ? (prevRaw as string[]) : String(prevRaw).split(',').map((s: string) => s.trim()).filter(Boolean))
                                            : [];
                                          
                                          const filtered = curList.filter(item => !(item.startsWith(optLabel + ': ') || item === optLabel));
                                          const newEntry = text.trim() ? `${optLabel}: ${text.trim()}` : optLabel;
                                          return { ...prev, [field.label]: [...filtered, newEntry].join(', ') };
                                        });
                                      };

                                      return (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200">
                                          {optionsList.map((opt, idx) => {
                                            const isChecked = Object.prototype.hasOwnProperty.call(selectedMap, opt.label);
                                            const currentDetail = selectedMap[opt.label] || '';

                                            return (
                                              <div 
                                                key={idx} 
                                                className={`p-2.5 rounded-lg border transition-all ${
                                                  isChecked 
                                                    ? 'bg-white border-[#2B2B2B] shadow-xs' 
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                }`}
                                              >
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                  <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleOption(opt.label)}
                                                    className="w-4 h-4 rounded text-black focus:ring-black border-gray-300 cursor-pointer accent-[#2B2B2B]"
                                                  />
                                                  <span className="text-xs font-semibold text-gray-900">{opt.label}</span>
                                                </label>

                                                {isChecked && opt.has_input && (
                                                  <div className="mt-2 pl-6 animate-in fade-in duration-150">
                                                    <input
                                                      type="text"
                                                      placeholder={`Enter details for ${opt.label}...`}
                                                      value={currentDetail}
                                                      onChange={(e) => updateOptionAnswer(opt.label, e.target.value)}
                                                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-[#2B2B2B] font-medium"
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    }

                                    // Single selection
                                    let selectedChoice = '';
                                    let textAnswer = '';
                                    if (typeof rawVal === 'string' && rawVal) {
                                      const colonIdx = rawVal.indexOf(': ');
                                      if (colonIdx !== -1) {
                                        selectedChoice = rawVal.substring(0, colonIdx).trim();
                                        textAnswer = rawVal.substring(colonIdx + 2).trim();
                                      } else {
                                        selectedChoice = rawVal.trim();
                                      }
                                    }

                                    const activeOptObj = optionsList.find(o => o.label === selectedChoice);

                                    return (
                                      <div className="space-y-2">
                                        <select
                                          value={selectedChoice}
                                          onChange={(e) => {
                                            const choice = e.target.value;
                                            const optObj = optionsList.find(o => o.label === choice);
                                            if (optObj?.has_input && textAnswer) {
                                              setDynamicFormData({ ...dynamicFormData, [field.label]: `${choice}: ${textAnswer}` });
                                            } else {
                                              setDynamicFormData({ ...dynamicFormData, [field.label]: choice });
                                            }
                                          }}
                                          required={field.required}
                                          className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#2B2B2B] focus:bg-white transition-all text-sm cursor-pointer"
                                        >
                                          <option value="">-- Select {field.label} --</option>
                                          {optionsList.map((opt, idx) => (
                                            <option key={idx} value={opt.label}>{opt.label}</option>
                                          ))}
                                        </select>

                                        {activeOptObj?.has_input && (
                                          <div className="animate-in fade-in duration-200 pl-1">
                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                              {selectedChoice} - Details / Answer:
                                            </label>
                                            <input
                                              type="text"
                                              placeholder={`Enter details for ${selectedChoice}...`}
                                              value={textAnswer}
                                              onChange={(e) => {
                                                const txt = e.target.value;
                                                setDynamicFormData({ ...dynamicFormData, [field.label]: txt ? `${selectedChoice}: ${txt}` : selectedChoice });
                                              }}
                                              required={field.required}
                                              className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#2B2B2B] text-xs font-medium text-gray-900 shadow-xs"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()
                                ) : field.type === 'date' ? (
                                  <CustomDatePicker 
                                    value={dynamicFormData[field.label] || ''} 
                                    onChange={(val) => setDynamicFormData({...dynamicFormData, [field.label]: val})}
                                  />
                                ) : (
                                  <input 
                                    type={field.type} 
                                    value={dynamicFormData[field.label] || ''}
                                    onChange={(e) => setDynamicFormData({...dynamicFormData, [field.label]: e.target.value})}
                                    placeholder={`Enter ${field.label}`} 
                                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#2B2B2B] focus:bg-white transition-all text-sm"
                                    required={field.required}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {visibleFormFields.length > 0 && (
                        <div className="pt-4 pb-2 border-t border-gray-100 flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={handleClose}
                            className="px-6 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-3.5 bg-[#2B2B2B] text-white rounded-xl font-bold hover:bg-black transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2 text-sm cursor-pointer"
                          >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSubmitting ? 'Saving...' : 'Save Entrepreneur Details'}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
