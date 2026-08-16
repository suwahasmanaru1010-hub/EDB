"use client";
import { useState, useEffect } from "react";
import { Users, Home, Settings, ChevronDown, ChevronRight, Search, Loader2, ArrowLeft, ListFilter, X, Plus, Check } from "lucide-react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";

type Category = {
  id: string;
  name: string;
  type: 'main' | 'sub';
  parent_id: string | null;
};

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  order_index: number;
  category_name?: string | null;
};

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

import { useRouter } from "next/navigation";
import { getAdminSession } from "@/lib/auth";

export default function EntrepreneursPage() {
  const router = useRouter();
  const [entrepreneurs, setEntrepreneurs] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Add Entrepreneur Drawer / Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbFormFields, setDbFormFields] = useState<FormField[]>([]);
  const [selectedMainCat, setSelectedMainCat] = useState<Category | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<Category | null>(null);
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      router.push("/login");
      return;
    }
    fetchData();
    fetchConfigData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [entRes, catRes] = await Promise.all([
        supabase.from('entrepreneurs').select('*').neq('status', 'Pending').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true })
      ]);
        
      if (!entRes.error && entRes.data) {
        setEntrepreneurs(entRes.data);
      }
      if (!catRes.error && catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
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
      fetchData();
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

  const filteredEntrepreneurs = entrepreneurs.filter(e => {
    const matchesSearch = e.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.main_category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesMainCategory = selectedCategory ? e.main_category === selectedCategory : true;
    const matchesSubCategory = selectedSubCategory ? e.sub_category === selectedSubCategory : true;
    
    return matchesSearch && matchesMainCategory && matchesSubCategory;
  });

  const mainCats = categories.filter(c => c.type === 'main');
  const activeSubCats = selectedCategory 
    ? categories.filter(c => c.type === 'sub' && c.parent_id === categories.find(m => m.name === selectedCategory)?.id)
    : [];

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
    <div className="flex min-h-screen bg-[#FDFDFD] text-[#2B2B2B] font-poppins relative">
      {/* Desktop Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Desktop Header */}
        <DesktopHeader 
          title="Entrepreneurs Directory" 
          subtitle="All registered Sri Lankan entrepreneur entries" 
          showNewButton={true}
          showIcons={false}
          onOpenNewModal={() => setIsDrawerOpen(true)}
          showSearch={true}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by name or category..."
        />

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-6 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Entrepreneurs</h1>
              <p className="text-xs text-gray-500 font-medium">All registered entries</p>
            </div>
          </div>

          <button 
            onClick={() => setShowFilters(true)} 
            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${showFilters || selectedCategory ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-900 border-gray-100 hover:bg-gray-100'}`}
          >
            <ListFilter className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-32 md:pb-12">
          
          {/* Controls Bar: Mobile Search */}
          <div className="md:hidden flex flex-col gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search by name or category..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent shadow-sm transition-all placeholder-gray-400"
              />
            </div>
          </div>

          {/* Desktop Filter Pills Bar */}
          <div className="hidden md:flex flex-col gap-2 mb-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2 shrink-0">Category:</span>
              <button
                onClick={() => { setSelectedCategory(""); setSelectedSubCategory(""); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                  selectedCategory === "" 
                    ? 'bg-[#2B2B2B] text-white border-[#2B2B2B] shadow-sm' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                All Categories
              </button>
              {mainCats.map(mainCat => (
                <button
                  key={mainCat.id}
                  onClick={() => {
                    if (selectedCategory === mainCat.name) {
                      setSelectedCategory("");
                      setSelectedSubCategory("");
                    } else {
                      setSelectedCategory(mainCat.name);
                      setSelectedSubCategory("");
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                    selectedCategory === mainCat.name
                      ? 'bg-[#2B2B2B] text-white border-[#2B2B2B] shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {mainCat.name}
                </button>
              ))}
            </div>

            {/* Sub Categories Pills (Desktop) */}
            {selectedCategory && activeSubCats.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 no-scrollbar pl-20 animate-in fade-in duration-200">
                <span className="text-xs font-semibold text-gray-400 mr-1 shrink-0">Sub:</span>
                <button
                  onClick={() => setSelectedSubCategory("")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 ${
                    selectedSubCategory === "" 
                      ? 'bg-gray-200 text-gray-900 border-gray-300 font-bold' 
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  All {selectedCategory}
                </button>
                {activeSubCats.map(subCat => (
                  <button
                    key={subCat.id}
                    onClick={() => setSelectedSubCategory(selectedSubCategory === subCat.name ? "" : subCat.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 ${
                      selectedSubCategory === subCat.name
                        ? 'bg-gray-200 text-gray-900 border-gray-300 font-bold'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {subCat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid of Entrepreneurs */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              <p className="text-sm font-bold text-gray-400">Loading entries...</p>
            </div>
          ) : filteredEntrepreneurs.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 flex flex-col items-center justify-center gap-2 shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                <Users className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-base font-bold text-gray-900">No entrepreneurs found</p>
              <p className="text-sm text-gray-500 max-w-sm">
                {searchQuery || selectedCategory ? "Try adjusting your search query or category filters." : "You haven't added any entrepreneurs yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEntrepreneurs.map((e) => {
                const fields = e.dynamic_data ? Object.entries(e.dynamic_data as Record<string,string>) : [];
                const initials = (e.name || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                const isExpanded = expandedCardId === e.id;

                return (
                  <div 
                    key={e.id} 
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between"
                    onClick={() => setExpandedCardId(isExpanded ? null : e.id)}
                  >
                    <div className="p-5 flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-full bg-[#2B2B2B] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0 flex items-start justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-base truncate">{e.name || 'Unknown'}</p>
                          {(e.main_category || e.sub_category) && (
                            <p className="text-xs text-gray-500 mt-0.5 font-medium">
                              {e.main_category}{e.sub_category ? ` · ${e.sub_category}` : ''}
                            </p>
                          )}
                        </div>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 mt-1 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    <div 
                      className={`grid transition-all duration-300 ease-in-out bg-gray-50/70 ${
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
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-8 py-4 flex items-center justify-around z-40 shadow-lg">
          <Link href="/" className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-900">
            <Home className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/entrepreneurs" className="flex flex-col items-center justify-center text-gray-900">
            <Users className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Entrepreneurs</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-900">
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </nav>
      </div>

      {/* Add Entrepreneur Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          <div 
            className="relative w-full max-w-md md:max-w-xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl z-10 transform transition-all duration-300 ease-out overflow-hidden flex flex-col"
            style={{ height: step === 3 ? '85vh' : '65vh' }}
          >
            <div className="p-6 h-full flex flex-col relative">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 md:hidden" />
              
              {showSuccess && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-3xl animate-in fade-in duration-300">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
                  <p className="text-sm text-gray-500">Entrepreneur details saved successfully.</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">
                  {step === 1 ? "Select Main Category" : step === 2 ? "Select Sub Category" : "Add Entrepreneur Details"}
                </h3>
                <button onClick={handleClose} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-300 text-gray-900 transition-colors bg-white hover:bg-gray-50"
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
                      className="text-sm text-gray-500 mb-2 hover:text-gray-900 font-medium flex items-center gap-1 transition-colors"
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
                          className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-300 text-gray-900 transition-colors bg-white hover:bg-gray-50"
                        >
                          <span className="font-semibold">{sub.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4 p-1">
                    <button 
                      onClick={() => {
                         const hasSub = selectedMainCat && dbCategories.some(c => c.type === 'sub' && c.parent_id === selectedMainCat.id);
                         setStep(hasSub ? 2 : 1);
                      }} 
                      className="text-sm text-gray-500 mb-1 hover:text-gray-900 font-medium flex items-center gap-1 transition-colors"
                    >
                       {selectedMainCat && dbCategories.some(c => c.type === 'sub' && c.parent_id === selectedMainCat.id) ? "← Back to Sub Categories" : "← Back to Categories"}
                    </button>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg inline-block border border-gray-200">
                        {selectedMainCat?.name} {selectedSubCat && <><ChevronRight className="w-3 h-3 inline mx-1 text-gray-400" /> {selectedSubCat.name}</>}
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                      {visibleFormFields.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-gray-500 mb-3">No form fields configured for this category.</p>
                          <Link href="/settings" className="text-[#2B2B2B] text-sm font-bold underline">Go to Settings to build your form</Link>
                        </div>
                      ) : (
                        visibleFormFields.map(field => (
                          <div key={field.id} className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-900">
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                              <textarea 
                                value={dynamicFormData[field.label] || ''}
                                onChange={(e) => setDynamicFormData({...dynamicFormData, [field.label]: e.target.value})}
                                placeholder={`Enter ${field.label}`} 
                                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#2B2B2B] focus:bg-white transition-all min-h-[100px]"
                                required={field.required}
                              />
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
                                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#2B2B2B] focus:bg-white transition-all"
                                required={field.required}
                              />
                            )}
                          </div>
                        ))
                      )}

                      {visibleFormFields.length > 0 && (
                        <div className="pt-4 pb-2">
                          <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-[#2B2B2B] text-white rounded-xl font-bold hover:bg-black transition-colors shadow-lg disabled:opacity-50 flex justify-center items-center gap-2"
                          >
                            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                            {isSubmitting ? 'Saving...' : 'Save Details'}
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

      {/* Filter Sidebar Drawer (Mobile Filter Drawer) */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowFilters(false)}
          />

          <div className="relative w-full max-w-[340px] bg-white h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Filter by Category</h2>
              <button onClick={() => setShowFilters(false)} className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4 text-gray-900 font-bold" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <button 
                onClick={() => { setSelectedCategory(""); setSelectedSubCategory(""); setShowFilters(false); }} 
                className={`w-full text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all ${selectedCategory === "" ? 'bg-[#2B2B2B] text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'}`}
              >
                All Categories
              </button>
              
              {mainCats.map(mainCat => {
                const isSelected = selectedCategory === mainCat.name;
                const subCategories = categories.filter(c => c.parent_id === mainCat.id);
                
                return (
                  <div key={mainCat.id} className="space-y-1.5">
                    <button 
                      onClick={() => { 
                        setSelectedCategory(mainCat.name); 
                        setSelectedSubCategory(""); 
                        if (subCategories.length === 0) setShowFilters(false);
                      }} 
                      className={`w-full text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${isSelected ? 'bg-[#2B2B2B] text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'}`}
                    >
                      <span>{mainCat.name}</span>
                      {subCategories.length > 0 && (
                        <ChevronDown className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                    
                    {isSelected && subCategories.length > 0 && (
                      <div className="pl-4 pr-1 py-1 space-y-1.5 border-l-2 border-gray-100 ml-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button 
                          onClick={() => { setSelectedSubCategory(""); setShowFilters(false); }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${selectedSubCategory === "" ? 'bg-gray-200 text-black' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                          All {mainCat.name}
                        </button>
                        {subCategories.map(subCat => (
                          <button 
                            key={subCat.id}
                            onClick={() => { setSelectedSubCategory(subCat.name); setShowFilters(false); }}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${selectedSubCategory === subCat.name ? 'bg-gray-200 text-black' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                            {subCat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
