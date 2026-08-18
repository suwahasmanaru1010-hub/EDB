"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, AlertTriangle, Send } from "lucide-react";

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  category_name?: string | null;
  options?: string[] | string | null;
  is_multiple?: boolean | null;
};

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
                          let optionsList: string[] = [];
                          if (Array.isArray(field.options)) {
                            optionsList = field.options;
                          } else if (typeof field.options === 'string') {
                            try {
                              const parsed = JSON.parse(field.options);
                              if (Array.isArray(parsed)) optionsList = parsed;
                              else optionsList = field.options.split(',').map((s: string) => s.trim()).filter(Boolean);
                            } catch {
                              optionsList = field.options.split(',').map((s: string) => s.trim()).filter(Boolean);
                            }
                          }

                          if (field.is_multiple) {
                            const currentSelected: string[] = formData[field.label] 
                              ? (Array.isArray(formData[field.label]) ? formData[field.label] : String(formData[field.label]).split(',').map((s: string) => s.trim()).filter(Boolean))
                              : [];

                            const toggleOption = (opt: string) => {
                              const updated = currentSelected.includes(opt)
                                ? currentSelected.filter((item: string) => item !== opt)
                                : [...currentSelected, opt];
                              handleDynamicChange(field.label, updated.join(', '));
                            };

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200">
                                {optionsList.map((opt, idx) => {
                                  const isChecked = currentSelected.includes(opt);
                                  return (
                                    <label 
                                      key={idx} 
                                      onClick={() => toggleOption(opt)}
                                      className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                        isChecked 
                                          ? 'bg-[#2B2B2B] text-white border-[#2B2B2B] shadow-sm font-semibold' 
                                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                      }`}
                                    >
                                      <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}}
                                        className="w-4 h-4 rounded text-black focus:ring-black border-gray-300 pointer-events-none"
                                      />
                                      <span className="text-xs">{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            );
                          }

                          return (
                            <select
                              required={field.required}
                              value={formData[field.label] || ''}
                              onChange={(e) => handleDynamicChange(field.label, e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all font-medium text-gray-900 cursor-pointer"
                            >
                              <option value="">-- Select {field.label} --</option>
                              {optionsList.map((opt, idx) => (
                                <option key={idx} value={opt}>{opt}</option>
                              ))}
                            </select>
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
