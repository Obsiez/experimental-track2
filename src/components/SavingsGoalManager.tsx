import React, { useState } from 'react';
import { SavingsGoal } from '../types';
import { 
  PiggyBank, Plus, Trash2, ChevronDown, ChevronUp, Target, DollarSign, Calendar, TrendingUp, CheckCircle, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatNumber, Language } from '../lib/translations';
import { triggerHaptic } from '../lib/haptics';
import { toast } from 'sonner';

interface SavingsGoalManagerProps {
  savingsGoals: SavingsGoal[];
  createSavingsGoal: (title: string, targetAmount: number, frequency: 'daily' | 'weekly' | 'monthly', duration: number) => Promise<void>;
  addDepositToGoal: (goalId: string, amount: number, notes?: string) => Promise<void>;
  deleteSavingsGoal: (goalId: string) => Promise<void>;
  lang: Language;
}

export default function SavingsGoalManager({
  savingsGoals,
  createSavingsGoal,
  addDepositToGoal,
  deleteSavingsGoal,
  lang
}: SavingsGoalManagerProps) {
  // Modal states
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  
  // Expand states for goals list
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // New Goal Form states
  const [goalTitle, setGoalTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [duration, setDuration] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  // New Deposit Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Calculations
  const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.savedAmount, 0);
  const activeCount = savingsGoals.filter(g => g.status === 'active').length;
  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  // Real-time installment calculator in New Goal Modal
  const calculatedInstallment = () => {
    const amt = parseFloat(targetAmount.replace(/[^\d.]/g, ''));
    const dur = parseInt(duration.replace(/[^\d]/g, ''), 10);
    if (isNaN(amt) || isNaN(dur) || dur <= 0) return 0;
    return Math.round(amt / dur);
  };

  // Translations dictionary local helper
  const t = {
    goals: lang === 'bn' ? 'সঞ্চয় লক্ষ্য (Goals)' : 'Savings Goals',
    newGoal: lang === 'bn' ? 'নতুন সঞ্চয় লক্ষ্য' : 'New Savings Goal',
    savingsSummary: lang === 'bn' ? 'সঞ্চয় সারসংক্ষেপ (Summary)' : 'Savings Summary',
    totalTarget: lang === 'bn' ? 'মোট লক্ষ্যমাত্রা' : 'Total Target',
    totalSaved: lang === 'bn' ? 'মোট সঞ্চিত' : 'Total Saved',
    activeGoals: lang === 'bn' ? 'সক্রিয় লক্ষ্য' : 'Active Goals',
    goalTitle: lang === 'bn' ? 'লক্ষ্যের শিরোনাম / উদ্দেশ্য' : 'Goal Title / Purpose',
    targetAmount: lang === 'bn' ? 'লক্ষ্যমাত্রা (৳ BDT)' : 'Target Amount (৳ BDT)',
    frequency: lang === 'bn' ? 'কিস্তির হার' : 'Installment Frequency',
    duration: lang === 'bn' ? 'কিস্তির সংখ্যা' : 'Number of Installments',
    daily: lang === 'bn' ? 'দৈনিক' : 'Daily',
    weekly: lang === 'bn' ? 'সাপ্তাহিক' : 'Weekly',
    monthly: lang === 'bn' ? 'মাসিক' : 'Monthly',
    calculatedInstallment: lang === 'bn' ? 'হিসাবকৃত কিস্তির পরিমাণ' : 'Calculated Installment',
    createGoal: lang === 'bn' ? 'লক্ষ্য তৈরি করুন' : 'Create Savings Goal',
    addDeposit: lang === 'bn' ? 'নতুন কিস্তি জমা দিন' : 'Deposit Installment',
    depositNotes: lang === 'bn' ? 'বিবরণ / নোট (ঐচ্ছিক)' : 'Notes / Description (Optional)',
    depositAmount: lang === 'bn' ? 'জমার পরিমাণ (৳ BDT)' : 'Deposit Amount (৳ BDT)',
    depositsHistory: lang === 'bn' ? 'জমা কিস্তির বিবরণ' : 'Deposits Ledger',
    completed: lang === 'bn' ? 'সম্পন্ন' : 'Completed',
    active: lang === 'bn' ? 'চলমান' : 'Active',
    noGoals: lang === 'bn' ? 'এখনো কোনো সঞ্চয় লক্ষ্য তৈরি করা হয়নি।' : 'No savings goals created yet.',
    deleteGoalConfirm: lang === 'bn' ? 'আপনি কি নিশ্চিত যে এই সঞ্চয় লক্ষ্যটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this savings goal?',
    cancel: lang === 'bn' ? 'বাতিল' : 'Cancel',
    save: lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save',
    saving: lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...',
    repaymentSchedule: lang === 'bn' ? 'কিস্তি পরিকল্পনা' : 'Installment Plan',
    remaining: lang === 'bn' ? 'অবশিষ্ট লক্ষ্য' : 'Remaining',
    historyCount: lang === 'bn' ? 'মোট জমা কিস্তি' : 'Total Deposits'
  };

  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) {
      toast.error(lang === 'bn' ? 'অনুগ্রহ করে শিরোনাম লিখুন' : 'Please enter a goal title');
      return;
    }
    const targetVal = parseFloat(targetAmount.replace(/[^\d.]/g, ''));
    const durationVal = parseInt(duration.replace(/[^\d]/g, ''), 10);

    if (isNaN(targetVal) || targetVal <= 0) {
      toast.error(lang === 'bn' ? 'সঠিক লক্ষ্যমাত্রা পরিমাণ লিখুন' : 'Please enter a valid target amount');
      return;
    }
    if (isNaN(durationVal) || durationVal <= 0) {
      toast.error(lang === 'bn' ? 'সঠিক কিস্তির সংখ্যা লিখুন' : 'Please enter a valid installment count');
      return;
    }

    try {
      setIsSubmittingGoal(true);
      triggerHaptic('single');
      await createSavingsGoal(goalTitle, targetVal, frequency, durationVal);
      toast.success(lang === 'bn' ? 'সঞ্চয় লক্ষ্য সফলভাবে তৈরি হয়েছে' : 'Savings goal created successfully');
      
      // Reset Form
      setGoalTitle('');
      setTargetAmount('');
      setFrequency('monthly');
      setDuration('');
      setIsNewGoalOpen(false);
    } catch (err) {
      toast.error(lang === 'bn' ? 'লক্ষ্য তৈরি করা যায়নি' : 'Failed to create savings goal');
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId) return;

    const amtVal = parseFloat(depositAmount.replace(/[^\d.]/g, ''));
    if (isNaN(amtVal) || amtVal <= 0) {
      toast.error(lang === 'bn' ? 'সঠিক জমার পরিমাণ লিখুন' : 'Please enter a valid deposit amount');
      return;
    }

    try {
      setIsSubmittingDeposit(true);
      triggerHaptic('tick');
      await addDepositToGoal(selectedGoalId, amtVal, depositNotes);
      toast.success(lang === 'bn' ? 'কিস্তি সফলভাবে জমা হয়েছে' : 'Installment deposited successfully');
      
      setDepositAmount('');
      setDepositNotes('');
      setIsDepositOpen(false);
      setSelectedGoalId(null);
    } catch (err) {
      toast.error(lang === 'bn' ? 'জমা করা যায়নি' : 'Failed to record deposit');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm(t.deleteGoalConfirm)) return;
    try {
      triggerHaptic('double');
      await deleteSavingsGoal(id);
      toast.success(lang === 'bn' ? 'লক্ষ্য মুছে ফেলা হয়েছে' : 'Savings goal deleted');
      if (expandedGoalId === id) setExpandedGoalId(null);
    } catch (err) {
      toast.error(lang === 'bn' ? 'মুছে ফেলা যায়নি' : 'Failed to delete goal');
    }
  };

  const toggleExpand = (id: string) => {
    triggerHaptic('single');
    setExpandedGoalId(expandedGoalId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* 1. BANKING METRICS HEADER */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-905 text-white p-6 rounded-3xl shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <PiggyBank className="w-5.5 h-5.5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{t.goals}</h2>
              <p className="text-2xs text-emerald-250 font-bold opacity-80 uppercase tracking-widest mt-0.5">{t.savingsSummary}</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('single');
              setIsNewGoalOpen(true);
            }}
            className="px-4 py-2 bg-white text-emerald-900 text-xs font-black rounded-xl hover:bg-emerald-50 transition-colors shadow-md flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            {t.newGoal}
          </button>
        </div>

        {/* Dashboard figures */}
        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
          <div>
            <span className="text-[10px] text-emerald-200 block uppercase font-black tracking-wider">{t.totalTarget}</span>
            <span className="text-sm sm:text-base font-extrabold block mt-0.5">
              ৳ {formatNumber(totalTarget, lang)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-200 block uppercase font-black tracking-wider">{t.totalSaved}</span>
            <span className="text-sm sm:text-base font-extrabold text-emerald-200 block mt-0.5">
              ৳ {formatNumber(totalSaved, lang)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-200 block uppercase font-black tracking-wider">{t.activeGoals}</span>
            <span className="text-sm sm:text-base font-extrabold block mt-0.5">
              {formatNumber(activeCount, lang)}
            </span>
          </div>
        </div>

        {/* Aggregate Progress slider */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-2xs font-extrabold text-emerald-150">
            <span>OVERALL RATIO</span>
            <span>{formatNumber(overallProgress, lang)}%</span>
          </div>
          <div className="w-full h-2.5 bg-emerald-950/40 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-emerald-300 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* 2. GOALS LIST */}
      <div className="space-y-4">
        {savingsGoals.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl text-center text-zinc-400 dark:text-zinc-500 font-bold text-sm">
            <Target className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
            {t.noGoals}
          </div>
        ) : (
          savingsGoals.map((goal) => {
            const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
            const isExpanded = expandedGoalId === goal.id;
            const freqLabel = goal.frequency === 'daily' ? t.daily : (goal.frequency === 'weekly' ? t.weekly : t.monthly);
            
            return (
              <div 
                key={goal.id} 
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden transition-all duration-200"
              >
                {/* Main Card row */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Title & Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-[16px] text-zinc-900 dark:text-white truncate">{goal.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        goal.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'
                      }`}>
                        {goal.status === 'completed' ? t.completed : t.active}
                      </span>
                    </div>

                    {/* Progress details */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs font-extrabold text-zinc-400 dark:text-zinc-500">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black">
                        <DollarSign className="w-3.5 h-3.5" />
                        ৳ {formatNumber(goal.savedAmount, lang)} / ৳ {formatNumber(goal.targetAmount, lang)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {freqLabel} ({formatNumber(goal.duration, lang)} {lang === 'bn' ? 'টি কিস্তি' : 'Periods'})
                      </span>
                      <span className="flex items-center gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        ৳ {formatNumber(goal.installmentAmount, lang)} / {goal.frequency === 'daily' ? (lang === 'bn' ? 'দিন' : 'day') : (goal.frequency === 'weekly' ? (lang === 'bn' ? 'সপ্তাহ' : 'week') : (lang === 'bn' ? 'মাস' : 'month'))}
                      </span>
                    </div>
                  </div>

                  {/* Right side Actions & Progress circle */}
                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      {goal.status === 'active' && (
                        <button
                          onClick={() => {
                            triggerHaptic('single');
                            setSelectedGoalId(goal.id);
                            setIsDepositOpen(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-55 hover:bg-emerald-100 dark:bg-emerald-955 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-2xs font-black rounded-lg border border-emerald-100 dark:border-emerald-900/20 cursor-pointer transition-colors"
                        >
                          {t.addDeposit}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                        title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => toggleExpand(goal.id)}
                        className="p-1 text-zinc-400 hover:text-zinc-650 dark:hover:text-white rounded-lg cursor-pointer transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Progress Indicator Card */}
                    <div className="text-right">
                      <span className="text-[14px] font-black text-zinc-800 dark:text-white">{formatNumber(progress, lang)}%</span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block font-bold uppercase">{lang === 'bn' ? 'সঞ্চিত' : 'SAVED'}</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar inside card */}
                <div className="px-5 pb-4">
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Expanded Section (Deposit history log) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 overflow-hidden"
                    >
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold text-zinc-400 dark:text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                          <span className="uppercase tracking-wider flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-emerald-500" />
                            {t.repaymentSchedule}
                          </span>
                          <span>
                            {t.remaining}: ৳ {formatNumber(remaining, lang)}
                          </span>
                        </div>

                        {/* Installment details schedule */}
                        <div className="grid grid-cols-2 gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                          <div>
                            <span className="text-[10px] text-zinc-400 block uppercase mb-0.5">{t.repaymentSchedule}</span>
                            <span>৳ {formatNumber(goal.installmentAmount, lang)} / {freqLabel}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-400 block uppercase mb-0.5">{t.historyCount}</span>
                            <span>{formatNumber(goal.deposits.length, lang)} {lang === 'bn' ? 'টি' : 'payments'}</span>
                          </div>
                        </div>

                        {/* Deposit log list */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t.depositsHistory}</h4>
                          {goal.deposits.length === 0 ? (
                            <p className="text-xs text-zinc-400 font-bold italic py-2">{lang === 'bn' ? 'কোন কিস্তি জমা দেওয়া হয়নি' : 'No deposits recorded yet.'}</p>
                          ) : (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-52 overflow-y-auto pr-1">
                              {goal.deposits.map((dep, idx) => (
                                <div key={dep.id} className="py-2.5 flex items-center justify-between text-xs font-extrabold">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black">{goal.deposits.length - idx}</span>
                                      <span className="text-zinc-850 dark:text-zinc-200">
                                        ৳ {formatNumber(dep.amount, lang)}
                                      </span>
                                    </div>
                                    {dep.notes && <p className="text-[10px] text-zinc-400 dark:text-zinc-505 font-bold ml-7">{dep.notes}</p>}
                                  </div>
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-505 font-bold">
                                    {new Date(dep.date).toLocaleDateString()} {new Date(dep.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* 3. NEW SAVINGS GOAL MODAL */}
      {isNewGoalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setIsNewGoalOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative z-10 space-y-5"
          >
            <h3 className="text-lg font-black text-zinc-900 dark:text-white">{t.newGoal}</h3>
            
            <form onSubmit={handleCreateGoalSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-black text-zinc-400 dark:text-zinc-505 uppercase tracking-widest">{t.goalTitle}</label>
                <input 
                  type="text" 
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: নতুন গাড়ি ক্রয়' : 'e.g. Renovation Deposit'}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-850 dark:text-white font-extrabold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-black text-zinc-400 dark:text-zinc-505 uppercase tracking-widest">{t.targetAmount}</label>
                  <input 
                    type="text" 
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="50,000"
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-850 dark:text-white font-extrabold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-black text-zinc-400 dark:text-zinc-505 uppercase tracking-widest">{t.duration}</label>
                  <input 
                    type="number" 
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="10"
                    min="1"
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-850 dark:text-white font-extrabold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-black text-zinc-400 dark:text-zinc-505 uppercase tracking-widest">{t.frequency}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => {
                        triggerHaptic('single');
                        setFrequency(freq);
                      }}
                      className={`py-2 text-2xs font-black rounded-xl border transition-all cursor-pointer ${
                        frequency === freq
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                          : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100'
                      }`}
                    >
                      {freq === 'daily' ? t.daily : (freq === 'weekly' ? t.weekly : t.monthly)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Installment Calculator preview */}
              {calculatedInstallment() > 0 && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 p-3 rounded-2xl text-2xs font-bold text-zinc-650 dark:text-zinc-450 flex items-center justify-between">
                  <span className="uppercase tracking-wider">{t.calculatedInstallment}:</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    ৳ {formatNumber(calculatedInstallment(), lang)} / {frequency === 'daily' ? (lang === 'bn' ? 'দিন' : 'day') : (frequency === 'weekly' ? (lang === 'bn' ? 'সপ্তাহ' : 'week') : (lang === 'bn' ? 'মাস' : 'month'))}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewGoalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-755 dark:text-zinc-300 text-xs font-black rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGoal}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer disabled:opacity-75"
                >
                  {isSubmittingGoal ? t.saving : t.save}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 4. DEPOSIT INSTALLMENT MODAL */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => { setIsDepositOpen(false); setSelectedGoalId(null); }} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative z-10 space-y-5"
          >
            <h3 className="text-lg font-black text-zinc-900 dark:text-white">{t.addDeposit}</h3>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-black text-zinc-400 dark:text-zinc-505 uppercase tracking-widest">{t.depositAmount}</label>
                <input 
                  type="text" 
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="5,000"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-850 dark:text-white font-extrabold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-black text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">{t.depositNotes}</label>
                <input 
                  type="text" 
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: ১ম মাসের কিস্তি' : 'e.g. installment 1'}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-850 dark:text-white font-extrabold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsDepositOpen(false); setSelectedGoalId(null); }}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-755 dark:text-zinc-300 text-xs font-black rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeposit}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer disabled:opacity-75"
                >
                  {isSubmittingDeposit ? t.saving : t.save}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
