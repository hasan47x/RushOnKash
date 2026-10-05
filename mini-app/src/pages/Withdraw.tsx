import { Link } from 'react-router-dom';
import { Wallet, ArrowLeft, CreditCard, Smartphone, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useTelegram } from '../context/TelegramContext';
import { cn, formatCurrency } from '../utils/cn';

const WITHDRAW_METHODS = [
  { id: 'bkash', name: 'bKash', icon: Smartphone, color: 'text-pink-500', bgColor: 'bg-pink-500/20' },
  { id: 'nagad', name: 'Nagad', icon: Smartphone, color: 'text-orange-500', bgColor: 'bg-orange-500/20' },
  { id: 'rocket', name: 'Rocket', icon: Smartphone, color: 'text-purple-500', bgColor: 'bg-purple-500/20' },
  { id: 'binance', name: 'Binance', icon: CreditCard, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' },
];

export function Withdraw() {
  const { user, refreshUser } = useAuth();
  const { config } = useConfig();
  const { webApp, hapticFeedback } = useTelegram();
  
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'binance'>('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const balance = user?.balance || 0;
  const minWithdraw = config.withdraw.minAmount || 100;
  const maxWithdraw = config.withdraw.maxAmount || 10000;
  const requiredReferrals = config.withdraw.requiredReferrals || 5;
  const userReferrals = user?.referral_count || 0;
  const methodConfig = config.withdraw.methods?.find(m => m.name === selectedMethod);
  const methodMin = methodConfig?.minAmount || minWithdraw;
  const methodMax = methodConfig?.maxAmount || maxWithdraw;

  const canWithdraw = balance >= methodMin && 
                      userReferrals >= requiredReferrals &&
                      !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < methodMin) {
      setError(`Minimum withdrawal is ${formatCurrency(methodMin)}`);
      return;
    }
    if (withdrawAmount > methodMax) {
      setError(`Maximum withdrawal is ${formatCurrency(methodMax)}`);
      return;
    }
    if (withdrawAmount > balance) {
      setError('Insufficient balance');
      return;
    }
    if (!accountNumber.trim()) {
      setError('Please enter account number');
      return;
    }
    if (userReferrals < requiredReferrals) {
      setError(`Need at least ${requiredReferrals} referrals (you have ${userReferrals})`);
      return;
    }

    setSubmitting(true);
    hapticFeedback?.impactOccurred?.('medium');

    try {
      // await api.createWithdrawal({
      //   userId: user!.id,
      //   amount: withdrawAmount,
      //   method: selectedMethod,
      //   accountNumber: accountNumber.trim(),
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
      setAmount('');
      setAccountNumber('');
      await refreshUser();
      hapticFeedback?.notificationOccurred?.('success');
    } catch (err) {
      setError('Withdrawal failed. Please try again.');
      hapticFeedback?.notificationOccurred?.('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <Link to="/" className="btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Withdraw</h1>
          <Link to="/" className="w-10" />
        </header>

        <div className="card text-center py-8">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-green-500 mb-2">Request Submitted!</h2>
          <p className="text-dark-400 mb-6">Your withdrawal request has been sent for processing.</p>
          <div className="space-y-2 text-left max-w-xs mx-auto">
            <div className="flex justify-between">
              <span className="text-dark-400">Amount</span>
              <span className="font-semibold">{formatCurrency(parseFloat(amount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Method</span>
              <span className="font-semibold capitalize">{selectedMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Account</span>
              <span className="font-semibold">{accountNumber}</span>
            </div>
          </div>
          <p className="text-sm text-dark-500 mt-4">You'll receive a notification once processed.</p>
          <Link to="/withdraw" className="btn-primary w-full mt-6">
            Make Another Withdrawal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Withdraw</h1>
        <Link to="/" className="w-10" />
      </header>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-dark-400 text-sm">Available Balance</p>
            <p className="text-2xl font-bold gradient-text">{formatCurrency(balance)}</p>
          </div>
          <div className="bg-dark-800/50 px-3 py-2 rounded-xl">
            <Wallet className="w-5 h-5 text-primary-500" />
          </div>
        </div>
      </div>

      {userReferrals < requiredReferrals && (
        <div className="card bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="font-semibold text-yellow-500">Referral Requirement</p>
              <p className="text-sm text-dark-400">
                Need {requiredReferrals} referrals to withdraw. You have {userReferrals}.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h3 className="font-semibold mb-4">Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            {WITHDRAW_METHODS.map(method => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(method.id as typeof selectedMethod)}
                className={cn(
                  'card-hover p-4 flex flex-col items-center gap-3 transition-all',
                  selectedMethod === method.id && 'ring-2 ring-primary-500 bg-primary-500/10'
                )}
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', method.bgColor)}>
                  <method.icon className={cn('w-6 h-6', method.color)} />
                </div>
                <span className="font-medium">{method.name}</span>
                {selectedMethod === method.id && <CheckCircle className="w-5 h-5 text-primary-500" />}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Withdrawal Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="Enter your account number"
                className="input"
                maxLength={15}
              />
              <p className="text-xs text-dark-500 mt-1">Enter your {selectedMethod} account number</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">{'৳'}</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="input pl-10"
                  min={methodMin}
                  max={Math.min(methodMax, balance)}
                  step="0.01"
                />
              </div>
              <p className="text-xs text-dark-500">
                Min: {formatCurrency(methodMin)} • Max: {formatCurrency(Math.min(methodMax, balance))}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="card bg-red-500/10 border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-500">{error}</p>
          </div>
        )}

        <button 
          type="submit" 
          disabled={submitting || !canWithdraw}
          className="btn-primary w-full py-4 text-lg"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Withdraw {formatCurrency(parseFloat(amount) || 0)}
            </>
          )}
        </button>

        <div className="card bg-dark-800/50">
          <h4 className="font-semibold mb-3">Withdrawal Rules</h4>
          <ul className="space-y-2 text-sm text-dark-400">
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary-500" /> Minimum {formatCurrency(minWithdraw)}</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary-500" /> Maximum {formatCurrency(maxWithdraw)}</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary-500" /> {requiredReferrals} referrals required</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary-500" /> {config.withdraw.cooldownHours || 24}h cooldown between withdrawals</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary-500" /> Processing within 24 hours</li>
          </ul>
        </div>
      </form>
    </div>
  );
}