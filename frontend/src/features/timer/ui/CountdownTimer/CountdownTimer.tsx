/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from './CountdownTimer.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faPause, faPlay, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import usePomodoroTimer from '../../hooks/usePomodoroTimer';
import EndSessionPopup from '../EndSessionPopup/EndSessionPopup';
import SettingsPopup from '../SettingsPopup/SettingsPopup';
import HeatMap from '../../../history/ui/HeatMap/HeatMap';
import { CategoryGet, ProjectGet, TaskGet, PomodoroRecordGet } from '@/shared/types';
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { usePomodoros } from "@/shared/context/PomodorosContext";

interface CountdownTimerProps {
  categories: CategoryGet[],
  tasks: TaskGet[],
  projects: ProjectGet[],
  pomodoros: PomodoroRecordGet[],
}

const CountdownTimer = ({ categories, tasks, projects, pomodoros }: CountdownTimerProps) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);

  const [workTime, setWorkTime] = useState(50);
  const [breakTime, setBreakTime] = useState(10);

  const [sessionStartSeconds, setSessionStartSeconds] = useState(0);

  const { addPomodoro } = usePomodoros();

  const date = new Date();
  const day = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  const nameMont = date.toLocaleString('en-US', { month: 'long' });

  const getTimeWithoutSeconds = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const [ctime, setTime] = useState(getTimeWithoutSeconds());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getTimeWithoutSeconds());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const {
    timeLeft,
    isActive,
    start,
    stop,
    reset: resetTimer,
    workedSeconds: sessionWorkedSeconds,
  } = usePomodoroTimer({
    workTime,
    breakTime,
    onModeChange: (breakMode) => {
      document.documentElement.style.backgroundColor = breakMode ? '#4287f5' : '#53ae5e';
    }
  });

  // Calcular el tiempo total trabajado de manera más simple
  const totalWorkedSeconds = sessionStartSeconds + sessionWorkedSeconds;

  // Formatting hours and minutes
  const hours = Math.floor(totalWorkedSeconds / 3600);
  const minutes = Math.floor((totalWorkedSeconds % 3600) / 60);
  const formattedWorkedTime = `${hours}h ${minutes}m`;

  const handleSettingsSave = (newWorkTime: number, newBreakTime: number) => {
    setWorkTime(newWorkTime);
    setBreakTime(newBreakTime);

    if (isActive) {
      stop();
      resetTimer();
      toast.info(`Settings update: ${newWorkTime}m work, ${newBreakTime}m break`);
    } else {
      resetTimer();
      toast.success(`Settings update: ${newWorkTime}m work, ${newBreakTime}m break`);
    }
  };

  const handleReset = () => {
    resetTimer();
    setSessionStartSeconds(0);
  };

  const handleEndSession = async ({ project, goal, task }: any) => {
    if (sessionWorkedSeconds <= 0) {
      toast.error('Work time empty');
      handleReset();
      return;
    }

    const workedMinutes = Math.floor(sessionWorkedSeconds / 60);

    try {
      await addPomodoro({
        minutes: workedMinutes,
        idProject: project.id,
        idTask: Number(task),
        idGoal: goal.id,
      });
      toast.success('Pomodoro saved correctly.');

      setSessionStartSeconds(prev => prev + sessionWorkedSeconds);
      resetTimer();

    } catch (error) {
      console.error('Error making pomodoro:', error);
      toast.error('Error saving pomodoro');
    }

    setIsPopupOpen(false);
  };

  return (
    <>
      <div className={styles.timerBox}>
        <h3 className={styles.dateTitle}>
          {`${day} ${dayOfMonth} of ${nameMont}`} | {ctime}
        </h3>

        <div className={styles.timerDisplay}>
          <span>{String(Math.floor(timeLeft / 60)).padStart(2, '0')}</span>
          <span>:</span>
          <span>{String(timeLeft % 60).padStart(2, '0')}</span>
        </div>

        <div className={styles.timerButtons}>
          <button
            className={`${isActive ? styles.inactiveButton : styles.start}`}
            onClick={start}
            disabled={isActive}
          >
            <FontAwesomeIcon icon={faPlay as unknown as IconProp} />
          </button>
          <button
            className={`${!isActive ? styles.inactiveButton : styles.stop}`}
            onClick={stop}
            disabled={!isActive}
          >
            <FontAwesomeIcon icon={faPause as unknown as IconProp} />
          </button>
          <button className={styles.reset} onClick={handleReset}>
            <FontAwesomeIcon icon={faRotateRight as unknown as IconProp} />
          </button>
        </div>

        <button className={styles.offButton} onClick={() => { stop(); setIsPopupOpen(true); }}>
          END SESSION
        </button>

        <EndSessionPopup
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          onConfirm={handleEndSession}
          projects={projects.map(p => ({
            ...p,
            goals: p.goals?.filter(g => g.id === p.id)
          }))}
          categories={categories}
          tasks={tasks}
        />

        <SettingsPopup
          isOpen={isSettingsPopupOpen}
          onClose={() => setIsSettingsPopupOpen(false)}
          onSave={handleSettingsSave}
          currentWorkTime={workTime}
          currentBreakTime={breakTime}
        />
      </div>

      <button className={styles.settingsButton} onClick={() => setIsSettingsPopupOpen(true)}>
        <FontAwesomeIcon icon={faGear as unknown as IconProp} />
      </button>

      <h4 className={styles.currentTimeDetails}>
        You've worked for <span>{formattedWorkedTime}</span>
      </h4>

      <HeatMap data={pomodoros} />
    </>
  );
};

export default CountdownTimer;