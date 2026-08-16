"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, X, Loader2, AlertTriangle, Home, Users, Settings, Pencil, Tag, Check, ShieldCheck, Eye, EyeOff, KeyRound, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import { getAdminSession } from "@/lib/auth";

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

type SystemUser = {
  id: string;
  name: string;
  passcode: string;
  allowed_tabs?: string[];
  created_at?: string;
};

const AVAILABLE_TABS = [
  { id: '/', label: 'Dashboard' },
  { id: '/entrepreneurs', label: 'Entrepreneurs' },
  { id: '/cs-forms', label: 'CS Forms' },
  { id: '/settings', label: 'Settings' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'form' | 'users'>('categories');
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [adminsList, setAdminsList] = useState<SystemUser[]>([]);
  const [showPasscodes, setShowPasscodes] = useState<Record<string, boolean>>({});

  // Add / Edit Category Drawer State
  const [catDrawer, setCatDrawer] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    type: 'main' | 'sub';
    parentId: string | null;
    parentName?: string;
    editId?: string | null;
  }>({ isOpen: false, mode: 'add', type: 'main', parentId: null });
  const [catNameInput, setCatNameInput] = useState("");
  const [isSavingCat, setIsSavingCat] = useState(false);

  // Add Form Field Drawer State
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false);
  const [isCategoryPanelExpanded, setIsCategoryPanelExpanded] = useState(false);
  
  const [newField, setNewField] = useState<{
    label: string;
    type: string;
    required: boolean;
    selectedCategoryNames: string[];
  }>({ 
    label: '', 
    type: 'text', 
    required: true,
    selectedCategoryNames: ['all']
  });
  
  const [isSavingField, setIsSavingField] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [expandedCatIdsInPicker, setExpandedCatIdsInPicker] = useState<string[]>([]);

  // Add User Drawer State
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPasscode, setNewAdminPasscode] = useState("");
  const [newAdminAllowedTabs, setNewAdminAllowedTabs] = useState<string[]>(['/', '/entrepreneurs', '/cs-forms', '/settings']);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  const FIELD_TYPES = [
    { value: 'text', label: 'Text (Short)' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'tel', label: 'Phone Number' },
    { value: 'email', label: 'Email' },
    { value: 'date', label: 'Date' },
    { value: 'url', label: 'Website URL' },
    { value: 'file', label: 'File Upload' },
  ];

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const router = useRouter();

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      router.push("/login");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catsRes, fieldsRes, adminsRes] = await Promise.all([
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase.from('form_fields').select('*').order('order_index', { ascending: true }),
        supabase.from('admins').select('*').order('created_at', { ascending: true })
      ]);
      
      if (!catsRes.error) setCategories(catsRes.data || []);
      if (!fieldsRes.error) setFormFields(fieldsRes.data || []);
      if (!adminsRes.error && adminsRes.data) {
        setAdminsList(adminsRes.data);
      } else {
        // Fallback default user if no DB admins table exists yet
        setAdminsList([{ id: 'default-admin', name: 'Janaki', passcode: '73332210', allowed_tabs: ['/', '/entrepreneurs', '/cs-forms', '/settings'] }]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddCategory = (type: 'main' | 'sub', parentId: string | null = null, parentName?: string) => {
    setCatNameInput("");
    setCatDrawer({
      isOpen: true,
      mode: 'add',
      type,
      parentId,
      parentName,
      editId: null,
    });
  };

  const openEditCategory = (cat: Category) => {
    setCatNameInput(cat.name);
    setCatDrawer({
      isOpen: true,
      mode: 'edit',
      type: cat.type,
      parentId: cat.parent_id,
      editId: cat.id,
    });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim()) return;
    setIsSavingCat(true);

    try {
      if (catDrawer.mode === 'edit' && catDrawer.editId) {
        const { error } = await supabase
          .from('categories')
          .update({ name: catNameInput.trim() })
          .eq('id', catDrawer.editId);

        if (error) throw error;

        setCategories(categories.map(c => c.id === catDrawer.editId ? { ...c, name: catNameInput.trim() } : c));
      } else {
        const { data, error } = await supabase.from('categories').insert([
          { 
            name: catNameInput.trim(), 
            type: catDrawer.type, 
            parent_id: catDrawer.parentId 
          }
        ]).select();

        if (error) throw error;

        setCategories([...categories, ...(data || [])]);
      }

      setCatNameInput("");
      setCatDrawer(prev => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      alert("Failed to save category: " + err.message);
    } finally {
      setIsSavingCat(false);
    }
  };

  const confirmDeleteCategory = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete "${name}"?`,
      message: "Are you sure you want to delete this category? All associated sub-categories will also be removed.",
      onConfirm: () => executeDeleteCategory(id)
    });
  };

  const executeDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      await supabase.from('categories').delete().eq('parent_id', id);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id && c.parent_id !== id));
    } catch (err: any) {
      alert("Error deleting category: " + err.message);
    }
  };

  // Toggle Category Selection in Multi-Select
  const toggleCategorySelection = (catName: string) => {
    if (catName === 'all') {
      setNewField(prev => ({ ...prev, selectedCategoryNames: ['all'] }));
      return;
    }

    setNewField(prev => {
      let updated = prev.selectedCategoryNames.filter(n => n !== 'all');
      if (updated.includes(catName)) {
        updated = updated.filter(n => n !== catName);
      } else {
        updated.push(catName);
      }

      if (updated.length === 0) {
        updated = ['all'];
      }
      return { ...prev, selectedCategoryNames: updated };
    });
  };

  const removeCategorySelection = (catName: string) => {
    setNewField(prev => {
      let updated = prev.selectedCategoryNames.filter(n => n !== catName);
      if (updated.length === 0) updated = ['all'];
      return { ...prev, selectedCategoryNames: updated };
    });
  };

  const togglePickerCategoryExpand = (catId: string) => {
    setExpandedCatIdsInPicker(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newField.label.trim()) return;
    setIsSavingField(true);

    const isAll = newField.selectedCategoryNames.includes('all') || newField.selectedCategoryNames.length === 0;
    const categoryString = isAll ? null : newField.selectedCategoryNames.join(', ');

    const payload: any = { 
      label: newField.label.trim(), 
      type: newField.type, 
      required: newField.required,
      order_index: formFields.length,
      category_name: categoryString
    };

    try {
      let { data, error } = await supabase.from('form_fields').insert([payload]).select();

      if (error && error.message.includes('category_name')) {
        delete payload.category_name;
        const res = await supabase.from('form_fields').insert([payload]).select();
        data = res.data;
        error = res.error;
      }

      if (error) throw error;

      setFormFields([...formFields, ...(data || [])]);
      setNewField({ label: '', type: 'text', required: true, selectedCategoryNames: ['all'] });
      setFieldDrawerOpen(false);
      setIsCategoryPanelExpanded(false);
    } catch (err: any) {
      alert("Failed to save field: " + err.message);
    } finally {
      setIsSavingField(false);
    }
  };

  const confirmDeleteField = (id: string, label: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete "${label}" field?`,
      message: "Are you sure you want to delete this form field? This action cannot be undone.",
      onConfirm: () => executeDeleteField(id)
    });
  };

  const executeDeleteField = async (id: string) => {
    try {
      const { error } = await supabase.from('form_fields').delete().eq('id', id);
      if (error) throw error;
      setFormFields(formFields.filter(f => f.id !== id));
    } catch (err: any) {
      alert("Error deleting field: " + err.message);
    }
  };

  // Add New System User
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminPasscode.trim()) return;
    setIsSavingAdmin(true);

    const payload = {
      name: newAdminName.trim(),
      passcode: newAdminPasscode.trim(),
      allowed_tabs: newAdminAllowedTabs.length > 0 ? newAdminAllowedTabs : ['/', '/entrepreneurs', '/cs-forms', '/settings']
    };

    try {
      let { data, error } = await supabase.from('admins').insert([payload]).select();

      if (error && error.message.includes('allowed_tabs')) {
        const { allowed_tabs, ...basicPayload } = payload;
        const res = await supabase.from('admins').insert([basicPayload]).select();
        data = res.data;
        error = res.error;
      }

      if (error) throw error;

      setAdminsList([...adminsList, ...(data || [payload as any])]);
      setNewAdminName("");
      setNewAdminPasscode("");
      setNewAdminAllowedTabs(['/', '/entrepreneurs', '/cs-forms', '/settings']);
      setAdminModalOpen(false);
    } catch (err: any) {
      const newObj = {
        id: Date.now().toString(),
        name: newAdminName.trim(),
        passcode: newAdminPasscode.trim(),
        allowed_tabs: newAdminAllowedTabs
      };
      setAdminsList([...adminsList, newObj]);
      setNewAdminName("");
      setNewAdminPasscode("");
      setNewAdminAllowedTabs(['/', '/entrepreneurs', '/cs-forms', '/settings']);
      setAdminModalOpen(false);
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const confirmDeleteAdmin = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete User "${name}"?`,
      message: "Are you sure you want to delete this user account?",
      onConfirm: () => executeDeleteAdmin(id)
    });
  };

  const executeDeleteAdmin = async (id: string) => {
    try {
      await supabase.from('admins').delete().eq('id', id);
      setAdminsList(adminsList.filter(a => a.id !== id));
    } catch (err: any) {
      setAdminsList(adminsList.filter(a => a.id !== id));
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FDFDFD] text-[#2B2B2B] font-poppins relative">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Desktop Header */}
        <DesktopHeader 
          title="Settings" 
          subtitle="Configure system categories, form fields & system users" 
          showNewButton={false}
          showSearch={false}
        />

        {/* Mobile Header */}
        <header className="flex md:hidden items-center gap-4 p-6 bg-white border-b border-gray-100">
          <Link href="/" className="p-2 -ml-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-32 md:pb-12">
          {/* Tabs */}
          <div className="flex mb-6 overflow-x-auto no-scrollbar">
            <div className="flex w-full md:w-auto bg-gray-100 rounded-xl p-1 gap-1">
              <button 
                onClick={() => setActiveTab('categories')}
                className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all shrink-0 ${
                  activeTab === 'categories' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Categories Management
              </button>
              <button 
                onClick={() => setActiveTab('form')}
                className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all shrink-0 ${
                  activeTab === 'form' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Form Builder
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all shrink-0 ${
                  activeTab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Users
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
            </div>
          ) : (
            <>
              {/* CATEGORIES TAB */}
              {activeTab === 'categories' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Main Categories</h2>
                    <button 
                      onClick={() => openAddCategory('main')} 
                      className="px-3.5 py-2 bg-[#2B2B2B] text-white rounded-xl hover:bg-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Category
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {categories.filter(c => c.type === 'main').map(mainCat => (
                      <div key={mainCat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
                        {/* Main Cat Row */}
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => setExpandedCatId(expandedCatId === mainCat.id ? null : mainCat.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                            {expandedCatId === mainCat.id ? <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />}
                            <span className="font-semibold text-gray-900 truncate">{mainCat.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                openEditCategory(mainCat);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Main Category"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); confirmDeleteCategory(mainCat.id, mainCat.name); }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Main Category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Sub Categories (Expanded) */}
                        {expandedCatId === mainCat.id && (
                          <div className="bg-gray-50 p-4 border-t border-gray-100 space-y-2">
                            {categories.filter(c => c.parent_id === mainCat.id).map(subCat => (
                              <div key={subCat.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                                <span className="text-sm font-medium text-gray-700 truncate mr-2">{subCat.name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button 
                                    onClick={() => openEditCategory(subCat)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                                    title="Edit Sub Category"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => confirmDeleteCategory(subCat.id, subCat.name)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                                    title="Delete Sub Category"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            
                            <button 
                              onClick={() => openAddCategory('sub', mainCat.id, mainCat.name)}
                              className="w-full mt-2 py-2.5 border-2 border-dashed border-gray-200 text-gray-500 text-sm font-semibold rounded-lg hover:border-gray-300 hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <Plus className="w-4 h-4" /> Add Sub Category
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {categories.filter(c => c.type === 'main').length === 0 && (
                      <div className="col-span-full text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200">
                        <p className="text-sm text-gray-500 mb-3">No categories found.</p>
                        <button 
                          onClick={() => openAddCategory('main')}
                          className="py-2.5 px-4 bg-[#2B2B2B] text-white text-sm font-bold rounded-xl hover:bg-black transition-colors inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> Create First Category
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FORM BUILDER TAB */}
              {activeTab === 'form' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Dynamic Form Fields</h2>
                    <button 
                      onClick={() => {
                        setNewField({ label: '', type: 'text', required: true, selectedCategoryNames: ['all'] });
                        setIsCategoryPanelExpanded(false);
                        setFieldDrawerOpen(true);
                      }} 
                      className="px-3.5 py-2 bg-[#2B2B2B] text-white rounded-xl hover:bg-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Field
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {formFields.map((field) => {
                      const catList = field.category_name ? field.category_name.split(',').map(s => s.trim()) : [];
                      
                      return (
                        <div key={field.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between gap-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-gray-900">{field.label}</span>
                                {field.required && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">REQUIRED</span>}
                              </div>
                              <p className="text-xs text-gray-500 uppercase font-medium">Type: {field.type}</p>
                            </div>
                            
                            <button 
                              onClick={() => confirmDeleteField(field.id, field.label)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Category Scope Badges */}
                          <div className="pt-2 border-t border-gray-50 flex items-start justify-between gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mt-0.5">Scope:</span>
                            {catList.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {catList.map(cat => (
                                  <span key={cat} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                                    <Tag className="w-2.5 h-2.5" /> {cat}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                All Categories
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <button 
                      onClick={() => {
                        setNewField({ label: '', type: 'text', required: true, selectedCategoryNames: ['all'] });
                        setIsCategoryPanelExpanded(false);
                        setFieldDrawerOpen(true);
                      }}
                      className="h-28 border-2 border-dashed border-gray-200 text-gray-500 font-semibold rounded-2xl hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> Add New Form Field
                    </button>
                  </div>
                </div>
              )}

              {/* USERS & PERMISSIONS TAB */}
              {activeTab === 'users' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">System Users & Tab Access Permissions</h2>
                    <button 
                      onClick={() => setAdminModalOpen(true)} 
                      className="px-3.5 py-2 bg-[#2B2B2B] text-white rounded-xl hover:bg-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add New User
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {adminsList.map((admin) => {
                      const isShowingPass = showPasscodes[admin.id];
                      const userAllowedTabs = admin.allowed_tabs || ['/', '/entrepreneurs', '/cs-forms', '/settings'];

                      return (
                        <div key={admin.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between gap-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 font-bold">
                                <ShieldCheck className="w-5 h-5 text-gray-800" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 text-base">{admin.name}</h3>
                                <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                  System User
                                </span>
                              </div>
                            </div>

                            {adminsList.length > 1 && (
                              <button 
                                onClick={() => confirmDeleteAdmin(admin.id, admin.name)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <KeyRound className="w-4 h-4 text-gray-400" />
                              <span className="text-xs font-semibold text-gray-500">Passcode:</span>
                              <span className="text-xs font-bold text-gray-900 font-mono">
                                {isShowingPass ? admin.passcode : "••••••••"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowPasscodes(prev => ({ ...prev, [admin.id]: !prev[admin.id] }))}
                              className="p-1 text-gray-400 hover:text-gray-900 rounded transition-colors"
                              title={isShowingPass ? "Hide Passcode" : "Show Passcode"}
                            >
                              {isShowingPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Granted Access Badges */}
                          <div className="pt-2 border-t border-gray-50 flex items-start justify-between gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mt-0.5">Access:</span>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {userAllowedTabs.map(tabId => {
                                const tabInfo = AVAILABLE_TABS.find(t => t.id === tabId);
                                return (
                                  <span key={tabId} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                    {tabInfo?.label || tabId}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button 
                      onClick={() => setAdminModalOpen(true)}
                      className="h-40 border-2 border-dashed border-gray-200 text-gray-500 font-semibold rounded-2xl hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> Add New User
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-8 py-4 flex items-center justify-around z-40 shadow-lg">
          <Link href="/" className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-900">
            <Home className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/entrepreneurs" className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-900">
            <Users className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Entrepreneurs</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center justify-center text-gray-900">
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Settings</span>
          </Link>
        </nav>
      </div>

      {/* --- MODALS / DRAWERS --- */}

      {/* 1. Add / Edit Category Drawer/Modal */}
      {catDrawer.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setCatDrawer(prev => ({ ...prev, isOpen: false }))}
          />
          <div className="relative w-full max-w-md md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl z-10 p-6">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 md:hidden" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {catDrawer.mode === 'edit' 
                  ? "Edit Category" 
                  : catDrawer.type === 'main' 
                  ? "Add Main Category" 
                  : `Add Sub Category to "${catDrawer.parentName}"`}
              </h3>
              <button 
                onClick={() => setCatDrawer(prev => ({ ...prev, isOpen: false }))}
                className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Category Name</label>
                <input 
                  autoFocus
                  type="text" 
                  placeholder={catDrawer.type === 'main' ? "e.g. Technology" : "e.g. Software"}
                  value={catNameInput}
                  onChange={e => setCatNameInput(e.target.value)}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSavingCat}
                className="w-full py-4 bg-[#2B2B2B] text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingCat && <Loader2 className="w-5 h-5 animate-spin" />}
                {isSavingCat ? 'Saving...' : catDrawer.mode === 'edit' ? 'Update Category' : 'Save Category'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Form Field Drawer/Modal */}
      {fieldDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => { setFieldDrawerOpen(false); setIsCategoryPanelExpanded(false); }}
          />
          <div className={`relative w-full bg-white rounded-t-3xl md:rounded-3xl shadow-2xl z-10 p-6 overflow-y-auto max-h-[90vh] transition-all duration-300 ease-out ${
            isCategoryPanelExpanded ? 'max-w-md md:max-w-3xl' : 'max-w-md md:max-w-lg'
          }`}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 md:hidden" />
            
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Add New Form Field</h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryPanelExpanded(!isCategoryPanelExpanded)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    isCategoryPanelExpanded || (!newField.selectedCategoryNames.includes('all') && newField.selectedCategoryNames.length > 0)
                      ? 'bg-[#2B2B2B] text-white border-[#2B2B2B] shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>For Category</span>
                  {!newField.selectedCategoryNames.includes('all') && newField.selectedCategoryNames.length > 0 && (
                    <span className="bg-white text-black text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {newField.selectedCategoryNames.length}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => { setFieldDrawerOpen(false); setIsCategoryPanelExpanded(false); }}
                  className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Grid Content */}
            <div className={`grid grid-cols-1 ${isCategoryPanelExpanded ? 'md:grid-cols-2 gap-6' : ''}`}>
              
              {/* Left Pane: Form Inputs */}
              <form onSubmit={handleSaveField} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Field Label</label>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="e.g. Website URL"
                    value={newField.label}
                    onChange={e => setNewField({...newField, label: e.target.value})}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Input Type</label>
                    <button 
                      type="button"
                      onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                      className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 flex justify-between items-center relative z-20"
                    >
                      <span>{FIELD_TYPES.find(t => t.value === newField.type)?.label || 'Select Type'}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isTypeDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                        {FIELD_TYPES.map(type => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => {
                              setNewField({ ...newField, type: type.value });
                              setIsTypeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors ${
                              newField.type === type.value ? 'bg-gray-100 font-bold text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Requirement</label>
                    <button
                      type="button"
                      onClick={() => setNewField({ ...newField, required: !newField.required })}
                      className={`w-full mt-1 h-[48px] px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                        newField.required
                          ? "bg-[#2B2B2B] text-white border-[#2B2B2B] shadow-sm"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${newField.required ? "bg-green-400" : "bg-gray-300"}`} />
                      <span>{newField.required ? "Required" : "Optional"}</span>
                    </button>
                  </div>
                </div>

                {/* Category Scope Summary Box */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Categories</span>
                    <button
                      type="button"
                      onClick={() => setIsCategoryPanelExpanded(!isCategoryPanelExpanded)}
                      className="text-xs font-bold text-[#2B2B2B] hover:underline"
                    >
                      {isCategoryPanelExpanded ? 'Hide Panel' : '+ Select Categories'}
                    </button>
                  </div>

                  {newField.selectedCategoryNames.includes('all') || newField.selectedCategoryNames.length === 0 ? (
                    <p className="text-xs text-gray-600 font-medium">
                      Show for All Categories
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {newField.selectedCategoryNames.map(name => (
                        <span key={name} className="bg-[#2B2B2B] text-white text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 shadow-sm">
                          <span>{name}</span>
                          <X 
                            className="w-3 h-3 hover:text-red-300 transition-colors cursor-pointer" 
                            onClick={() => removeCategorySelection(name)} 
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={isSavingField}
                  className="w-full py-4 bg-[#2B2B2B] text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {isSavingField && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isSavingField ? 'Saving...' : 'Save Field'}
                </button>
              </form>

              {/* Right Pane: Category Picker Side-Panel */}
              {isCategoryPanelExpanded && (
                <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Select Category Scope</h4>
                      <p className="text-[11px] text-gray-400">Choose categories to attach this field to</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCategorySelection('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                        newField.selectedCategoryNames.includes('all')
                          ? 'bg-[#2B2B2B] text-white border-[#2B2B2B]'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      All Categories
                    </button>
                  </div>

                  <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-3 space-y-2 max-h-[350px] overflow-y-auto no-scrollbar">
                    {categories.filter(c => c.type === 'main').map(mainCat => {
                      const subCats = categories.filter(c => c.parent_id === mainCat.id);
                      const isMainSelected = newField.selectedCategoryNames.includes(mainCat.name);
                      const isExpanded = expandedCatIdsInPicker.includes(mainCat.id);

                      return (
                        <div key={mainCat.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                          <div className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                              <input 
                                type="checkbox"
                                checked={isMainSelected}
                                onChange={() => toggleCategorySelection(mainCat.name)}
                                className="w-4 h-4 rounded text-[#2B2B2B] focus:ring-gray-900 border-gray-300 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-gray-900 truncate">{mainCat.name}</span>
                            </label>

                            {subCats.length > 0 && (
                              <button
                                type="button"
                                onClick={() => togglePickerCategoryExpand(mainCat.id)}
                                className="p-1 text-gray-400 hover:text-gray-900 rounded-md transition-colors"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>

                          {isExpanded && subCats.length > 0 && (
                            <div className="bg-gray-50 p-2.5 border-t border-gray-100 space-y-1.5 pl-6 animate-in fade-in duration-150">
                              {subCats.map(subCat => {
                                const isSubSelected = newField.selectedCategoryNames.includes(subCat.name);
                                return (
                                  <label key={subCat.id} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                    <input 
                                      type="checkbox"
                                      checked={isSubSelected}
                                      onChange={() => toggleCategorySelection(subCat.name)}
                                      className="w-3.5 h-3.5 rounded text-[#2B2B2B] focus:ring-gray-900 border-gray-300 cursor-pointer"
                                    />
                                    <span className="text-xs font-medium text-gray-700 truncate">{subCat.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Add User Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setAdminModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add New System User</h3>
              <button 
                onClick={() => setAdminModalOpen(false)}
                className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">User Name</label>
                <div className="relative mt-1">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="e.g. Shanika"
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Passcode</label>
                <div className="relative mt-1">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="password" 
                    placeholder="Enter Passcode (e.g. 73332210)"
                    value={newAdminPasscode}
                    onChange={e => setNewAdminPasscode(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Allowed Tabs Selection (Permissions) */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">
                  Allowed Tabs (Page Permissions)
                </label>
                <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  {AVAILABLE_TABS.map(tab => {
                    const isChecked = newAdminAllowedTabs.includes(tab.id);
                    return (
                      <label key={tab.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setNewAdminAllowedTabs(newAdminAllowedTabs.filter(t => t !== tab.id));
                            } else {
                              setNewAdminAllowedTabs([...newAdminAllowedTabs, tab.id]);
                            }
                          }}
                          className="w-4 h-4 rounded text-gray-900 border-gray-300 focus:ring-gray-900"
                        />
                        <span className="text-xs font-semibold text-gray-800">
                          {tab.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSavingAdmin}
                className="w-full py-4 bg-[#2B2B2B] text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {isSavingAdmin && <Loader2 className="w-5 h-5 animate-spin" />}
                {isSavingAdmin ? 'Saving...' : 'Save User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl z-10 p-6">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{confirmModal.message}</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md"
              >
                Delete
              </button>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
