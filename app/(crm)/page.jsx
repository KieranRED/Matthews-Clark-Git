import LeadFlow from "@/components/LeadFlow/LeadFlow";
import styles from "./page.module.css";

export default function Page() {
  return (
    <main className={styles.stage}>
      <LeadFlow />
    </main>
  );
}
