import { useState, useEffect } from 'react';
import type { House, PickupSchedule, PickupSlot } from '@/lib/supabase';
import {
  fetchActiveScheduleForHouse,
  createSchedule,
  cancelSchedule,
  isSlotPassed,
  subscribeToPickupSchedules,
} from '@/lib/pickupScheduleService';
import {
  Calendar, Clock, CheckCircle2, AlertTriangle, X, Loader2, RefreshCw,
  MapPin, Check, XCircle, Navigation, ChevronRight, Info
} from '@/lib/icons';

interface Props {
  house: House;
  residentId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PickupSchedulerModal({ house, residentId, isOpen, onClose }: Props) {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [selectedSlot, setSelectedSlot] = useState<PickupSlot>('07:00');
  const [notes, setNotes] = useState('');
  
  const [activeSchedule, setActiveSchedule] = useState<PickupSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadCurrentSchedule = async () => {
    setLoading(true);
    setError('');
    const active = await fetchActiveScheduleForHouse(house.id, selectedDate);
    setActiveSchedule(active);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadCurrentSchedule();
    }
  }, [isOpen, selectedDate, house.id]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToPickupSchedules(() => {
      loadCurrentSchedule();
    });
    return () => unsub();
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const slot1Passed = isSlotPassed(selectedDate, '07:00');
  const slot2Passed = isSlotPassed(selectedDate, '12:00');

  const handleBook = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    const res = await createSchedule({
      houseId: house.id,
      residentId,
      date: selectedDate,
      slot: selectedSlot,
      notes: notes.trim() || undefined,
    });

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg(`Waste pickup scheduled successfully for ${selectedSlot === '07:00' ? '7:00 AM' : '12:00 PM'} on ${selectedDate}!`);
      loadCurrentSchedule();
    }
    setActionLoading(false);
  };

  const handleCancel = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled pickup?')) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    const res = await cancelSchedule(scheduleId);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg('Pickup schedule cancelled.');
      loadCurrentSchedule();
    }
    setActionLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg glass-card border border-soft-c shadow-2xl overflow-hidden rounded-3xl p-5 sm:p-6 space-y-5 animate-scale-in my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-soft-c pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-white shadow-lg">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-primary-c">Schedule Waste Pickup</h2>
              <p className="text-xs text-secondary-c flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="text-emerald-500" /> House {house.house_number} · {house.address}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-input-c border border-soft-c flex items-center justify-center text-muted-c hover:text-primary-c transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Active Schedule Overview if already booked for selected date */}
        {activeSchedule ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Confirmed Active Pickup
                </span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">
                Scheduled
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div>
                <span className="text-muted-c">Pickup Date:</span>
                <p className="font-semibold text-primary-c mt-0.5">{activeSchedule.scheduled_date}</p>
              </div>
              <div>
                <span className="text-muted-c">Selected Slot:</span>
                <p className="font-semibold text-emerald-500 mt-0.5 flex items-center gap-1">
                  <Clock size={12} /> {activeSchedule.slot === '07:00' ? '7:00 AM (Morning)' : '12:00 PM (Midday)'}
                </p>
              </div>
            </div>

            {activeSchedule.notes && (
              <p className="text-xs text-secondary-c italic border-t border-emerald-500/20 pt-2">
                "{activeSchedule.notes}"
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => handleCancel(activeSchedule.id)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold hover:bg-rose-500/20 transition flex items-center gap-1"
              >
                {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Cancel Pickup
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Date Selection */}
            <div>
              <label className="text-xs font-bold text-secondary-c uppercase tracking-wider block mb-2">
                1. Select Pickup Date
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayStr())}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col gap-0.5 ${
                    selectedDate === getTodayStr()
                      ? 'border-emerald-500 bg-emerald-500/10 text-primary-c'
                      : 'border-soft-c bg-input-c text-secondary-c hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs font-bold">Today</span>
                  <span className="text-[11px] text-muted-c">{getTodayStr()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(getTomorrowStr())}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col gap-0.5 ${
                    selectedDate === getTomorrowStr()
                      ? 'border-emerald-500 bg-emerald-500/10 text-primary-c'
                      : 'border-soft-c bg-input-c text-secondary-c hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs font-bold">Tomorrow</span>
                  <span className="text-[11px] text-muted-c">{getTomorrowStr()}</span>
                </button>
              </div>
            </div>

            {/* Time Slot Selection - STRICTLY 7:00 AM and 12:00 PM */}
            <div>
              <label className="text-xs font-bold text-secondary-c uppercase tracking-wider block mb-2">
                2. Select Available Slot (Exactly 2 slots per day)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Slot 1: 7:00 AM */}
                <button
                  type="button"
                  disabled={slot1Passed}
                  onClick={() => setSelectedSlot('07:00')}
                  className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                    slot1Passed
                      ? 'opacity-40 cursor-not-allowed bg-slate-500/10 border-soft-c'
                      : selectedSlot === '07:00'
                      ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30'
                      : 'border-soft-c bg-input-c hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary-c flex items-center gap-1.5">
                      🌅 7:00 AM
                    </span>
                    {selectedSlot === '07:00' && !slot1Passed && (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-c mt-2">Early Morning Collection</p>
                  {slot1Passed && (
                    <span className="text-[10px] font-bold text-rose-500 mt-1 block">Passed Today</span>
                  )}
                </button>

                {/* Slot 2: 12:00 PM */}
                <button
                  type="button"
                  disabled={slot2Passed}
                  onClick={() => setSelectedSlot('12:00')}
                  className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                    slot2Passed
                      ? 'opacity-40 cursor-not-allowed bg-slate-500/10 border-soft-c'
                      : selectedSlot === '12:00'
                      ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30'
                      : 'border-soft-c bg-input-c hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary-c flex items-center gap-1.5">
                      ☀️ 12:00 PM
                    </span>
                    {selectedSlot === '12:00' && !slot2Passed && (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-c mt-2">Midday Collection</p>
                  {slot2Passed && (
                    <span className="text-[10px] font-bold text-rose-500 mt-1 block">Passed Today</span>
                  )}
                </button>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="text-xs font-semibold text-secondary-c block mb-1">
                Special Instructions (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cardboard box placed near entrance gate"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input-c border border-soft-c text-xs text-primary-c focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Confirm Button */}
            <button
              disabled={actionLoading || (selectedSlot === '07:00' ? slot1Passed : slot2Passed)}
              onClick={handleBook}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
              Confirm Pickup for {selectedSlot === '07:00' ? '7:00 AM' : '12:00 PM'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
