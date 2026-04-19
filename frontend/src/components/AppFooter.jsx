import clsx from "clsx";

export default function AppFooter({ variant = "default" }) {
  return (
    <footer
      className={clsx("muted", {
        "footer-tight": variant === "compact",
      })}
      style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0", fontSize: "0.85rem" }}
    >
      TaskBoard · FastAPI + React · PromptShield baseline UI
    </footer>
  );
}
