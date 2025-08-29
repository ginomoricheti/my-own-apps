import { useCallback, useEffect, useRef, useState } from 'react';
import sound from '@/assets/sounds/sound_6.mp3';
import { invoke } from '@tauri-apps/api/core';

type usePomodoroTimerProps = {
  workTime: number;
  breakTime: number;
  onModeChange?: (isBreak: boolean) => void;
};

const usePomodoroTimer = ({ workTime, breakTime, onModeChange }: usePomodoroTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(workTime * 60);
  const [isBreak, setIsBreak] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [workedSeconds, setWorkedSeconds] = useState(0);

  const prevWorkTimeRef = useRef(workTime);
  const prevBreakTimeRef = useRef(breakTime);

  // refs aux
  const isBreakRef = useRef(isBreak);
  const switchingRef = useRef(false);

  useEffect(() => {
    isBreakRef.current = isBreak;
  }, [isBreak]);

  // if settings change and timer off restart timer
  useEffect(() => {
    if (!isActive) {
      if (prevWorkTimeRef.current !== workTime || prevBreakTimeRef.current !== breakTime) {
        setTimeLeft(isBreak ? breakTime * 60 : workTime * 60);
        prevWorkTimeRef.current = workTime;
        prevBreakTimeRef.current = breakTime;
      }
    }
  }, [workTime, breakTime, isBreak, isActive]);

  const switchMode = useCallback(() => {
    const alarm = new Audio(sound);
    alarm.volume = 0.07;
    alarm.play().catch(() => {
      console.log('No se pudo reproducir el sonido');
    });

    setIsBreak(prev => {
      const newIsBreak = !prev;
      onModeChange?.(newIsBreak);
      setTimeLeft(newIsBreak ? breakTime * 60 : workTime * 60);

      switchingRef.current = false;

      return newIsBreak;
    });
  }, [workTime, breakTime, onModeChange]);

  // interval control
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          if (!switchingRef.current) {
            switchingRef.current = true;
            switchMode();
            return isBreakRef.current ? workTime * 60 : breakTime * 60;
          }
          return prev;
        }
        return prev - 1;
      });

      // workedSeconds only in work
      setWorkedSeconds(prev => (!isBreakRef.current ? prev + 1 : prev));
    }, 1000);


    return () => clearInterval(interval);
  }, [isActive, switchMode]);

  const start = useCallback(() => {
    if (!isActive) {
      setIsActive(true);
      document.documentElement.style.backgroundColor = '#53ae5e';
      invoke('prevent_sleep').catch(err => console.error('Error prevent_sleep: ', err))
    }
  }, [isActive]);

  const stop = useCallback(() => {
    setIsActive(false);
    document.documentElement.style.backgroundColor = '#d90f26';
    invoke('allow_sleep').catch(err => console.error('Error allow_sleep: ', err))
  }, []);

  const reset = useCallback(() => {
    stop();
    setIsBreak(false);
    setTimeLeft(workTime * 60);
    setWorkedSeconds(0);
    document.documentElement.style.backgroundColor = '#242424';
  }, [stop, workTime]);

  return {
    timeLeft,
    isBreak,
    isActive,
    start,
    stop,
    reset,
    workedSeconds,
  };
};

export default usePomodoroTimer;
