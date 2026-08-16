"use client";
import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Loader2, Link2, Clock, CheckCircle2, XCircle, Search, Eye, Trash2, Plus, X, SlidersHorizontal } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import { supabase } from "@/lib/supabase";
import { getAdminSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  type: 'main' | 'sub';
  parent_id: string | null;
};

type Entrepreneur = {
  id: string;
  name: string;
  age: string;
  main_category: string;
  sub_category: string;
  status: string;
  dynamic_data: Record<string, any>;
  created_at: string;
};

type SavedFormLink = {
  id: string;
  mainCategory: string;
  subCategory?: string;
  url: string;
  createdAt: string;
};

export default function CSFormsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'links' | 'pending'>('links');
  const [isLoading, setIsLoading] = useState(true);
  
  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);

  // Generated/Saved links list
  const [savedLinks, setSavedLinks] = useState<SavedFormLink[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMainCat, setSelectedMainCat] = useState("");
  const [selectedSubCat, setSelectedSubCat] = useState("");
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Tab 2 State: Pending Submissions
  const [pendingSubmissions, setPendingSubmissions] = useState<Entrepreneur[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<Entrepreneur | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter Drawer State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filterFormLinkId, setFilterFormLinkId] = useState("");
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      router.push("/login");
      return;
    }
    fetchData();
    loadSavedLinks();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Categories
      const { data: catsData } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      if (catsData) setCategories(catsData);

      // Fetch Pending Submissions
      const { data: pendingData } = await supabase
        .from('entrepreneurs')
        .select('*')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });
      if (pendingData) setPendingSubmissions(pendingData);

    } catch (err) {
      console.error("Error fetching CS Forms data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedLinks = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("edb_generated_form_links");
      if (stored) {
        try {
          setSavedLinks(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const saveFormLinksToStorage = (links: SavedFormLink[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("edb_generated_form_links", JSON.stringify(links));
    }
  };

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMainCat) return;

    let url = `${window.location.origin}/form?main_category=${encodeURIComponent(selectedMainCat)}`;
    if (selectedSubCat) {
      url += `&sub_category=${encodeURIComponent(selectedSubCat)}`;
    }

    const newLink: SavedFormLink = {
      id: Date.now().toString(),
      mainCategory: selectedMainCat,
      subCategory: selectedSubCat || undefined,
      url,
      createdAt: new Date().toISOString(),
    };

    const updated = [newLink, ...savedLinks];
    setSavedLinks(updated);
    saveFormLinksToStorage(updated);

    // Auto copy the generated link
    navigator.clipboard.writeText(url);
    setCopiedLinkId(newLink.id);
    setTimeout(() => setCopiedLinkId(null), 2000);

    // Reset and close
    setSelectedMainCat("");
    setSelectedSubCat("");
    setIsCreateModalOpen(false);
  };

  const handleDeleteLink = (id: string) => {
    if (!confirm("Are you sure you want to delete this shareable link?")) return;
    const updated = savedLinks.filter(l => l.id !== id);
    setSavedLinks(updated);
    saveFormLinksToStorage(updated);
  };

  const handleCopyExistingLink = (linkObj: SavedFormLink) => {
    navigator.clipboard.writeText(linkObj.url);
    setCopiedLinkId(linkObj.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('entrepreneurs')
        .update({ status: 'Active' })
        .eq('id', id);

      if (error) throw error;

      setPendingSubmissions(prev => prev.filter(s => s.id !== id));
      setSelectedSubmission(null);
    } catch (err: any) {
      alert("Failed to approve: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject and delete this submission?")) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('entrepreneurs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPendingSubmissions(prev => prev.filter(s => s.id !== id));
      setSelectedSubmission(null);
    } catch (err: any) {
      alert("Failed to reject: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetFilters = () => {
    setFilterFormLinkId("");
    setFilterDateRange("all");
    setFilterStartDate("");
    setFilterEndDate("");
    setIsFilterDrawerOpen(false);
  };

  const isFilterActive = !!filterFormLinkId || filterDateRange !== "all";

  const filteredPending = pendingSubmissions.filter(sub => {
    // 1. Search filter
    const matchesSearch = 
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.main_category.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Link filter
    let matchesLink = true;
    if (filterFormLinkId) {
      const selectedLink = savedLinks.find(l => l.id === filterFormLinkId);
      if (selectedLink) {
        const matchesMain = sub.main_category.toLowerCase() === selectedLink.mainCategory.toLowerCase();
        const matchesSub = selectedLink.subCategory
          ? sub.sub_category && sub.sub_category.toLowerCase() === selectedLink.subCategory.toLowerCase()
          : !sub.sub_category;
        matchesLink = !!(matchesMain && matchesSub);
      }
    }

    // 3. Date filter
    let matchesDate = true;
    const createdAt = new Date(sub.created_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterDateRange === 'today') {
      matchesDate = createdAt >= today;
    } else if (filterDateRange === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      matchesDate = createdAt >= sevenDaysAgo;
    } else if (filterDateRange === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesDate = createdAt >= thirtyDaysAgo;
    } else if (filterDateRange === 'custom') {
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && createdAt >= start;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && createdAt <= end;
      }
    }

    return matchesSearch && matchesLink && matchesDate;
  });

  const mainCategories = categories.filter(c => c.type === 'main');
  const subCategories = selectedMainCat 
    ? categories.filter(c => c.type === 'sub' && c.parent_id === categories.find(mc => mc.name === selectedMainCat)?.id)
    : [];

  // Live URL preview for the modal
  let livePreviewUrl = "";
  if (typeof window !== "undefined" && selectedMainCat) {
    livePreviewUrl = `${window.location.origin}/form?main_category=${encodeURIComponent(selectedMainCat)}`;
    if (selectedSubCat) livePreviewUrl += `&sub_category=${encodeURIComponent(selectedSubCat)}`;
  }

  return (
    <div className="flex min-h-screen bg-[#FDFDFD] text-[#2B2B2B] font-poppins relative">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <DesktopHeader 
          title="CS Forms" 
          subtitle="Manage public registration forms & review pending submissions" 
          showNewButton={true}
          newButtonText="Create Link"
          onOpenNewModal={() => setIsCreateModalOpen(true)}
          showSearch={false}
        />

        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between p-6 bg-white border-b border-gray-100">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">CS Forms</h1>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Manage public registration links</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="p-2.5 bg-[#2B2B2B] text-white rounded-xl hover:bg-black transition-all flex items-center justify-center shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-32 md:pb-12">
          {/* Tabs */}
          <div className="flex items-center justify-between gap-4 mb-8 overflow-x-auto no-scrollbar">
            <div className="flex w-full md:w-auto bg-gray-100 rounded-xl p-1 gap-1">
              <button 
                onClick={() => setActiveTab('links')}
                className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all shrink-0 flex items-center gap-2 ${
                  activeTab === 'links' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Link2 className="w-4 h-4" /> Form Links
              </button>
              <button 
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all shrink-0 flex items-center gap-2 ${
                  activeTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Clock className="w-4 h-4" /> Pending Submissions
                {pendingSubmissions.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold">
                    {pendingSubmissions.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
            </div>
          ) : (
            <>
              {/* TAB 1: Form Links list */}
              {activeTab === 'links' && (
                <div className="animate-in fade-in duration-300 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Registration Links</h2>
                  </div>

                  {savedLinks.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center max-w-xl">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Link2 className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">No Shareable Links Yet</h3>
                      <p className="text-gray-500 text-sm mb-6">Create a link for any main or subcategory to share with applicants.</p>
                      <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="py-2.5 px-5 bg-[#2B2B2B] text-white text-sm font-bold rounded-xl hover:bg-black transition-colors inline-flex items-center gap-2 shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Create Shareable Link
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {savedLinks.map(link => {
                        const isCopied = copiedLinkId === link.id;
                        return (
                          <div key={link.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between gap-4 hover:border-gray-200 transition-all">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 truncate max-w-full">
                                  {link.mainCategory}
                                </span>
                                <button
                                  onClick={() => handleDeleteLink(link.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                  title="Delete Link"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {link.subCategory && (
                                <p className="text-xs text-gray-500 font-semibold mb-1">
                                  Sub-category: <span className="text-gray-800">{link.subCategory}</span>
                                </p>
                              )}
                              
                              <p className="text-[11px] font-mono bg-gray-50 border border-gray-100 rounded-xl p-3 text-gray-500 truncate mt-3 select-all">
                                {link.url}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-gray-50">
                              <button
                                onClick={() => handleCopyExistingLink(link)}
                                className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border ${
                                  isCopied 
                                    ? "bg-green-500 text-white border-green-500" 
                                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-100"
                                }`}
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                                {isCopied ? "Copied!" : "Copy Link"}
                              </button>
                              
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2.5 bg-[#2B2B2B] text-white hover:bg-black rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Test Link
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Pending Submissions */}
              {activeTab === 'pending' && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Awaiting Review</h2>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-72">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="Search submissions..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      
                      {isFilterActive && (
                        <button
                          onClick={handleResetFilters}
                          className="px-3 py-2.5 rounded-xl border border-red-100 bg-red-50 text-red-600 text-xs font-bold transition-all flex items-center gap-1.5 hover:bg-red-100 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" /> Clear
                        </button>
                      )}

                      <button
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                          isFilterActive
                            ? 'bg-[#2B2B2B] text-white border-[#2B2B2B] shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Filter</span>
                        {isFilterActive && (
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        )}
                      </button>
                    </div>
                  </div>

                  {filteredPending.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {isFilterActive ? "No matching results" : "All Caught Up!"}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {isFilterActive 
                          ? "Try modifying your active filters or clear them to view all submissions."
                          : "There are no pending form submissions awaiting your review."}
                      </p>
                      {isFilterActive && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded-lg text-gray-700 transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredPending.map(sub => (
                        <div key={sub.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between gap-4 hover:border-gray-200 transition-colors">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> PENDING REVIEW
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {new Date(sub.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{sub.name}</h3>
                            <p className="text-xs font-semibold text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded-md mb-2 truncate max-w-full">
                              {sub.main_category}
                            </p>
                            {sub.sub_category && (
                              <p className="text-xs text-gray-500 truncate mb-2">Sub: {sub.sub_category}</p>
                            )}
                          </div>

                          <div className="pt-3 border-t border-gray-50">
                            <button 
                              onClick={() => setSelectedSubmission(sub)}
                              className="w-full py-2.5 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 border border-gray-100"
                            >
                              <Eye className="w-4 h-4" /> Review Submission
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* --- DRAWERS / MODALS --- */}

      {/* 1. Create Shareable Link Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl z-10 p-6 animate-in fade-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between mb-5 border-b border-gray-50 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Create Shareable Link</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLink} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Main Category <span className="text-red-500">*</span></label>
                <select
                  value={selectedMainCat}
                  onChange={(e) => {
                    setSelectedMainCat(e.target.value);
                    setSelectedSubCat("");
                  }}
                  required
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-medium"
                >
                  <option value="">-- Select Main Category --</option>
                  {mainCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Sub Category (Optional)</label>
                <select
                  value={selectedSubCat}
                  onChange={(e) => setSelectedSubCat(e.target.value)}
                  disabled={!selectedMainCat || subCategories.length === 0}
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-medium disabled:opacity-50"
                >
                  <option value="">-- All Sub Categories --</option>
                  {subCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {livePreviewUrl && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 animate-in fade-in duration-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Generated Link Preview</span>
                  <p className="text-xs font-mono text-gray-600 truncate">{livePreviewUrl}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={!selectedMainCat}
                className="w-full py-4 bg-[#2B2B2B] text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <Check className="w-5 h-5 text-green-400" /> Save & Copy Link
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Submission Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => !isProcessing && setSelectedSubmission(null)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                    PENDING REVIEW
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    Submitted: {new Date(selectedSubmission.created_at).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Review Form Submission</h3>
              </div>
              <button 
                onClick={() => setSelectedSubmission(null)}
                disabled={isProcessing}
                className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 disabled:opacity-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Applicant Name</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedSubmission.name}</p>
                  </div>
                  {selectedSubmission.age && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Age</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedSubmission.age}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Main Category</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedSubmission.main_category}</p>
                  </div>
                  {selectedSubmission.sub_category && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sub Category</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedSubmission.sub_category}</p>
                    </div>
                  )}
                </div>

                {selectedSubmission.dynamic_data && Object.keys(selectedSubmission.dynamic_data).length > 0 && (
                  <div className="pt-6 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Additional Details</h4>
                    <div className="space-y-4">
                      {Object.entries(selectedSubmission.dynamic_data).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{key}</p>
                          {value ? (
                            <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100">{value}</p>
                          ) : (
                            <p className="text-sm italic text-gray-400">- Not provided -</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer (Actions) */}
            <div className="p-6 border-t border-gray-100 bg-white grid grid-cols-2 gap-4">
              <button
                onClick={() => handleReject(selectedSubmission.id)}
                disabled={isProcessing}
                className="py-3.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-100 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                Reject & Delete
              </button>
              <button
                onClick={() => handleApprove(selectedSubmission.id)}
                disabled={isProcessing}
                className="py-3.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Approve (Publish)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filter Sidebar Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-sm bg-white shadow-2xl z-10 flex flex-col h-full p-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Filter Submissions</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Refine queue by link or submission date</p>
              </div>
              <button 
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Form Content */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* 1. Filter by Form Link */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Filter by Form Link
                </label>
                <select
                  value={filterFormLinkId}
                  onChange={(e) => setFilterFormLinkId(e.target.value)}
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-medium text-gray-800"
                >
                  <option value="">All Form Links</option>
                  {savedLinks.map(link => (
                    <option key={link.id} value={link.id}>
                      {link.mainCategory} {link.subCategory ? `> ${link.subCategory}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Filter by Date Range Preset */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Submission Date
                </label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: '7days', label: 'Last 7 Days' },
                    { id: '30days', label: 'Last 30 Days' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setFilterDateRange(preset.id as any)}
                      className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                        filterDateRange === preset.id
                          ? 'bg-[#2B2B2B] text-white border-[#2B2B2B] shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Picker Fields */}
                {filterDateRange === 'custom' && (
                  <div className="space-y-3.5 bg-gray-50 p-4 rounded-xl border border-gray-100 animate-in fade-in duration-200">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">End Date</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="py-3.5 bg-[#2B2B2B] hover:bg-black text-white font-bold rounded-xl text-xs transition-colors shadow-md text-center"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
