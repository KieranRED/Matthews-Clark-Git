import LeadFlow from "@/components/LeadFlow/LeadFlow";
import Pixels from "@/components/Pixels/Pixels";
import styles from "./page.module.css";

export default function Page() {
  return (
    <main className={styles.stage}>
      <LeadFlow />
      <Pixels />
    </main>
  );
}
