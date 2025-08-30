import { useProjects } from "@/shared/context/ProjectsContext";
import styles from './Card.module.css';

type CardProps = {
  projectId: number;
};

const Card = ({ projectId }: CardProps) => {
  const { projects } = useProjects();

  const data = projects.find(p => p.id === projectId);
  if (!data) return null;

  const hours = Math.floor(data.totalTimeMinutes / 60);

  const currentGoal = data.goals?.find(goal => !goal.isCompleted);

  let goalInfo = null;
  if (currentGoal) {
    const remainingMinutes = Math.max(currentGoal.targetMinutes - currentGoal.completedMinutes, 0);
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingMins = remainingMinutes % 60;

    goalInfo = (
      <>
        <p>
          <span>Actual Goal:</span> {currentGoal.title}
        </p>
        <p>
          <span>Remaining:</span> {remainingHours}h {remainingMins}m
        </p>
      </>
    );
  } else {
    goalInfo =
      <>
        <p><span>Actual Goal:</span> No available goals</p>
      </>
  }

  return (
    <div className={styles.cardBox}>
      <p className={styles.time}><span>{hours}h</span></p>
      <h3>{data.name}</h3>
      <div className={styles.details}>
        {goalInfo}
      </div>
    </div>
  );
};

export default Card;
