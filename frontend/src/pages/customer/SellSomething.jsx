import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Store, Leaf, Wrench, Tag, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api, { formatApiError } from '@/utils/api';

const TYPES = [
  { value: 'store', label: 'List My Store', desc: 'Register your shop/business on NAMCOS', icon: Store, color: '#0F4C3A' },
  { value: 'agriculture', label: 'Sell Agriculture', desc: 'Fresh produce, crops, dairy', icon: Leaf, color: '#16A34A' },
  { value: 'service', label: 'Offer a Service', desc: 'Electrician, plumber, cleaning, etc.', icon: Wrench, color: '#2563EB' },
  { value: 'classified', label: 'Post a Classified', desc: 'Buy/sell used items', icon: Tag, color: '#7C3AED' },
];

export default function SellSomething() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mb-5">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Submitted Successfully!</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-xs">
          Your listing has been submitted for review. Our team will verify and publish it within 24–48 hours.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 w-full max-w-xs">
          <p className="text-xs text-amber-700">You'll get notified once your listing is approved or if more information is needed.</p>
        </div>
        <Button onClick={() => navigate('/customer/profile')} className="bg-[#0F4C3A] hover:bg-[#0a3829] text-white rounded-xl px-8">
          Back to Profile
        </Button>
      </div>
    );
  }

  if (!selectedType) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24 animate-fade-in">
        <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-50 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="font-bold text-slate-800">Start Selling</h1>
            <p className="text-xs text-slate-500">Choose what you want to list</p>
          </div>
        </div>
        <div className="px-4 pt-6 space-y-3">
          {TYPES.map(({ value, label, desc, icon: Icon, color }) => (
            <button key={value} onClick={() => setSelectedType(value)}
              className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover transition-all text-left active:scale-[0.98]">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}12` }}>
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const FormComponent = {
    store: StoreForm,
    agriculture: AgricultureForm,
    service: ServiceForm,
    classified: ClassifiedForm,
  }[selectedType];

  return (
    <FormComponent
      onBack={() => setSelectedType(null)}
      onSuccess={(id) => { setSubmittedId(id); setSubmitted(true); }}
    />
  );
}

function StoreForm({ onBack, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    business_name: '', business_type: 'Shop', owner_name: '', phone: '',
    email: '', description: '', address: '', locality: '', city: '',
    state: 'Kerala', pincode: '', opening_time: '09:00', closing_time: '21:00',
    categories: [], delivery_available: false, pickup_available: true,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/stores/submit', form);
      onSuccess(data.store_id);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 animate-fade-in">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center gap-3">
        <button onClick={step === 1 ? onBack : () => setStep(s => s - 1)} className="p-1.5 hover:bg-slate-50 rounded-xl">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="font-bold text-slate-800">List My Store</h1>
          <p className="text-xs text-slate-500">Step {step} of 3</p>
        </div>
      </div>
      <div className="flex gap-1 px-4 pt-3">
        {[1,2,3].map(s => (
          <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-[#0F4C3A]' : 'bg-slate-200'}`} />
        ))}
      </div>
      <div className="px-4 pt-5 space-y-4">
        {step === 1 && (<>
          <Field label="Business Name *" value={form.business_name} onChange={v => set('business_name', v)} placeholder="e.g. Green Mart" />
          <Field label="Business Type *" value={form.business_type} onChange={v => set('business_type', v)} placeholder="e.g. Grocery, Restaurant" />
          <Field label="Owner Name *" value={form.owner_name} onChange={v => set('owner_name', v)} placeholder="Your full name" />
          <Field label="Phone *" value={form.phone} onChange={v => set('phone', v)} placeholder="+91XXXXXXXXXX" />
          <Field label="Email" value={form.email} onChange={v => set('email', v)} placeholder="business@email.com" />
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Describe your business..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F4C3A] resize-none" />
          </div>
          <Button onClick={() => { if (!form.business_name || !form.owner_name || !form.phone || !form.description) { toast.error('Fill all required fields'); return; } setStep(2); }}
            className="w-full h-12 rounded-xl bg-[#0F4C3A] hover:bg-[#0a3829] text-white">Continue →</Button>
        </>)}
        {step === 2 && (<>
          <Field label="Full Address *" value={form.address} onChange={v => set('address', v)} placeholder="Street, area" />
          <Field label="Locality *" value={form.locality} onChange={v => set('locality', v)} placeholder="e.g. Kozhikode" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="City *" value={form.city} onChange={v => set('city', v)} placeholder="City" />
            <Field label="Pincode *" value={form.pincode} onChange={v => set('pincode', v)} placeholder="673001" />
          </div>
          <Field label="State" value={form.state} onChange={v => set('state', v)} placeholder="Kerala" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opening Time" value={form.opening_time} onChange={v => set('opening_time', v)} type="time" />
            <Field label="Closing Time" value={form.closing_time} onChange={v => set('closing_time', v)} type="time" />
          </div>
          <Button onClick={() => { if (!form.address || !form.locality || !form.city || !form.pincode) { toast.error('Fill location details'); return; } setStep(3); }}
            className="w-full h-12 rounded-xl bg-[#0F4C3A] hover:bg-[#0a3829] text-white">Continue →</Button>
        </>)}
        {step === 3 && (<>
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div><p className="text-sm font-medium text-slate-700">Delivery Available</p><p className="text-xs text-slate-500">Deliver to customers</p></div>
            <button onClick={() => set('delivery_available', !form.delivery_available)}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.delivery_available ? 'bg-[#0F4C3A]' : 'bg-slate-200'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${form.delivery_available ? 'left-5.5 left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div><p className="text-sm font-medium text-slate-700">Pickup Available</p><p className="text-xs text-slate-500">Customers pick up in store</p></div>
            <button onClick={() => set('pickup_available', !form.pickup_available)}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.pickup_available ? 'bg-[#0F4C3A]' : 'bg-slate-200'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${form.pickup_available ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-700">After submission, our team will review your store and contact you within 24–48 hours for verification.</p>
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl bg-[#0F4C3A] hover:bg-[#0a3829] text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit for Verification
          </Button>
        </>)}
      </div>
    </div>
  );
}

function AgricultureForm({ onBack, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    product_name: '', category: 'Vegetables & Fruits', description: '', unit: 'kg',
    price: '', min_quantity: '1', available_quantity: '', locality: '', city: '',
    state: 'Kerala', availability: 'available', is_organic: false,
    pickup_available: true, delivery_available: false, bulk_available: false,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.product_name || !form.price || !form.available_quantity || !form.locality || !form.city) {
      toast.error('Fill all required fields'); return;
    }
    setLoading(true);
    try {
      const payload = { ...form, price: parseFloat(form.price), min_quantity: parseFloat(form.min_quantity), available_quantity: parseFloat(form.available_quantity) };
      const { data } = await api.post('/agriculture/submit', payload);
      onSuccess(data.listing_id);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 animate-fade-in">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h1 className="font-bold text-slate-800">Sell Agriculture Product</h1>
      </div>
      <div className="px-4 pt-5 space-y-4">
        <Field label="Product Name *" value={form.product_name} onChange={v => set('product_name', v)} placeholder="e.g. Organic Tomatoes" />
        <Field label="Category" value={form.category} onChange={v => set('category', v)} placeholder="Category" />
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
            placeholder="Describe your product quality, harvest details..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F4C3A] resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit" value={form.unit} onChange={v => set('unit', v)} placeholder="kg/bunch/litre" />
          <Field label="Price (₹) *" value={form.price} onChange={v => set('price', v)} placeholder="0.00" type="number" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min Qty *" value={form.min_quantity} onChange={v => set('min_quantity', v)} placeholder="1" type="number" />
          <Field label="Available Qty *" value={form.available_quantity} onChange={v => set('available_quantity', v)} placeholder="100" type="number" />
        </div>
        <Field label="Locality *" value={form.locality} onChange={v => set('locality', v)} placeholder="e.g. Kozhikode" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City *" value={form.city} onChange={v => set('city', v)} placeholder="City" />
          <Field label="State" value={form.state} onChange={v => set('state', v)} placeholder="Kerala" />
        </div>
        <div className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-200">
          <input type="checkbox" id="organic" checked={form.is_organic} onChange={e => set('is_organic', e.target.checked)} className="w-4 h-4 accent-[#0F4C3A]" />
          <label htmlFor="organic" className="text-sm font-medium text-slate-700">Certified Organic Product</label>
        </div>
        <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl bg-[#0F4C3A] hover:bg-[#0a3829] text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Submit Listing
        </Button>
      </div>
    </div>
  );
}

function ServiceForm({ onBack, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    service_name: '', provider_name: '', category: 'Electrician', description: '',
    phone: '', starting_price: '', locality: '', city: '', state: 'Kerala',
    service_radius: 5, experience_years: 0,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.service_name || !form.provider_name || !form.phone || !form.locality || !form.city) {
      toast.error('Fill all required fields'); return;
    }
    setLoading(true);
    try {
      const payload = { ...form, starting_price: parseFloat(form.starting_price) || 0, experience_years: parseInt(form.experience_years) || 0 };
      const { data } = await api.post('/services/submit', payload);
      onSuccess(data.service_id);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 animate-fade-in">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h1 className="font-bold text-slate-800">List Your Service</h1>
      </div>
      <div className="px-4 pt-5 space-y-4">
        <Field label="Service Name *" value={form.service_name} onChange={v => set('service_name', v)} placeholder="e.g. Home Electrical Repairs" />
        <Field label="Your Name *" value={form.provider_name} onChange={v => set('provider_name', v)} placeholder="Full name" />
        <Field label="Category" value={form.category} onChange={v => set('category', v)} placeholder="Electrician, Plumber..." />
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Description *</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
            placeholder="Describe your service, experience, specialization..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F4C3A] resize-none" />
        </div>
        <Field label="Phone *" value={form.phone} onChange={v => set('phone', v)} placeholder="+91XXXXXXXXXX" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starting Price (₹)" value={form.starting_price} onChange={v => set('starting_price', v)} placeholder="300" type="number" />
          <Field label="Experience (years)" value={form.experience_years} onChange={v => set('experience_years', v)} placeholder="5" type="number" />
        </div>
        <Field label="Locality *" value={form.locality} onChange={v => set('locality', v)} placeholder="Area you serve" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City *" value={form.city} onChange={v => set('city', v)} placeholder="City" />
          <Field label="Service Radius (km)" value={form.service_radius} onChange={v => set('service_radius', v)} placeholder="5" type="number" />
        </div>
        <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl bg-[#0F4C3A] hover:bg-[#0a3829] text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Submit Service
        </Button>
      </div>
    </div>
  );
}

function ClassifiedForm({ onBack, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', category: 'Vehicles', description: '', price: '',
    condition: 'good', locality: '', city: '', state: 'Kerala',
    is_negotiable: true, contact_preference: 'chat',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.locality || !form.city) {
      toast.error('Fill all required fields'); return;
    }
    setLoading(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) || undefined };
      const { data } = await api.post('/classifieds/submit', payload);
      onSuccess(data.listing_id);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 animate-fade-in">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h1 className="font-bold text-slate-800">Post a Classified</h1>
      </div>
      <div className="px-4 pt-5 space-y-4">
        <Field label="Title *" value={form.title} onChange={v => set('title', v)} placeholder="e.g. Honda Activa 2022 for Sale" />
        <Field label="Category" value={form.category} onChange={v => set('category', v)} placeholder="Vehicles, Electronics..." />
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Description *</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
            placeholder="Describe the item in detail..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F4C3A] resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₹)" value={form.price} onChange={v => set('price', v)} placeholder="Leave empty for free" type="number" />
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Condition</label>
            <select value={form.condition} onChange={e => set('condition', e.target.value)}
              className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:border-[#0F4C3A] bg-white">
              {['new', 'like_new', 'good', 'fair', 'for_parts'].map(c => (
                <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
        </div>
        <Field label="Locality *" value={form.locality} onChange={v => set('locality', v)} placeholder="Area / Locality" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City *" value={form.city} onChange={v => set('city', v)} placeholder="City" />
          <Field label="State" value={form.state} onChange={v => set('state', v)} placeholder="Kerala" />
        </div>
        <div className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-200">
          <input type="checkbox" id="nego" checked={form.is_negotiable} onChange={e => set('is_negotiable', e.target.checked)} className="w-4 h-4 accent-[#0F4C3A]" />
          <label htmlFor="nego" className="text-sm font-medium text-slate-700">Price is Negotiable</label>
        </div>
        <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl bg-[#0F4C3A] hover:bg-[#0a3829] text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Post Classified
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="h-11 rounded-xl border-slate-200 focus:border-[#0F4C3A]" />
    </div>
  );
}
