"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, AlertTriangle, Send } from "lucide-react";

type OptionItem = {
  label: string;
  has_input?: boolean;
};

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
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

function PublicFormContent() {
  const searchParams = useSearchParams();
  const mainCategory = searchParams.get("main_category");
  const subCategory = searchParams.get("sub_category");

  const [isLoading, setIsLoading] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  
  // Base details
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  
  // Dynamic data
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!mainCategory) {
      setIsLoading(false);
      return;
    }
    fetchFields();
  }, [mainCategory]);

  const fetchFields = async () => {
    try {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;

      if (data) {
        // Filter fields that apply to this category
        const filteredFields = data.filter(field => {
          if (!field.category_name) return true; // All categories
          
          const targetCats = field.category_name.split(',').map((s: string) => s.trim());
          if (targetCats.includes('all')) return true;
          
          return targetCats.includes(mainCategory as string) || (subCategory && targetCats.includes(subCategory));
        });

        setFields(filteredFields);
      }
    } catch (err) {
      console.error("Error fetching form fields:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDynamicChange = (label: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [label]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please provide your full name.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.from('entrepreneurs').insert([{
        name: name.trim(),
        age: age.trim() || null,
        main_category: mainCategory,
        sub_category: subCategory || null,
        status: 'Pending', // <--- Key for review workflow
        dynamic_data: formData
      }]);

      if (error) throw error;

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg("Failed to submit your application: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (!mainCategory) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Form Link</h2>
          <p className="text-gray-500 text-sm">
            This registration link is missing category information. Please request a valid link from the administrator.
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-6 font-poppins relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
        
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center border border-gray-100 relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Application Submitted!</h2>
          <p className="text-gray-500 font-medium mb-8">
            Thank you for registering. Your details have been securely submitted to the ISDOM and are currently pending review by an administrator.
          </p>
          
          <div className="bg-gray-50 rounded-2xl p-4 text-left mb-8 border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Submitted By</p>
            <p className="text-sm font-semibold text-gray-900 mb-3">{name}</p>
            
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Category</p>
            <p className="text-sm font-semibold text-gray-900">{mainCategory} {subCategory && `> ${subCategory}`}</p>
          </div>

          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
            Industry Sector - DS Office Maho
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] py-12 px-4 sm:px-6 font-poppins relative">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none fixed" />
      
      <div className="max-w-3xl mx-auto relative z-10">
        
        {/* Header / Branding */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tighter mb-4">
            ISDOM Registration
          </h1>
          <div className="inline-flex flex-col items-center justify-center">
            <span className="bg-[#2B2B2B] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm uppercase tracking-wider mb-2">
              {mainCategory}
            </span>
            {subCategory && (
              <span className="text-sm font-semibold text-gray-500">
                Sub Category: {subCategory}
              </span>
            )}
          </div>
        </div>

        {/* The Form */}
        <div className="bg-transparent sm:bg-white sm:rounded-3xl sm:shadow-xl sm:border sm:border-gray-100 overflow-hidden">
          <div className="p-0 sm:p-10">
            
            {errorMsg && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-600 text-center flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5" /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Details Section */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                  Basic Details
                </h3>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">
                    Full Name / Enterprise Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">
                    Age / Years in Operation
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Dynamic Details Section */}
              {fields.length > 0 && (
                <div className="space-y-5 pt-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                    Additional Information
                  </h3>

                  {fields.map((field) => (
                    <div key={field.id}>
                      <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          required={field.required}
                          value={formData[field.label] || ''}
                          onChange={(e) => handleDynamicChange(field.label, e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all font-medium min-h-[120px] resize-y"
                        />
                      ) : field.type === 'select' ? (
                        (() => {
                          const optionsList: OptionItem[] = parseFieldOptions(field.options);
                          const rawVal = formData[field.label];

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
                              setFormData(prev => {
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
                              setFormData(prev => {
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
                                      className={`p-3 rounded-xl border transition-all ${
                                        isChecked 
                                          ? 'bg-white border-[#2B2B2B] shadow-sm' 
                                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                      }`}
                                    >
                                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
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
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 font-medium"
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
                                required={field.required}
                                value={selectedChoice}
                                onChange={(e) => {
                                  const choice = e.target.value;
                                  const optObj = optionsList.find(o => o.label === choice);
                                  if (optObj?.has_input && textAnswer) {
                                    handleDynamicChange(field.label, `${choice}: ${textAnswer}`);
                                  } else {
                                    handleDynamicChange(field.label, choice);
                                  }
                                }}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all font-medium text-gray-900 cursor-pointer"
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
                                      handleDynamicChange(field.label, txt ? `${selectedChoice}: ${txt}` : selectedChoice);
                                    }}
                                    required={field.required}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-medium text-gray-900 shadow-xs"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : field.type === 'file' ? (
                        <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors cursor-pointer">
                          <input
                            type="file"
                            required={field.required}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDynamicChange(field.label, file.name);
                            }}
                            className="hidden"
                            id={`file-${field.id}`}
                          />
                          <label htmlFor={`file-${field.id}`} className="cursor-pointer flex flex-col items-center">
                            <span className="text-sm font-semibold text-gray-600">
                              {formData[field.label] ? `Selected: ${formData[field.label]}` : "Click to upload file"}
                            </span>
                          </label>
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          required={field.required}
                          value={formData[field.label] || ''}
                          onChange={(e) => handleDynamicChange(field.label, e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all font-medium"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#2B2B2B] text-white font-bold text-lg rounded-xl hover:bg-black transition-all shadow-xl disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Submit Application <Send className="w-5 h-5" />
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-gray-400 font-semibold mt-4 uppercase tracking-wider">
                  Secure Submission to ISDOM Database
                </p>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicFormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    }>
      <PublicFormContent />
    </Suspense>
  );
}
