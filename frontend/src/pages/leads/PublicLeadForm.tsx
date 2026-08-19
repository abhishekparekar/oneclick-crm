import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  User, Phone, Mail, Building2, Calendar, FileText,
  CheckCircle2, AlertCircle, Loader2, Sparkles, Send, ArrowRight
} from 'lucide-react';

interface FormConfig {
  organizationName: string;
  logoUrl?: string;
  statuses: { id: string; name: string; color: string; isDefault: boolean }[];
  sources: string[];
}

export default function PublicLeadForm() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    whatsappPhone: '',
    phone: '',
    email: '',
    statusId: '',
    source: '',
    dateOfBirth: '',
    anniversaryDate: '',
    productService: '',
    notes: '',
    whatsappOptIn: true,
  });

  const apiBaseUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${apiBaseUrl}/api/public/leads/form/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Public lead form link is invalid or expired.');
        }
        return res.json();
      })
      .then((data: FormConfig) => {
        setConfig(data);
        const defaultStatus = data.statuses.find(s => s.isDefault) || data.statuses[0];
        const defaultSource = data.sources[0] || 'Public Form';
        setFormData(prev => ({
          ...prev,
          statusId: defaultStatus?.id || '',
          source: defaultSource,
        }));
      })
      .catch((err: any) => {
        setFetchError(err.message || 'Failed to load lead form.');
      })
      .finally(() => setLoading(false));
  }, [token, apiBaseUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload: any = {
        name: formData.name.trim(),
        whatsappPhone: formData.whatsappPhone.trim(),
        whatsappOptIn: formData.whatsappOptIn,
      };

      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.statusId) payload.statusId = formData.statusId;
      if (formData.source) payload.source = formData.source;
      if (formData.dateOfBirth) payload.dateOfBirth = new Date(formData.dateOfBirth).toISOString();
      if (formData.anniversaryDate) payload.anniversaryDate = new Date(formData.anniversaryDate).toISOString();
      if (formData.productService.trim()) payload.productService = formData.productService.trim();
      if (formData.notes.trim()) payload.notes = formData.notes.trim();

      const res = await fetch(`${apiBaseUrl}/api/public/leads/form/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.message || 'Failed to submit lead details.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmitError(null);
    const defaultStatus = config?.statuses.find(s => s.isDefault) || config?.statuses[0];
    const defaultSource = config?.sources[0] || 'Public Form';
    setFormData({
      name: '',
      whatsappPhone: '',
      phone: '',
      email: '',
      statusId: defaultStatus?.id || '',
      source: defaultSource,
      dateOfBirth: '',
      anniversaryDate: '',
      productService: '',
      notes: '',
      whatsappOptIn: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#0E6B50]" />
          <p className="text-sm font-medium text-slate-500">Loading form details...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Form Unavailable</h2>
          <p className="text-sm text-slate-600 mb-6">{fetchError || 'This public form link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between py-6 sm:py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      {/* Top Banner */}
      <div className="max-w-xl mx-auto w-full mb-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[#0E6B50] text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Easy Connect Form</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {config.organizationName}
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
          Please fill out this form to help us serve you better.
        </p>
      </div>

      {/* Main Form Container */}
      <div className="max-w-xl mx-auto w-full">
        {submitted ? (
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center shadow-xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Thank You!</h2>
            <p className="text-slate-600 text-sm max-w-sm mx-auto mb-6">
              Your details have been submitted successfully. Our team will get back to you shortly.
            </p>
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0E6B50] hover:bg-[#0B5842] text-white font-semibold text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
            >
              Submit Another Response
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl shadow-slate-200/50 space-y-4"
          >
            {submitError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700">Submission Failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            {/* Row 1: Full Name * & WhatsApp Number * */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#111827] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0E6B50] focus:ring-2 focus:ring-[#0E6B50]/15 transition-all min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#111827] mb-1">
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  name="whatsappPhone"
                  required
                  placeholder="Enter WhatsApp Number"
                  value={formData.whatsappPhone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0E6B50] focus:ring-2 focus:ring-[#0E6B50]/15 transition-all min-h-[44px]"
                />
              </div>
            </div>

            {/* Row 2: Secondary Phone & Email Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#111827] mb-1">
                  Secondary Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Optional"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0E6B50] focus:ring-2 focus:ring-[#0E6B50]/15 transition-all min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#111827] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0E6B50] focus:ring-2 focus:ring-[#0E6B50]/15 transition-all min-h-[44px]"
                />
              </div>
            </div>

            {/* Row 3: Status & Lead Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {config.statuses.length > 0 && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[#111827] mb-1">
                    Status
                  </label>
                  <select
                    name="statusId"
                    value={formData.statusId}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 focus:outline-none focus:border-[#0E6B50] focus:ring-2 focus:ring-[#0E6B50]/15 transition-all min-h-[44px]"
                  >
                    {config.statuses.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {config.sources.length > 0 && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[#111827] mb-1">
                    Lead Source
                  </label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 focus:outline-none focus:border-[#0E6B50] focus:ring-2 focus:ring-[#0E6B50]/15 transition-all min-h-[44px]"
                  >
                    {config.sources.map(src => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Row 4: Birthday & Anniversary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#111827] mb-1">
                  Birthday
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 focus:outline-none focus:border-[#0E6B50] focus:ring-2 focus:ring-[#0E6B50]/15 transition-all min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#111827] mb-1">
                  Anniversary
                </label>
                <input
                  type="date"
                  name="anniversaryDate"
                  value={formData.anniversaryDate}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 focus:outline-none focus:border-[#0E6B50] focus:ring-2 focus:ring-[#0E6B50]/15 transition-all min-h-[44px]"
                />
              </div>
            </div>

            {/* Row 5: Product / Service Interest */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#111827] mb-1">
                Product / Service Interest
              </label>
              <input
                type="text"
                name="productService"
                placeholder="e.g. 2BHK Apartment"
                value={formData.productService}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0E6B50] focus:ring-2 focus:ring-[#0E6B50]/15 transition-all min-h-[44px]"
              />
            </div>

            {/* Row 6: Initial Note */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#111827] mb-1">
                Initial Note
              </label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Any notes about this lead..."
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0E6B50] focus:ring-2 focus:ring-[#0E6B50]/15 transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-xl bg-[#0E6B50] hover:bg-[#0B5842] text-white font-bold text-base transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Saving Data...
                  </>
                ) : (
                  <>
                    <Send className="w-4.5 h-4.5" /> Submit
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        Powered by <span className="font-semibold text-slate-600">Easy Connect</span> • Lead Management System
      </footer>
    </div>
  );
}

