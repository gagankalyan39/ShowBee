'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { bookingAPI, paymentAPI } from '@/lib/api';
import { Booking } from '@/types';
import { CreditCard, QrCode, Building, Wallet, ShieldCheck, CheckCircle, AlertCircle, ArrowLeft, Ticket } from 'lucide-react';

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING' | 'WALLET'>('UPI');
  const [upiId, setUpiId] = useState('user@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4532 8921 4092 1198');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('321');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    bookingAPI
      .getById(bookingId)
      .then((res) => {
        if (res.success && res.data) {
          setBooking(res.data);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Failed to load booking details');
      });
  }, [bookingId]);

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'SHOWBEE50') {
      setDiscount(50);
    } else {
      alert('Invalid coupon code. Try code: SHOWBEE50');
    }
  };

  const handlePay = async (simulateResult: 'SUCCESS' | 'FAILED' = 'SUCCESS') => {
    if (!bookingId) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const res = await paymentAPI.process({
        bookingId,
        method: paymentMethod,
        simulateResult,
        paymentDetails: {
          upiId: paymentMethod === 'UPI' ? upiId : undefined,
        },
      });

      if (res.success && res.data) {
        // Redirect to booking confirmation page
        router.push(`/booking/confirmation?bookingId=${bookingId}`);
      } else {
        throw new Error(res.message || 'Payment was declined by mock gateway');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment simulation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!bookingId) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-3xl glass-panel text-center">
        <p className="text-rose-400 font-bold mb-2">No booking ID provided</p>
        <button onClick={() => router.push('/')} className="px-5 py-2 rounded-full brand-btn text-xs font-bold text-white">
          Back to Home
        </button>
      </div>
    );
  }

  const finalAmount = booking
    ? Math.max(0, parseFloat(booking.total_amount as any) - discount)
    : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-24">
      {/* Header */}
      <div className="pb-4 border-b border-white/[0.08] mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to seats
        </button>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">
          Checkout & Mock Payment Gateway
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Order Reference: <strong className="text-rose-400 font-mono">{booking?.booking_reference || bookingId}</strong>
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Payment Methods (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl glass-panel space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Choose Payment Method
            </h2>

            {/* Method Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                { id: 'CARD', label: 'Cards', icon: CreditCard },
                { id: 'NETBANKING', label: 'Net Banking', icon: Building },
                { id: 'WALLET', label: 'Wallets', icon: Wallet },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-950/40'
                        : 'glass-card text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-rose-400' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* UPI Option */}
            {paymentMethod === 'UPI' && (
              <div className="space-y-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Virtual Payment Address (UPI ID)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-rose-500"
                    placeholder="username@bank"
                  />
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                  <span>Popular: Google Pay • PhonePe • Paytm • CRED UPI</span>
                </div>
              </div>
            )}

            {/* Card Option */}
            {paymentMethod === 'CARD' && (
              <div className="space-y-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-rose-500 text-center font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">CVV</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-rose-500 text-center font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Netbanking Option */}
            {paymentMethod === 'NETBANKING' && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-gray-300">
                <p className="font-semibold mb-2 text-white">Select Bank</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((b) => (
                    <div key={b} className="p-2.5 rounded-xl glass-card text-center cursor-pointer border border-white/10 hover:border-rose-400">
                      <span className="text-[11px] font-bold">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wallet Option */}
            {paymentMethod === 'WALLET' && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-gray-300">
                <p className="font-semibold mb-2 text-white">Select Digital Wallet</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Amazon Pay', 'Paytm Wallet', 'Mobikwik'].map((w) => (
                    <div key={w} className="p-2.5 rounded-xl glass-card text-center cursor-pointer border border-white/10 hover:border-rose-400">
                      <span className="text-[11px] font-bold">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pay Button */}
            <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => handlePay('SUCCESS')}
                disabled={isProcessing}
                className="w-full sm:flex-1 py-3.5 rounded-2xl brand-btn text-white text-sm font-bold tracking-wider uppercase shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <span>Pay Now • ₹{finalAmount}</span>
                )}
              </button>

              {/* Simulation Helper */}
              <button
                onClick={() => handlePay('FAILED')}
                disabled={isProcessing}
                className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-red-950/40 border border-white/15 text-xs text-gray-300 font-semibold"
                title="Test simulated payment failure"
              >
                Simulate Fail
              </button>
            </div>

          </div>
        </div>

        {/* Order Summary Column (1 Col) */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Ticket className="w-4 h-4 text-rose-400" />
              <span>Order Details</span>
            </h2>

            {booking && (
              <div className="space-y-3 text-xs">
                <div>
                  <h3 className="font-bold text-white text-sm uppercase">{booking.movie_title || 'Movie'}</h3>
                  <p className="text-gray-400 text-[11px]">{booking.theatre_name || 'Cinema'} • {booking.screen_name || 'Screen 1'}</p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-gray-400">Reserved Seats</span>
                  <span className="font-bold text-rose-400 font-mono">
                    {booking.seats?.map((s) => `${s.row_label}${s.seat_number}`).join(', ') || 'Seats'}
                  </span>
                </div>

                {/* Coupon Input */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-gray-400 block mb-1">Promo Code (Try SHOWBEE50)</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white uppercase outline-none focus:border-rose-500"
                    />
                    <button
                      onClick={applyCoupon}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-white/[0.08] pt-3 space-y-2">
                  <div className="flex justify-between text-gray-400">
                    <span>Base Ticket Price</span>
                    <span className="font-semibold text-white">₹{booking.subtotal || booking.total_amount}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Convenience Fee</span>
                    <span className="font-semibold text-white">₹{booking.convenience_fee || 30}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Discount (SHOWBEE50)</span>
                      <span>-₹{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/[0.06]">
                    <span>Total Amount</span>
                    <span className="text-rose-400">₹{finalAmount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 text-[10px] text-gray-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>256-Bit SSL Encrypted Mock Gateway</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading checkout...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
