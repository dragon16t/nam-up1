import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight, Plus, X, Loader2 } from 'lucide-react';
import api from '@/utils/api';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/utils/format';
import { SkeletonList } from '@/components/shared/SkeletonCard';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { topupWalletWithRazorpay } from '@/utils/razorpay';

const ADD_AMOUNTS = [100, 200, 500, 1000, 2000];

export default function CustomerWallet() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const refresh = () =>
    Promise.allSettled([
      api.get('/wallet/balance'),
      api.get('/payments/my'),
    ]).then(([balRes, payRes]) => {
      if (balRes.status === 'fulfilled') setBalance(balRes.value.data.balance ?? 0);
      if (payRes.status === 'fulfilled') {
        const data = payRes.value.data;
        setPayments(data);
        const captured = data.filter(p => p.status === 'captured');
        setTotalSpent(captured.reduce((s, p) => s + (p.net_paid || 0), 0));
        setTotalSaved(captured.reduce((s, p) => s + (p.discount_amount || 0), 0));
      }
    });

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  const handleAddMoney = async () => {
    const amt = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (!amt || amt < 10) { toast.error('Minimum ₹10'); return; }
    if (amt > 100000) { toast.error('Maximum ₹1,00,000 per top-up'); return; }
    setProcessing(true);
    try {
      const result = await topupWalletWithRazorpay({ amount: amt });
      setBalance(result.balance ?? balance + amt);
      toast.success(`₹${amt} added to your wallet!`);
      setShowAddMoney(false);
      setCustomAmount('');
      refresh();
    } catch (e) {
      const msg = e?.message || 'Payment failed';
      if (msg.toLowerCase().includes('cancel')) toast.info('Payment cancelled');
      else toast.error(msg);
    } finally { setProcessing(false); }
  };

  return (
    <div className="pb-24 animate-fade-in bg-slate-50 min-h-screen">

      {/* My Money Section */}
      <div className="bg-gradient-to-b from-[#0F4C3A] to-[#0d4032] px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-sm font-semibold text-white/70 uppercase tracking-wider">My Money</h1>
          <Wallet className="w-4 h-4 text-white/50" />
        </div>
        <p data-testid="wallet-balance" className="text-4xl font-bold text-white mb-1">{formatCurrency(balance)}</p>
        <p className="text-xs text-white/60">NAMCOS Wallet Balance</p>

        <button
          data-testid="add-money-btn"
          onClick={() => setShowAddMoney(true)}
          className="mt-5 flex items-center gap-2 bg-white text-[#0F4C3A] font-bold text-sm px-5 py-2.5 rounded-2xl shadow-md hover:bg-slate-50 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Add Money
        </button>
      </div>

      {/* Stats Row */}
      <div className="px-4 -mt-4 grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <TrendingUp className="w-4 h-4 text-slate-400 mb-2" />
          <p className="text-xs text-slate-500">Total Spent</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          <p className="text-xs text-slate-500">Total Saved</p>
          <p className="text-lg font-bold text-green-600 mt-0.5">{formatCurrency(totalSaved)}</p>
          <p className="text-[9px] text-slate-400">via NAMCOS offers</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-4">
        <h2 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Transaction History</h2>
        {loading ? <SkeletonList count={4} /> :
          payments.length === 0 ? (
            <EmptyState type="orders" title="No transactions yet" description="Your payment history will appear here" />
          ) : (
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p.id} data-testid={`txn-${p.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        p.status === 'captured' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <ArrowDownLeft className={`w-4 h-4 ${p.status === 'captured' ? 'text-green-600' : 'text-red-500'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{p.store_name || 'Payment'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.transaction_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${p.status === 'captured' ? 'text-slate-800' : 'text-red-500'}`}>
                        {formatCurrency(p.net_paid)}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(p.status)}`}>
                        {getStatusLabel(p.status)}
                      </span>
                    </div>
                  </div>
                  {p.discount_amount > 0 && (
                    <p className="text-xs text-green-600 mt-2">Saved {formatCurrency(p.discount_amount)} with NAMCOS</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">{formatDate(p.created_at)}</p>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowAddMoney(false)}>
          <div
            className="bg-white w-full max-w-[480px] mx-auto rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800">Add Money to Wallet</h3>
              <button onClick={() => setShowAddMoney(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Amount</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {ADD_AMOUNTS.map(amt => (
                <button key={amt} onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    selectedAmount === amt && !customAmount
                      ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                      : 'border-slate-200 text-slate-700 hover:border-[#0F4C3A]'
                  }`}>
                  ₹{amt}
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Or enter custom amount</p>
            <div className="relative mb-5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input type="number" placeholder="0"
                value={customAmount} onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
                className="w-full h-12 pl-8 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:outline-none focus:border-[#0F4C3A]"
                style={{ MozAppearance: 'textfield' }} />
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4">
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                Secure payment via Razorpay. UPI / Cards / Netbanking supported.
              </p>
            </div>

            <button onClick={handleAddMoney} disabled={processing}
              data-testid="wallet-topup-btn"
              className="w-full h-12 bg-[#0F4C3A] hover:bg-[#0a3829] disabled:opacity-60 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
              {processing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                : `Proceed to Pay ₹${customAmount || selectedAmount}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
